
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
        chemical_certificate_expiry_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
        input.chemical_certificate_expiry_date || null
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
