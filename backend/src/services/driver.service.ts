
import { db } from "../config/db";
import { normalizePhone } from "../utils/normalizePhone";
import { ensureCanAddDriver } from "./subscription.service";

const ACTIVE_TRIP_STATUSES = [
  "ASSIGNED",
  "STARTED",
  "ON_ROUTE",
  "DELAYED",
  "BREAKDOWN",
  "ARRIVED"
];

export async function listDrivers(tenantId: string) {
  const result = await db.query(
    `
    SELECT
      d.*,
      chemical_document.file_url AS chemical_certificate_image,
      active_trip.id AS active_trip_id,
      active_trip.public_trip_code AS active_trip_code,
      CASE
        WHEN active_trip.id IS NULL THEN 'AVAILABLE'
        ELSE 'ON_TRIP'
      END AS availability_status
    FROM drivers d

    LEFT JOIN LATERAL (
      SELECT doc.file_url
      FROM documents doc
      WHERE doc.driver_id = d.id
        AND doc.tenant_id = d.tenant_id
        AND doc.document_type = 'CHEMICAL_CERTIFICATE'
      ORDER BY doc.created_at DESC
      LIMIT 1
    ) chemical_document ON true

    LEFT JOIN LATERAL (
      SELECT t.id, t.public_trip_code
      FROM trips t
      WHERE t.driver_id = d.id
        AND t.tenant_id = d.tenant_id
        AND t.status = ANY($2)
      ORDER BY t.created_at DESC
      LIMIT 1
    ) active_trip ON true

    WHERE d.tenant_id = $1
    ORDER BY d.created_at DESC
    `,
    [tenantId, ACTIVE_TRIP_STATUSES]
  );

  return result.rows;
}

export interface CreateDriverInput {
  full_name: string;
  phone_number: string;
  passport_number?: string;
  license_number?: string;
  license_expiry_date?: string;
  chemical_certificate_number?: string;
  chemical_certificate_expiry_date?: string;
  chemical_certificate_image?: string;
  joining_date?: string;
  leaving_date?: string;
}

export async function createDriver(
  tenantId: string,
  input: CreateDriverInput
) {
  await ensureCanAddDriver(tenantId);

  const client = await db.connect();

  try {
    await client.query("BEGIN");

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
      RETURNING *
      `,
      [
        tenantId,
        input.full_name.trim(),
        normalizePhone(input.phone_number),
        input.passport_number?.trim() || null,
        input.license_number?.trim() || null,
        input.license_expiry_date || null,
        input.chemical_certificate_number?.trim() || null,
        input.chemical_certificate_expiry_date || null,
        input.joining_date || null,
        input.leaving_date || null
      ]
    );

    const driver = result.rows[0];

    if (input.chemical_certificate_image) {
      await client.query(
        `
        INSERT INTO documents (
          tenant_id,
          driver_id,
          document_type,
          file_url,
          expiry_date
        )
        VALUES ($1, $2, 'CHEMICAL_CERTIFICATE', $3, $4)
        `,
        [
          tenantId,
          driver.id,
          input.chemical_certificate_image,
          input.chemical_certificate_expiry_date || null
        ]
      );

      driver.chemical_certificate_image =
        input.chemical_certificate_image;
    }

    await client.query("COMMIT");

    return driver;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export interface UpdateDriverInput {
  full_name?: string;
  phone_number?: string;
  passport_number?: string;
  license_number?: string;
  license_expiry_date?: string;
  chemical_certificate_number?: string;
  chemical_certificate_expiry_date?: string;
  chemical_certificate_image?: string;
  joining_date?: string;
  leaving_date?: string;
}

export async function updateDriver(
  tenantId: string,
  driverId: string,
  input: UpdateDriverInput
) {
  const fullName =
    input.full_name !== undefined ? input.full_name.trim() : null;

  if (fullName !== null && fullName.length < 2) {
    throw new Error("A valid driver name is required");
  }

  const phone =
    input.phone_number !== undefined
      ? normalizePhone(input.phone_number)
      : null;

  const has = (value: unknown) => value !== undefined;
  const text = (value?: string) => value?.trim() || null;

  if (
    input.joining_date &&
    input.leaving_date &&
    input.leaving_date < input.joining_date
  ) {
    throw new Error("Leaving date cannot be before the joining date");
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
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
      WHERE id = $1
        AND tenant_id = $2
      RETURNING *
      `,
      [
        driverId,
        tenantId,
        fullName,
        phone,
        has(input.passport_number),
        text(input.passport_number),
        has(input.license_number),
        text(input.license_number),
        has(input.license_expiry_date),
        input.license_expiry_date || null,
        has(input.chemical_certificate_number),
        text(input.chemical_certificate_number),
        has(input.chemical_certificate_expiry_date),
        input.chemical_certificate_expiry_date || null,
        has(input.joining_date),
        input.joining_date || null,
        has(input.leaving_date),
        input.leaving_date || null
      ]
    );

    const driver = result.rows[0];

    if (!driver) {
      throw new Error("Driver not found");
    }

    if (input.chemical_certificate_image) {
      await client.query(
        `
        INSERT INTO documents (
          tenant_id,
          driver_id,
          document_type,
          file_url,
          expiry_date
        )
        VALUES ($1, $2, 'CHEMICAL_CERTIFICATE', $3, $4)
        `,
        [
          tenantId,
          driverId,
          input.chemical_certificate_image,
          driver.chemical_certificate_expiry_date || null
        ]
      );
    } else if (has(input.chemical_certificate_expiry_date)) {
      await client.query(
        `
        UPDATE documents
        SET expiry_date = $3::date
        WHERE id = (
          SELECT id FROM documents
          WHERE driver_id = $1
            AND tenant_id = $2
            AND document_type = 'CHEMICAL_CERTIFICATE'
          ORDER BY created_at DESC
          LIMIT 1
        )
        `,
        [
          driverId,
          tenantId,
          input.chemical_certificate_expiry_date || null
        ]
      );
    }

    await client.query("COMMIT");

    return driver;
  } catch (error) {
    await client.query("ROLLBACK");

    if ((error as { code?: string }).code === "23505") {
      throw new Error(
        "Another driver already uses this phone number"
      );
    }

    throw error;
  } finally {
    client.release();
  }
}
