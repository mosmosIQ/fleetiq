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

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
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

      tl.trailer_number,
      tl.trailer_type,
      tl.status AS trailer_status,

      b.batch_number,
      b.direction AS batch_direction,
      b.loading_point,
      b.truck_handover_date,
      b.loading_date,
      b.tons,
      b.release_date,

      latest_update.source AS last_update_source,
      latest_update.created_at AS last_update_at

    FROM trips t

    JOIN trucks tr
      ON tr.id = t.truck_id
     AND tr.tenant_id = t.tenant_id

    JOIN drivers d
      ON d.id = t.driver_id
     AND d.tenant_id = t.tenant_id

    LEFT JOIN trailers tl
      ON tl.id = t.trailer_id
     AND tl.tenant_id = t.tenant_id

    LEFT JOIN trip_batches b
      ON b.id = t.batch_id
     AND b.tenant_id = t.tenant_id

    LEFT JOIN LATERAL (
      SELECT
        tu.source,
        tu.created_at
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
    trailer_id?: string;
    batch_id?: string;
    route_from: string;
    route_to: string;
    destination_country: "DRC" | "ZAMBIA";
    cargo_description?: string;
    planned_start_at?: string;
    expected_arrival_at?: string;
  }
) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------------------
    // 1. CHECK TRUCK
    // --------------------------------------------------

    const truckResult = await client.query(
      `
      SELECT
        id,
        plate_number,
        status
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
      throw new Error(
        "Only available trucks can be assigned to a new trip"
      );
    }

    // --------------------------------------------------
    // 2. CHECK DRIVER
    // --------------------------------------------------

    const driverResult = await client.query(
      `
      SELECT
        id,
        full_name,
        phone_number,
        is_active
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
      throw new Error(
        "Only active drivers can be assigned to a trip"
      );
    }

    // --------------------------------------------------
    // 3. CHECK DRIVER DOES NOT HAVE AN ACTIVE TRIP
    // --------------------------------------------------

    const activeDriverTripResult = await client.query(
      `
      SELECT
        id,
        public_trip_code,
        status
      FROM trips
      WHERE tenant_id = $1::uuid
        AND driver_id = $2::uuid
        AND status = ANY($3::varchar[])
      LIMIT 1
      `,
      [
        tenantId,
        input.driver_id,
        ACTIVE_TRIP_STATUSES
      ]
    );

    const activeDriverTrip =
      activeDriverTripResult.rows[0];

    if (activeDriverTrip) {
      throw new Error(
        `Driver is already assigned to active trip ${activeDriverTrip.public_trip_code}`
      );
    }

    // --------------------------------------------------
    // 4. CHECK TRAILER
    // --------------------------------------------------

    if (input.trailer_id) {
      const trailerResult = await client.query(
        `
        SELECT
          id,
          trailer_number,
          status
        FROM trailers
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
        LIMIT 1
        `,
        [
          input.trailer_id,
          tenantId
        ]
      );

      const trailer = trailerResult.rows[0];

      if (!trailer) {
        throw new Error("Trailer not found");
      }

      if (trailer.status !== "AVAILABLE") {
        throw new Error(
          "Only available trailers can be assigned to a new trip"
        );
      }
    }

    // --------------------------------------------------
    // 5. CHECK BATCH
    // --------------------------------------------------

    if (input.batch_id) {
      const batchResult = await client.query(
        `
        SELECT
          id,
          batch_number,
          direction
        FROM trip_batches
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
        LIMIT 1
        `,
        [
          input.batch_id,
          tenantId
        ]
      );

      const batch = batchResult.rows[0];

      if (!batch) {
        throw new Error("Batch not found");
      }

      // A batch should only belong to one trip.
      const existingBatchTripResult =
        await client.query(
          `
          SELECT
            id,
            public_trip_code
          FROM trips
          WHERE batch_id = $1::uuid
            AND tenant_id = $2::uuid
          LIMIT 1
          `,
          [
            input.batch_id,
            tenantId
          ]
        );

      const existingBatchTrip =
        existingBatchTripResult.rows[0];

      if (existingBatchTrip) {
        throw new Error(
          `Batch ${batch.batch_number} is already assigned to trip ${existingBatchTrip.public_trip_code}`
        );
      }
    }

    // --------------------------------------------------
    // 6. GENERATE TRIP NUMBER / CODE
    // --------------------------------------------------

    const code = await generateNextTripCode(
      tenantId
    );

    // --------------------------------------------------
    // 7. CREATE TRIP
    // --------------------------------------------------

    const tripResult = await client.query(
      `
      INSERT INTO trips (
        tenant_id,
        trip_number,
        public_trip_code,
        truck_id,
        driver_id,
        trailer_id,
        batch_id,
        route_from,
        route_to,
        destination_country,
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
        $6::uuid,
        $7::uuid,
        $8::varchar,
        $9::varchar,
        $10::varchar,
        $11::text,
        $12::timestamptz,
        $13::timestamptz,
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
        input.trailer_id || null,
        input.batch_id || null,
        input.route_from,
        input.route_to,
        input.destination_country,
        input.cargo_description || null,
        input.planned_start_at || null,
        input.expected_arrival_at || null
      ]
    );

    const trip = tripResult.rows[0];

    // --------------------------------------------------
    // 8. ASSIGN TRUCK
    // --------------------------------------------------

    await client.query(
      `
      UPDATE trucks
      SET
        status = 'ASSIGNED',
        updated_at = NOW()
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      `,
      [
        input.truck_id,
        tenantId
      ]
    );

    // --------------------------------------------------
    // 9. ASSIGN TRAILER
    // --------------------------------------------------

    if (input.trailer_id) {
      await client.query(
        `
        UPDATE trailers
        SET
          status = 'ASSIGNED',
          updated_at = NOW()
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
        `,
        [
          input.trailer_id,
          tenantId
        ]
      );
    }

    // --------------------------------------------------
    // 10. STATUS LOG
    // --------------------------------------------------

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
      [
        tenantId,
        trip.id,
        input.truck_id
      ]
    );

    // --------------------------------------------------
    // 11. TRIP UPDATE
    // --------------------------------------------------

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
      [
        tenantId,
        trip.id,
        input.truck_id,
        input.driver_id
      ]
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

    // --------------------------------------------------
    // 1. GET TRIP
    // --------------------------------------------------

    const tripResult = await client.query(
      `
      SELECT
        id,
        public_trip_code,
        truck_id,
        driver_id,
        status
      FROM trips
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      LIMIT 1
      `,
      [
        tripId,
        tenantId
      ]
    );

    const trip = tripResult.rows[0];

    if (!trip) {
      throw new Error("Trip not found");
    }

    if (trip.status === "COMPLETED") {
      throw new Error(
        "Completed trips cannot be changed"
      );
    }

    // --------------------------------------------------
    // 2. CHECK VALID TRANSITION
    // --------------------------------------------------

    const allowedStatuses =
      getAllowedManualStatuses(
        trip.status
      );

    if (!allowedStatuses.includes(newStatus)) {
      throw new Error(
        `Cannot change trip from ${trip.status} to ${newStatus}`
      );
    }

    if (newStatus === "COMPLETED") {
      throw new Error(
        "Use the Complete Trip action to complete a trip"
      );
    }

    const newTruckStatus =
      mapTripStatusToTruckStatus(
        newStatus
      );

    // --------------------------------------------------
    // 3. UPDATE TRIP
    // --------------------------------------------------

    await client.query(
      `
      UPDATE trips
      SET
        status = $1::varchar,
        updated_at = NOW(),

        started_at =
          CASE
            WHEN $1::varchar = 'STARTED'
            THEN NOW()
            ELSE started_at
          END,

        on_route_at =
          CASE
            WHEN $1::varchar = 'ON_ROUTE'
            THEN NOW()
            ELSE on_route_at
          END,

        arrived_at =
          CASE
            WHEN $1::varchar = 'ARRIVED'
            THEN NOW()
            ELSE arrived_at
          END

      WHERE id = $2::uuid
        AND tenant_id = $3::uuid
      `,
      [
        newStatus,
        tripId,
        tenantId
      ]
    );

    // --------------------------------------------------
    // 4. UPDATE TRUCK
    // --------------------------------------------------

    await client.query(
      `
      UPDATE trucks
      SET
        status = $1::varchar,
        updated_at = NOW()
      WHERE id = $2::uuid
        AND tenant_id = $3::uuid
      `,
      [
        newTruckStatus,
        trip.truck_id,
        tenantId
      ]
    );

    // --------------------------------------------------
    // 5. TRIP UPDATE
    // --------------------------------------------------

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

    // --------------------------------------------------
    // 6. STATUS LOG
    // --------------------------------------------------

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
      [
        tenantId,
        trip.id,
        trip.truck_id,
        trip.status,
        newStatus
      ]
    );

    // --------------------------------------------------
    // 7. NOTIFICATION
    // --------------------------------------------------

    if (
      newStatus === "DELAYED" ||
      newStatus === "BREAKDOWN"
    ) {
      await client.query(
        `
        INSERT INTO notifications (
          tenant_id,
          title,
          message,
          type
        )
        VALUES (
          $1::uuid,
          $2::varchar,
          $3::text,
          $4::varchar
        )
        `,
        [
          tenantId,

          newStatus === "DELAYED"
            ? "Trip marked as delayed"
            : "Trip marked as breakdown",

          `Trip ${trip.public_trip_code} was manually updated to ${formatStatusLabel(newStatus)} by Company Admin.`,

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

export async function completeTrip(
  tenantId: string,
  tripId: string
) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------------------
    // 1. GET TRIP
    // --------------------------------------------------

    const tripResult = await client.query(
      `
      SELECT
        id,
        public_trip_code,
        truck_id,
        driver_id,
        trailer_id,
        status
      FROM trips
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      LIMIT 1
      `,
      [
        tripId,
        tenantId
      ]
    );

    const trip = tripResult.rows[0];

    if (!trip) {
      throw new Error("Trip not found");
    }

    if (trip.status === "COMPLETED") {
      throw new Error(
        "Trip is already completed"
      );
    }

    if (trip.status !== "ARRIVED") {
      throw new Error(
        "Only arrived trips can be completed"
      );
    }

    // --------------------------------------------------
    // 2. COMPLETE TRIP
    // --------------------------------------------------

    await client.query(
      `
      UPDATE trips
      SET
        status = 'COMPLETED',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      `,
      [
        tripId,
        tenantId
      ]
    );

    // --------------------------------------------------
    // 3. RELEASE TRUCK
    // --------------------------------------------------

    await client.query(
      `
      UPDATE trucks
      SET
        status = 'AVAILABLE',
        updated_at = NOW()
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      `,
      [
        trip.truck_id,
        tenantId
      ]
    );

    // --------------------------------------------------
    // 4. RELEASE TRAILER
    // --------------------------------------------------

    if (trip.trailer_id) {
      await client.query(
        `
        UPDATE trailers
        SET
          status = 'AVAILABLE',
          updated_at = NOW()
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
        `,
        [
          trip.trailer_id,
          tenantId
        ]
      );
    }

    // --------------------------------------------------
    // 5. TRIP UPDATE
    // --------------------------------------------------

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
      [
        tenantId,
        trip.id,
        trip.truck_id,
        trip.driver_id
      ]
    );

    // --------------------------------------------------
    // 6. STATUS LOG
    // --------------------------------------------------

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
      [
        tenantId,
        trip.id,
        trip.truck_id,
        trip.status
      ]
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