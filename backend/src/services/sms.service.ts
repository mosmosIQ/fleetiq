import { db } from "../config/db";
import { env } from "../config/env";
import { canSendMessage, incrementMessageUsage } from "./messageUsage.service";
import { normalizePhone } from "../utils/normalizePhone";
import { parseSmsReply } from "../utils/parseSmsReply";
import {
  formatNextOptions,
  getNextStatus,
  TripStatus
} from "../utils/statusTransitions";

function mapTripStatusToTruckStatus(status: string) {
  if (status === "STARTED") return "ON_TRIP";
  if (status === "ON_ROUTE") return "ON_ROUTE";
  if (status === "DELAYED") return "DELAYED";
  if (status === "BREAKDOWN") return "BREAKDOWN";
  if (status === "ARRIVED") return "ARRIVED";

  return status;
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export async function sendSms(
  tenantId: string,
  phoneNumber: string,
  message: string
) {
  const allowed = await canSendMessage(tenantId, "sms");

  if (!allowed) {
    throw new Error("SMS limit reached. Top-up required.");
  }

  console.log("Sending SMS through Beem placeholder:", {
    to: phoneNumber,
    message,
    source: env.BEEM_SOURCE_ADDRESS
  });

  await db.query(
    `
    INSERT INTO sms_messages (
      tenant_id,
      direction,
      phone_number,
      message_text,
      provider,
      status
    )
    VALUES ($1::uuid, 'OUTBOUND', $2::varchar, $3::text, 'BEEM', 'SENT')
    `,
    [tenantId, phoneNumber, message]
  );

  await incrementMessageUsage(tenantId, "sms");

  return { sent: true };
}

export async function handleInboundSms(input: {
  from: string;
  text: string;
  providerMessageId?: string;
}) {
  const phone = normalizePhone(input.from);
  const parsed = parseSmsReply(input.text);

  if (!parsed) {
    await db.query(
      `
      INSERT INTO sms_messages (
        direction,
        phone_number,
        message_text,
        provider_message_id,
        provider,
        status
      )
      VALUES ('INBOUND', $1::varchar, $2::text, $3::varchar, 'BEEM', 'INVALID_FORMAT')
      `,
      [phone, input.text, input.providerMessageId || null]
    );

    return {
      accepted: false,
      message: "Invalid SMS format. Use TRIPCODE OPTION, e.g. MSH-0008 1."
    };
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const tripResult = await client.query(
      `
      SELECT
        t.id AS trip_id,
        t.tenant_id,
        t.public_trip_code,
        t.status,
        t.truck_id,
        t.driver_id,
        tr.status AS truck_status,
        d.full_name AS driver_name,
        d.phone_number
      FROM trips t
      JOIN drivers d
        ON d.id = t.driver_id
       AND d.tenant_id = t.tenant_id
      JOIN trucks tr
        ON tr.id = t.truck_id
       AND tr.tenant_id = t.tenant_id
      WHERE t.public_trip_code = $1::varchar
        AND d.phone_number = $2::varchar
        AND t.status <> 'COMPLETED'
      LIMIT 1
      `,
      [parsed.publicTripCode, phone]
    );

    const trip = tripResult.rows[0];

    if (!trip) {
      await client.query(
        `
        INSERT INTO sms_messages (
          direction,
          phone_number,
          message_text,
          provider_message_id,
          provider,
          status
        )
        VALUES ('INBOUND', $1::varchar, $2::text, $3::varchar, 'BEEM', 'REJECTED')
        `,
        [phone, input.text, input.providerMessageId || null]
      );

      await client.query("COMMIT");

      return {
        accepted: false,
        message:
          "Trip not found, driver not assigned, or trip already completed."
      };
    }

    const nextStatus = getNextStatus(
      trip.status as TripStatus,
      parsed.option
    );

    if (!nextStatus) {
      await client.query(
        `
        INSERT INTO sms_messages (
          tenant_id,
          trip_id,
          driver_id,
          direction,
          phone_number,
          message_text,
          provider_message_id,
          provider,
          status
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          'INBOUND',
          $4::varchar,
          $5::text,
          $6::varchar,
          'BEEM',
          'INVALID_OPTION'
        )
        `,
        [
          trip.tenant_id,
          trip.trip_id,
          trip.driver_id,
          phone,
          input.text,
          input.providerMessageId || null
        ]
      );

      await client.query("COMMIT");

      const options = formatNextOptions(
        trip.public_trip_code,
        trip.status as TripStatus
      );

      return {
        accepted: false,
        message: `Option not valid for current trip status. Next options:\n${options}`
      };
    }

    const oldTripStatus = trip.status;
    const newTruckStatus = mapTripStatusToTruckStatus(nextStatus);

    await client.query(
      `
      UPDATE trips
      SET status = $1::varchar,
          updated_at = NOW(),
          started_at = CASE WHEN $1::varchar = 'STARTED' THEN NOW() ELSE started_at END,
          on_route_at = CASE WHEN $1::varchar = 'ON_ROUTE' THEN NOW() ELSE on_route_at END,
          arrived_at = CASE WHEN $1::varchar = 'ARRIVED' THEN NOW() ELSE arrived_at END
      WHERE id = $2::uuid
        AND tenant_id = $3::uuid
      `,
      [nextStatus, trip.trip_id, trip.tenant_id]
    );

    await client.query(
      `
      UPDATE trucks
      SET status = $1::varchar,
          updated_at = NOW()
      WHERE id = $2::uuid
        AND tenant_id = $3::uuid
      `,
      [newTruckStatus, trip.truck_id, trip.tenant_id]
    );

    await client.query(
      `
      INSERT INTO sms_messages (
        tenant_id,
        trip_id,
        driver_id,
        direction,
        phone_number,
        message_text,
        provider_message_id,
        provider,
        status
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        'INBOUND',
        $4::varchar,
        $5::text,
        $6::varchar,
        'BEEM',
        'RECEIVED'
      )
      `,
      [
        trip.tenant_id,
        trip.trip_id,
        trip.driver_id,
        phone,
        input.text,
        input.providerMessageId || null
      ]
    );

    await client.query(
      `
      INSERT INTO trip_updates (
        tenant_id,
        trip_id,
        truck_id,
        driver_id,
        status,
        source,
        raw_message
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::uuid,
        $5::varchar,
        'SMS',
        $6::text
      )
      `,
      [
        trip.tenant_id,
        trip.trip_id,
        trip.truck_id,
        trip.driver_id,
        nextStatus,
        input.text
      ]
    );

    await client.query(
      `
      INSERT INTO status_logs (
        tenant_id,
        trip_id,
        truck_id,
        old_status,
        new_status,
        source
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::varchar,
        $5::varchar,
        'SMS'
      )
      `,
      [
        trip.tenant_id,
        trip.trip_id,
        trip.truck_id,
        oldTripStatus,
        nextStatus
      ]
    );

    if (nextStatus === "DELAYED" || nextStatus === "BREAKDOWN") {
      await client.query(
        `
        INSERT INTO notifications (
          tenant_id,
          title,
          message,
          type
        )
        VALUES ($1::uuid, $2::varchar, $3::text, $4::varchar)
        `,
        [
          trip.tenant_id,
          nextStatus === "DELAYED"
            ? "Driver reported delay"
            : "Driver reported breakdown",
          `Driver ${trip.driver_name} updated trip ${
            trip.public_trip_code
          } to ${formatStatusLabel(nextStatus)} by SMS.`,
          nextStatus
        ]
      );
    }

    await client.query("COMMIT");

    const options = formatNextOptions(
      trip.public_trip_code,
      nextStatus
    );

    const confirmation = options
      ? `${trip.public_trip_code} marked as ${formatStatusLabel(
          nextStatus
        )}.\n\nNext reply:\n${options}`
      : `${trip.public_trip_code} marked as ${formatStatusLabel(nextStatus)}.`;

    try {
      await sendSms(trip.tenant_id, phone, confirmation);
    } catch (smsError) {
      console.error("SMS update saved, but confirmation SMS failed:", smsError);

      await db.query(
        `
        INSERT INTO notifications (
          tenant_id,
          title,
          message,
          type
        )
        VALUES ($1::uuid, $2::varchar, $3::text, 'SMS_CONFIRMATION_FAILED')
        `,
        [
          trip.tenant_id,
          "SMS confirmation failed",
          `Trip ${trip.public_trip_code} was updated to ${nextStatus}, but confirmation SMS could not be sent.`
        ]
      );
    }

    return {
      accepted: true,
      trip_code: trip.public_trip_code,
      old_status: oldTripStatus,
      new_status: nextStatus,
      truck_status: newTruckStatus,
      source: "SMS"
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}