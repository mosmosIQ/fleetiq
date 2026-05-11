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
      active_trip.id AS active_trip_id,
      active_trip.public_trip_code AS active_trip_code,
      CASE
        WHEN active_trip.id IS NULL THEN 'AVAILABLE'
        ELSE 'ON_TRIP'
      END AS availability_status
    FROM drivers d
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

export async function createDriver(
  tenantId: string,
  input: {
    full_name: string;
    phone_number: string;
    license_number?: string;
    license_expiry_date?: string;
  }
) {
  await ensureCanAddDriver(tenantId);
  
  const result = await db.query(
    `INSERT INTO drivers (tenant_id, full_name, phone_number, license_number, license_expiry_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      tenantId,
      input.full_name,
      normalizePhone(input.phone_number),
      input.license_number,
      input.license_expiry_date || null
    ]
  );

  return result.rows[0];
}