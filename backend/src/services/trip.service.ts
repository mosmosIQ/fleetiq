import { db } from "../config/db";
import { generateNextTripCode } from "./tripCode.service";

const ACTIVE_TRIP_STATUSES = [
  "ASSIGNED",
  "STARTED",
  "ON_ROUTE",
  "DELAYED",
  "BREAKDOWN",
  "ARRIVED"
];

function mapTripStatusToTruckStatus(status: string) {
  if (status === "ASSIGNED") return "ASSIGNED";
  if (status === "STARTED") return "ON_TRIP";
  if (status === "ON_ROUTE") return "ON_ROUTE";
  if (status === "DELAYED") return "DELAYED";
  if (status === "BREAKDOWN") return "BREAKDOWN";
  if (status === "ARRIVED") return "ARRIVED";

  return status;
}

function getAllowedManualStatuses(currentStatus: string) {
  const transitions: Record<string, string[]> = {
    ASSIGNED: ["STARTED", "DELAYED", "BREAKDOWN"],
    STARTED: ["ON_ROUTE", "DELAYED", "BREAKDOWN"],
    ON_ROUTE: ["ARRIVED", "DELAYED", "BREAKDOWN"],
    DELAYED: ["ON_ROUTE", "ARRIVED", "BREAKDOWN"],
    BREAKDOWN: ["ON_ROUTE", "DELAYED"],
    ARRIVED: ["COMPLETED"],
    COMPLETED: []
  };

  return transitions[currentStatus] || [];
}

export async function listTrips(tenantId: string) {
  const result = await db.query(
    `
    SELECT
      t.*,
      tr.plate_number,
      tr.truck_type,
      tr.status AS truck_status,
      d.full_name AS driver_name,
      d.phone_number AS driver_phone,
      latest_update.source AS last_update_source,
      latest_update.created_at AS last_update_at
    FROM trips t
    JOIN trucks tr
      ON tr.id = t.truck_id
     AND tr.tenant_id = t.tenant_id
    JOIN drivers d
      ON d.id = t.driver_id
     AND d.tenant_id = t.tenant_id
    LEFT JOIN LATERAL (
      SELECT tu.source, tu.created_at
      FROM trip_updates tu
      WHERE tu.trip_id = t.id
        AND tu.tenant_id = t.tenant_id
      ORDER BY tu.created_at DESC
      LIMIT 1
    ) latest_update ON true
    WHERE t.tenant_id = $1::uuid
    ORDER BY t.created_at DESC
    `,
    [tenantId]
  );

  return result.rows;
}

export async function createTrip(
  tenantId: string,
  input: {
    truck_id: string;
    driver_id: string;
    route_from: string;
    route_to: string;
    cargo_description?: string;
    planned_start_at?: string;
    expected_arrival_at?: string;
  }
) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const truckResult = await client.query(
      `
      SELECT id, plate_number, status
      FROM trucks
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      LIMIT 1
      `,
      [input.truck_id, tenantId]
    );

    const truck = truckResult.rows[0];

    if (!truck) {
      throw new Error("Truck not found");
    }

    if (truck.status !== "AVAILABLE") {
      throw new Error("Only available trucks can be assigned to a new trip");
    }

    const driverResult = await client.query(
      `
      SELECT id, full_name, phone_number, is_active
      FROM drivers
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      LIMIT 1
      `,
      [input.driver_id, tenantId]
    );

    const driver = driverResult.rows[0];

    if (!driver) {
      throw new Error("Driver not found");
    }

    if (!driver.is_active) {
      throw new Error("Only active drivers can be assigned to a trip");
    }

    const activeDriverTripResult = await client.query(
      `
      SELECT id, public_trip_code, status
      FROM trips
      WHERE tenant_id = $1::uuid
        AND driver_id = $2::uuid
        AND status = ANY($3::varchar[])
      LIMIT 1
      `,
      [tenantId, input.driver_id, ACTIVE_TRIP_STATUSES]
    );

    const activeDriverTrip = activeDriverTripResult.rows[0];

    if (activeDriverTrip) {
      throw new Error(
        `Driver is already assigned to active trip ${activeDriverTrip.public_trip_code}`
      );
    }

    const code = await generateNextTripCode(tenantId);

    const tripResult = await client.query(
      `
      INSERT INTO trips (
        tenant_id,
        trip_number,
        public_trip_code,
        truck_id,
        driver_id,
        route_from,
        route_to,
        cargo_description,
        planned_start_at,
        expected_arrival_at,
        status
      )
      VALUES (
        $1::uuid,
        $2::int,
        $3::varchar,
        $4::uuid,
        $5::uuid,
        $6::varchar,
        $7::varchar,
        $8::text,
        $9::timestamptz,
        $10::timestamptz,
        'ASSIGNED'
      )
      RETURNING *
      `,
      [
        tenantId,
        code.tripNumber,
        code.publicTripCode,
        input.truck_id,
        input.driver_id,
        input.route_from,
        input.route_to,
        input.cargo_description || null,
        input.planned_start_at || null,
        input.expected_arrival_at || null
      ]
    );

    const trip = tripResult.rows[0];

    await client.query(
      `
      UPDATE trucks
      SET status = 'ASSIGNED',
          updated_at = NOW()
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      `,
      [input.truck_id, tenantId]
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
        'AVAILABLE',
        'ASSIGNED',
        'COMPANY_ADMIN'
      )
      `,
      [tenantId, trip.id, input.truck_id]
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
        'ASSIGNED',
        'COMPANY_ADMIN',
        'Trip manually created by Company Admin'
      )
      `,
      [tenantId, trip.id, input.truck_id, input.driver_id]
    );

    await client.query("COMMIT");

    return trip;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateTripStatus(
  tenantId: string,
  tripId: string,
  newStatus: string
) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const tripResult = await client.query(
      `
      SELECT id, public_trip_code, truck_id, driver_id, status
      FROM trips
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      LIMIT 1
      `,
      [tripId, tenantId]
    );

    const trip = tripResult.rows[0];

    if (!trip) {
      throw new Error("Trip not found");
    }

    if (trip.status === "COMPLETED") {
      throw new Error("Completed trips cannot be changed");
    }

    const allowedStatuses = getAllowedManualStatuses(trip.status);

    if (!allowedStatuses.includes(newStatus)) {
      throw new Error(
        `Cannot change trip from ${trip.status} to ${newStatus}`
      );
    }

    if (newStatus === "COMPLETED") {
      throw new Error("Use the Complete Trip action to complete a trip");
    }

    const newTruckStatus = mapTripStatusToTruckStatus(newStatus);

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
      [newStatus, tripId, tenantId]
    );

    await client.query(
      `
      UPDATE trucks
      SET status = $1::varchar,
          updated_at = NOW()
      WHERE id = $2::uuid
        AND tenant_id = $3::uuid
      `,
      [newTruckStatus, trip.truck_id, tenantId]
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
        'COMPANY_ADMIN',
        $6::text
      )
      `,
      [
        tenantId,
        trip.id,
        trip.truck_id,
        trip.driver_id,
        newStatus,
        `Trip manually updated from ${trip.status} to ${newStatus} by Company Admin`
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
        'COMPANY_ADMIN'
      )
      `,
      [tenantId, trip.id, trip.truck_id, trip.status, newStatus]
    );

    if (newStatus === "DELAYED" || newStatus === "BREAKDOWN") {
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
          tenantId,
          newStatus === "DELAYED"
            ? "Trip marked as delayed"
            : "Trip marked as breakdown",
          `Trip ${trip.public_trip_code} was manually updated to ${newStatus.replaceAll("_", " ")} by Company Admin.`,
          newStatus
        ]
      );
    }

    await client.query("COMMIT");

    return {
      message: `Trip ${trip.public_trip_code} updated to ${newStatus}`,
      trip_code: trip.public_trip_code,
      old_status: trip.status,
      new_status: newStatus,
      truck_status: newTruckStatus
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function completeTrip(tenantId: string, tripId: string) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const tripResult = await client.query(
      `
      SELECT id, public_trip_code, truck_id, driver_id, status
      FROM trips
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      LIMIT 1
      `,
      [tripId, tenantId]
    );

    const trip = tripResult.rows[0];

    if (!trip) {
      throw new Error("Trip not found");
    }

    if (trip.status === "COMPLETED") {
      throw new Error("Trip is already completed");
    }

    if (trip.status !== "ARRIVED") {
      throw new Error("Only arrived trips can be completed");
    }

    await client.query(
      `
      UPDATE trips
      SET status = 'COMPLETED',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      `,
      [tripId, tenantId]
    );

    await client.query(
      `
      UPDATE trucks
      SET status = 'AVAILABLE',
          updated_at = NOW()
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      `,
      [trip.truck_id, tenantId]
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
        'COMPLETED',
        'COMPANY_ADMIN',
        'Trip manually completed by Company Admin'
      )
      `,
      [tenantId, trip.id, trip.truck_id, trip.driver_id]
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
        'COMPLETED',
        'COMPANY_ADMIN'
      )
      `,
      [tenantId, trip.id, trip.truck_id, trip.status]
    );

    await client.query("COMMIT");

    return {
      message: `Trip ${trip.public_trip_code} completed successfully`
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}