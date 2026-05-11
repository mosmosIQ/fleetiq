import { db } from "../config/db";
import { formatNextOptions, TripStatus } from "../utils/statusTransitions";
import { sendWhatsApp } from "./whatsapp.service";

const FALLBACK_AFTER_MINUTES = 30;
const NO_REPLY_AFTER_FALLBACK_MINUTES = 45;

const STATUSES_WAITING_FOR_DRIVER_REPLY = [
  "ASSIGNED",
  "STARTED",
  "ON_ROUTE",
  "DELAYED",
  "BREAKDOWN"
];

async function createNotification(input: {
  tenantId: string;
  title: string;
  message: string;
  type: string;
}) {
  await db.query(
    `
    INSERT INTO notifications (
      tenant_id,
      title,
      message,
      type
    )
    VALUES ($1::uuid, $2::varchar, $3::text, $4::varchar)
    `,
    [input.tenantId, input.title, input.message, input.type]
  );
}

export async function processWhatsAppFallbacks(tenantId?: string) {
  const processedFallbacks = await processFallbackMessages(tenantId);
  const processedNoReplyAlerts = await processNoReplyAlerts(tenantId);

  return {
    checked: true,
    fallback_count: processedFallbacks.length,
    no_reply_count: processedNoReplyAlerts.length,
    processed_fallbacks: processedFallbacks,
    processed_no_reply_alerts: processedNoReplyAlerts
  };
}

async function processFallbackMessages(tenantId?: string) {
  const params: any[] = [STATUSES_WAITING_FOR_DRIVER_REPLY];

  let tenantFilter = "";

  if (tenantId) {
    params.push(tenantId);
    tenantFilter = `AND t.tenant_id = $${params.length}::uuid`;
  }

  const result = await db.query(
    `
    SELECT
      t.id AS trip_id,
      t.tenant_id,
      t.public_trip_code,
      t.status,
      t.route_from,
      t.route_to,
      t.truck_id,
      t.driver_id,
      tr.plate_number,
      d.full_name AS driver_name,
      d.phone_number AS driver_phone,
      COALESCE(t.updated_at, t.created_at) AS last_activity_at
    FROM trips t
    JOIN trucks tr
      ON tr.id = t.truck_id
     AND tr.tenant_id = t.tenant_id
    JOIN drivers d
      ON d.id = t.driver_id
     AND d.tenant_id = t.tenant_id
    WHERE t.status = ANY($1::varchar[])
      AND t.whatsapp_fallback_sent_at IS NULL
      AND COALESCE(t.updated_at, t.created_at) <= NOW() - INTERVAL '${FALLBACK_AFTER_MINUTES} minutes'
      ${tenantFilter}
    ORDER BY COALESCE(t.updated_at, t.created_at) ASC
    LIMIT 50
    `,
    params
  );

  const trips = result.rows;
  const processed: any[] = [];

  for (const trip of trips) {
    const options = formatNextOptions(
      trip.public_trip_code,
      trip.status as TripStatus
    );

    if (!options) {
      continue;
    }

    const message = `WhatsApp fallback reminder

Trip: ${trip.public_trip_code}
Truck: ${trip.plate_number}
Route: ${trip.route_from} to ${trip.route_to}

We have not received your SMS reply yet.

Reply by SMS using:
${options}`;

    try {
      await sendWhatsApp(trip.tenant_id, trip.driver_phone, message, {
        tripId: trip.trip_id,
        driverId: trip.driver_id
      });

      await db.query(
        `
        UPDATE trips
        SET whatsapp_fallback_sent_at = NOW(),
            updated_at = NOW()
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
        `,
        [trip.trip_id, trip.tenant_id]
      );

      await createNotification({
        tenantId: trip.tenant_id,
        title: "WhatsApp fallback sent",
        message: `WhatsApp fallback was sent to ${trip.driver_name} for trip ${trip.public_trip_code}.`,
        type: "WHATSAPP_FALLBACK_SENT"
      });

      processed.push({
        trip_code: trip.public_trip_code,
        driver_phone: trip.driver_phone,
        fallback_sent: true
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error(
        `Failed to send WhatsApp fallback for trip ${trip.public_trip_code}:`,
        error
      );

      await createNotification({
        tenantId: trip.tenant_id,
        title: "WhatsApp fallback failed",
        message: `WhatsApp fallback failed for trip ${trip.public_trip_code}. Reason: ${errorMessage}`,
        type: "WHATSAPP_FALLBACK_FAILED"
      });

      processed.push({
        trip_code: trip.public_trip_code,
        driver_phone: trip.driver_phone,
        fallback_sent: false,
        error: errorMessage
      });
    }
  }

  return processed;
}

async function processNoReplyAlerts(tenantId?: string) {
  const params: any[] = [STATUSES_WAITING_FOR_DRIVER_REPLY];

  let tenantFilter = "";

  if (tenantId) {
    params.push(tenantId);
    tenantFilter = `AND t.tenant_id = $${params.length}::uuid`;
  }

  const result = await db.query(
    `
    SELECT
      t.id AS trip_id,
      t.tenant_id,
      t.public_trip_code,
      t.status,
      t.route_from,
      t.route_to,
      t.driver_id,
      tr.plate_number,
      d.full_name AS driver_name,
      d.phone_number AS driver_phone,
      t.whatsapp_fallback_sent_at
    FROM trips t
    JOIN trucks tr
      ON tr.id = t.truck_id
     AND tr.tenant_id = t.tenant_id
    JOIN drivers d
      ON d.id = t.driver_id
     AND d.tenant_id = t.tenant_id
    WHERE t.status = ANY($1::varchar[])
      AND t.whatsapp_fallback_sent_at IS NOT NULL
      AND t.no_reply_alert_sent_at IS NULL
      AND t.whatsapp_fallback_sent_at <= NOW() - INTERVAL '${NO_REPLY_AFTER_FALLBACK_MINUTES} minutes'
      ${tenantFilter}
    ORDER BY t.whatsapp_fallback_sent_at ASC
    LIMIT 50
    `,
    params
  );

  const trips = result.rows;
  const processed: any[] = [];

  for (const trip of trips) {
    await createNotification({
      tenantId: trip.tenant_id,
      title: "No driver reply after fallback",
      message: `No reply received from ${trip.driver_name} for trip ${trip.public_trip_code} even after WhatsApp fallback. Manual follow-up is required.`,
      type: "NO_DRIVER_REPLY"
    });

    await db.query(
      `
      UPDATE trips
      SET no_reply_alert_sent_at = NOW(),
          updated_at = NOW()
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      `,
      [trip.trip_id, trip.tenant_id]
    );

    processed.push({
      trip_code: trip.public_trip_code,
      driver_phone: trip.driver_phone,
      no_reply_alert_sent: true
    });
  }

  return processed;
}