import type { PoolClient } from "pg";
import { db } from "../config/db";
import { normalizePhone } from "../utils/normalizePhone";
import {
  ensureCanAddDriver,
  ensureCanAddTruck
} from "./subscription.service";
import { listTrailers } from "./trailer.service";
import { listDrivers } from "./driver.service";

const ACTIVE_TRIP_STATUSES = [
  "ASSIGNED",
  "STARTED",
  "ON_ROUTE",
  "DELAYED",
  "BREAKDOWN",
  "ARRIVED"
];

const TRUCK_STATUSES = [
  "AVAILABLE",
  "UNDER_MAINTENANCE",
  "ACCIDENTED",
  "INACTIVE"
];

const TRAILER_STATUSES = [
  "AVAILABLE",
  "UNDER_MAINTENANCE",
  "INACTIVE"
];

export interface TruckData {
  plate_number?: string;
  truck_type?: string;
  capacity?: string;
  status?: string;
}

export interface TrailerData {
  trailer_number?: string;
  trailer_type?: string;
  trailer_model?: string;
  status?: string;
}

export interface DriverData {
  full_name?: string;
  phone_number?: string;
  passport_number?: string;
  license_number?: string;
  license_expiry_date?: string;
  chemical_certificate_number?: string;
  chemical_certificate_expiry_date?: string;
  joining_date?: string;
  leaving_date?: string;
}

export type LinkAction =
  | "keep"
  | "unlink"
  | "link_existing"
  | "create_new";

export interface TrailerInstruction {
  action: LinkAction;
  id?: string;
  data?: TrailerData;
}

export interface DriverInstruction {
  action: LinkAction;
  id?: string;
  data?: DriverData;
}

const text = (value?: string | null) => value?.trim() || null;

function assertDateOrder(joining?: string, leaving?: string) {
  if (joining && leaving && leaving < joining) {
    throw new Error("Leaving date cannot be before the joining date.");
  }
}

function translateDbError(error: unknown): Error {
  const err = error as { code?: string; constraint?: string };

  if (err?.code === "23505") {
    const constraint = err.constraint || "";

    if (constraint.includes("plate")) {
      return new Error("Another truck already uses this plate number.");
    }

    if (constraint.includes("trailer")) {
      return new Error("Another trailer already uses this trailer number.");
    }

    if (constraint.includes("phone")) {
      return new Error("Another driver already uses this phone number.");
    }

    return new Error(
      "A truck, trailer or driver with these details already exists."
    );
  }

  return error instanceof Error
    ? error
    : new Error("Fleet unit operation failed.");
}

// ------------------------------------------------------------
// LIST
// ------------------------------------------------------------

export async function listFleetUnits(tenantId: string) {
  const unitsResult = await db.query(
    `
    SELECT
      tr.id,
      tr.plate_number,
      tr.truck_type,
      tr.capacity,
      tr.status,
      tr.created_at,
      tr.assigned_trailer_id,
      tr.assigned_driver_id,

      truck_trip.id AS active_trip_id,
      truck_trip.public_trip_code AS active_trip_code,

      tl.trailer_number,
      tl.trailer_type,
      tl.trailer_model,
      tl.status AS trailer_status,
      trailer_trip.public_trip_code AS trailer_active_trip_code,

      d.full_name AS driver_name,
      d.phone_number AS driver_phone,
      d.passport_number AS driver_passport_number,
      d.license_number AS driver_license_number,
      d.license_expiry_date AS driver_license_expiry_date,
      d.chemical_certificate_number AS driver_chemical_certificate_number,
      d.chemical_certificate_expiry_date AS driver_chemical_certificate_expiry_date,
      d.is_active AS driver_is_active,
      d.joining_date AS driver_joining_date,
      d.leaving_date AS driver_leaving_date,
      driver_trip.public_trip_code AS driver_active_trip_code

    FROM trucks tr

    LEFT JOIN trailers tl
      ON tl.id = tr.assigned_trailer_id
     AND tl.tenant_id = tr.tenant_id

    LEFT JOIN drivers d
      ON d.id = tr.assigned_driver_id
     AND d.tenant_id = tr.tenant_id

    LEFT JOIN LATERAL (
      SELECT t.id, t.public_trip_code
      FROM trips t
      WHERE t.truck_id = tr.id
        AND t.tenant_id = tr.tenant_id
        AND t.status = ANY($2)
      ORDER BY t.created_at DESC
      LIMIT 1
    ) truck_trip ON true

    LEFT JOIN LATERAL (
      SELECT t.public_trip_code
      FROM trips t
      WHERE t.trailer_id = tl.id
        AND t.tenant_id = tr.tenant_id
        AND t.status = ANY($2)
      ORDER BY t.created_at DESC
      LIMIT 1
    ) trailer_trip ON true

    LEFT JOIN LATERAL (
      SELECT t.public_trip_code
      FROM trips t
      WHERE t.driver_id = d.id
        AND t.tenant_id = tr.tenant_id
        AND t.status = ANY($2)
      ORDER BY t.created_at DESC
      LIMIT 1
    ) driver_trip ON true

    WHERE tr.tenant_id = $1
    ORDER BY tr.created_at DESC
    `,
    [tenantId, ACTIVE_TRIP_STATUSES]
  );

  const units = unitsResult.rows;

  const linkedTrailerIds = new Set(
    units.map((u) => u.assigned_trailer_id).filter(Boolean)
  );
  const linkedDriverIds = new Set(
    units.map((u) => u.assigned_driver_id).filter(Boolean)
  );

  const [allTrailers, allDrivers] = await Promise.all([
    listTrailers(tenantId),
    listDrivers(tenantId)
  ]);

  return {
    units,
    unlinked_trailers: allTrailers.filter(
      (t) => !linkedTrailerIds.has(t.id)
    ),
    unlinked_drivers: allDrivers
      .filter((d) => !linkedDriverIds.has(d.id))
      .map((d) => {
        // Never ship certificate image data in this list.
        const {
          chemical_certificate_image,
          license_image,
          passport_image,
          ...rest
        } = d;
        void chemical_certificate_image;
        void license_image;
        void passport_image;
        return rest;
      })
  };
}

// ------------------------------------------------------------
// SHARED HELPERS
// ------------------------------------------------------------

async function assertTrailerFree(
  client: PoolClient,
  tenantId: string,
  trailerId: string,
  currentTruckId: string | null
) {
  const result = await client.query(
    `
    SELECT
      tl.id,
      other.plate_number AS other_plate
    FROM trailers tl
    LEFT JOIN trucks other
      ON other.assigned_trailer_id = tl.id
     AND other.tenant_id = tl.tenant_id
     AND ($3::uuid IS NULL OR other.id <> $3::uuid)
    WHERE tl.id = $1::uuid
      AND tl.tenant_id = $2::uuid
    LIMIT 1
    `,
    [trailerId, tenantId, currentTruckId]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Selected trailer was not found.");
  }

  if (row.other_plate) {
    throw new Error(
      `That trailer is already linked to truck ${row.other_plate}. Unlink it there first.`
    );
  }
}

async function assertDriverFree(
  client: PoolClient,
  tenantId: string,
  driverId: string,
  currentTruckId: string | null
) {
  const result = await client.query(
    `
    SELECT
      d.id,
      other.plate_number AS other_plate
    FROM drivers d
    LEFT JOIN trucks other
      ON other.assigned_driver_id = d.id
     AND other.tenant_id = d.tenant_id
     AND ($3::uuid IS NULL OR other.id <> $3::uuid)
    WHERE d.id = $1::uuid
      AND d.tenant_id = $2::uuid
    LIMIT 1
    `,
    [driverId, tenantId, currentTruckId]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Selected driver was not found.");
  }

  if (row.other_plate) {
    throw new Error(
      `That driver is already linked to truck ${row.other_plate}. Unlink them there first.`
    );
  }
}

async function insertTrailer(
  client: PoolClient,
  tenantId: string,
  data: TrailerData
): Promise<string> {
  const number = text(data.trailer_number);

  if (!number || number.length < 2) {
    throw new Error("A trailer number is required for a new trailer.");
  }

  const status = data.status || "AVAILABLE";

  if (!TRAILER_STATUSES.includes(status)) {
    throw new Error("Invalid trailer status.");
  }

  const result = await client.query(
    `
    INSERT INTO trailers (
      tenant_id, trailer_number, trailer_type, trailer_model, status
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [
      tenantId,
      number,
      text(data.trailer_type),
      text(data.trailer_model),
      status
    ]
  );

  return result.rows[0].id;
}

async function insertDriver(
  client: PoolClient,
  tenantId: string,
  data: DriverData
): Promise<string> {
  const name = text(data.full_name);
  const phone = text(data.phone_number);

  if (!name || name.length < 2) {
    throw new Error("A driver name is required for a new driver.");
  }

  if (!phone || phone.length < 5) {
    throw new Error("A valid driver phone number is required.");
  }

  assertDateOrder(data.joining_date, data.leaving_date);

  const result = await client.query(
    `
    INSERT INTO drivers (
      tenant_id,
      full_name,
      phone_number,
      passport_number,
      license_number,
      license_expiry_date,
      chemical_certificate_number,
      chemical_certificate_expiry_date,
      joining_date,
      leaving_date,
      is_active
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10::date,
      ($10::date IS NULL OR $10::date > (NOW() AT TIME ZONE 'Africa/Dar_es_Salaam')::date)
    )
    RETURNING id
    `,
    [
      tenantId,
      name,
      normalizePhone(phone),
      text(data.passport_number),
      text(data.license_number),
      data.license_expiry_date || null,
      text(data.chemical_certificate_number),
      data.chemical_certificate_expiry_date || null,
      data.joining_date || null,
      data.leaving_date || null
    ]
  );

  return result.rows[0].id;
}

async function updateTrailerFields(
  client: PoolClient,
  tenantId: string,
  trailerId: string,
  data: TrailerData
) {
  const number =
    data.trailer_number !== undefined
      ? data.trailer_number.trim()
      : null;

  if (number !== null && number.length < 2) {
    throw new Error("A valid trailer number is required.");
  }

  await client.query(
    `
    UPDATE trailers
    SET
      trailer_number = COALESCE($3, trailer_number),
      trailer_type = CASE WHEN $4::boolean THEN $5 ELSE trailer_type END,
      trailer_model = CASE WHEN $6::boolean THEN $7 ELSE trailer_model END,
      updated_at = NOW()
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
    `,
    [
      trailerId,
      tenantId,
      number,
      data.trailer_type !== undefined,
      text(data.trailer_type),
      data.trailer_model !== undefined,
      text(data.trailer_model)
    ]
  );
}

async function updateDriverFields(
  client: PoolClient,
  tenantId: string,
  driverId: string,
  data: DriverData
) {
  const name =
    data.full_name !== undefined ? data.full_name.trim() : null;

  if (name !== null && name.length < 2) {
    throw new Error("A valid driver name is required.");
  }

  const phone =
    data.phone_number !== undefined
      ? normalizePhone(data.phone_number)
      : null;

  const has = (value: unknown) => value !== undefined;

  assertDateOrder(data.joining_date, data.leaving_date);

  await client.query(
    `
    UPDATE drivers
    SET
      full_name = COALESCE($3, full_name),
      phone_number = COALESCE($4, phone_number),
      passport_number = CASE WHEN $5::boolean THEN $6 ELSE passport_number END,
      license_number = CASE WHEN $7::boolean THEN $8 ELSE license_number END,
      license_expiry_date = CASE WHEN $9::boolean THEN $10::date ELSE license_expiry_date END,
      chemical_certificate_number = CASE WHEN $11::boolean THEN $12 ELSE chemical_certificate_number END,
      chemical_certificate_expiry_date = CASE WHEN $13::boolean THEN $14::date ELSE chemical_certificate_expiry_date END,
      joining_date = CASE WHEN $15::boolean THEN $16::date ELSE joining_date END,
      leaving_date = CASE WHEN $17::boolean THEN $18::date ELSE leaving_date END,
      is_active = CASE
        WHEN $17::boolean THEN (
          $18::date IS NULL
          OR $18::date > (NOW() AT TIME ZONE 'Africa/Dar_es_Salaam')::date
        )
        ELSE is_active
      END,
      updated_at = NOW()
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
    `,
    [
      driverId,
      tenantId,
      name,
      phone,
      has(data.passport_number),
      text(data.passport_number),
      has(data.license_number),
      text(data.license_number),
      has(data.license_expiry_date),
      data.license_expiry_date || null,
      has(data.chemical_certificate_number),
      text(data.chemical_certificate_number),
      has(data.chemical_certificate_expiry_date),
      data.chemical_certificate_expiry_date || null,
      has(data.joining_date),
      data.joining_date || null,
      has(data.leaving_date),
      data.leaving_date || null
    ]
  );
}

// ------------------------------------------------------------
// CREATE  (truck + trailer + driver in one transaction)
// ------------------------------------------------------------

export async function createFleetUnit(
  tenantId: string,
  input: {
    truck: TruckData;
    trailer?: TrailerInstruction;
    driver?: DriverInstruction;
  }
) {
  const plate = input.truck.plate_number?.trim().toUpperCase();

  if (!plate || plate.length < 2) {
    throw new Error("A valid truck plate number is required.");
  }

  const truckStatus = input.truck.status || "AVAILABLE";

  if (!TRUCK_STATUSES.includes(truckStatus)) {
    throw new Error("Invalid truck status.");
  }

  const trailerAction = input.trailer?.action ?? "unlink";
  const driverAction = input.driver?.action ?? "unlink";

  // Preserve the subscription limits that the separate pages enforced.
  await ensureCanAddTruck(tenantId);

  if (driverAction === "create_new") {
    await ensureCanAddDriver(tenantId);
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    let trailerId: string | null = null;
    let driverId: string | null = null;

    if (trailerAction === "create_new") {
      trailerId = await insertTrailer(
        client,
        tenantId,
        input.trailer?.data ?? {}
      );
    } else if (trailerAction === "link_existing") {
      if (!input.trailer?.id) {
        throw new Error("Select a trailer to link.");
      }

      await assertTrailerFree(client, tenantId, input.trailer.id, null);
      trailerId = input.trailer.id;
    }

    if (driverAction === "create_new") {
      driverId = await insertDriver(
        client,
        tenantId,
        input.driver?.data ?? {}
      );
    } else if (driverAction === "link_existing") {
      if (!input.driver?.id) {
        throw new Error("Select a driver to link.");
      }

      await assertDriverFree(client, tenantId, input.driver.id, null);
      driverId = input.driver.id;
    }

    const truckResult = await client.query(
      `
      INSERT INTO trucks (
        tenant_id,
        plate_number,
        truck_type,
        capacity,
        status,
        assigned_trailer_id,
        assigned_driver_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [
        tenantId,
        plate,
        text(input.truck.truck_type),
        text(input.truck.capacity),
        truckStatus,
        trailerId,
        driverId
      ]
    );

    await client.query("COMMIT");

    return { id: truckResult.rows[0].id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw translateDbError(error);
  } finally {
    client.release();
  }
}

// ------------------------------------------------------------
// UPDATE  (any part of an existing unit, atomically)
// ------------------------------------------------------------

export async function updateFleetUnit(
  tenantId: string,
  truckId: string,
  input: {
    truck?: TruckData;
    trailer?: TrailerInstruction;
    driver?: DriverInstruction;
  }
) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const current = await client.query(
      `
      SELECT id, assigned_trailer_id, assigned_driver_id
      FROM trucks
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      FOR UPDATE
      `,
      [truckId, tenantId]
    );

    const truck = current.rows[0];

    if (!truck) {
      throw new Error("Truck not found.");
    }

    let trailerId: string | null = truck.assigned_trailer_id;
    let driverId: string | null = truck.assigned_driver_id;

    // ---- truck fields
    if (input.truck) {
      const plate =
        input.truck.plate_number !== undefined
          ? input.truck.plate_number.trim().toUpperCase()
          : null;

      if (plate !== null && plate.length < 2) {
        throw new Error("A valid truck plate number is required.");
      }

      await client.query(
        `
        UPDATE trucks
        SET
          plate_number = COALESCE($3, plate_number),
          truck_type = CASE WHEN $4::boolean THEN $5 ELSE truck_type END,
          capacity = CASE WHEN $6::boolean THEN $7 ELSE capacity END,
          updated_at = NOW()
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
        `,
        [
          truckId,
          tenantId,
          plate,
          input.truck.truck_type !== undefined,
          text(input.truck.truck_type),
          input.truck.capacity !== undefined,
          text(input.truck.capacity)
        ]
      );
    }

    // ---- trailer
    const trailerInstruction = input.trailer;

    if (trailerInstruction) {
      switch (trailerInstruction.action) {
        case "keep":
          if (trailerId && trailerInstruction.data) {
            await updateTrailerFields(
              client,
              tenantId,
              trailerId,
              trailerInstruction.data
            );
          }
          break;

        case "unlink":
          trailerId = null;
          break;

        case "link_existing":
          if (!trailerInstruction.id) {
            throw new Error("Select a trailer to link.");
          }

          await assertTrailerFree(
            client,
            tenantId,
            trailerInstruction.id,
            truckId
          );
          trailerId = trailerInstruction.id;
          break;

        case "create_new":
          trailerId = await insertTrailer(
            client,
            tenantId,
            trailerInstruction.data ?? {}
          );
          break;
      }
    }

    // ---- driver
    const driverInstruction = input.driver;

    if (driverInstruction) {
      switch (driverInstruction.action) {
        case "keep":
          if (driverId && driverInstruction.data) {
            await updateDriverFields(
              client,
              tenantId,
              driverId,
              driverInstruction.data
            );
          }
          break;

        case "unlink":
          driverId = null;
          break;

        case "link_existing":
          if (!driverInstruction.id) {
            throw new Error("Select a driver to link.");
          }

          await assertDriverFree(
            client,
            tenantId,
            driverInstruction.id,
            truckId
          );
          driverId = driverInstruction.id;
          break;

        case "create_new":
          await ensureCanAddDriver(tenantId);
          driverId = await insertDriver(
            client,
            tenantId,
            driverInstruction.data ?? {}
          );
          break;
      }
    }

    await client.query(
      `
      UPDATE trucks
      SET
        assigned_trailer_id = $3::uuid,
        assigned_driver_id = $4::uuid,
        updated_at = NOW()
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      `,
      [truckId, tenantId, trailerId, driverId]
    );

    await client.query("COMMIT");

    return { id: truckId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw translateDbError(error);
  } finally {
    client.release();
  }
}
