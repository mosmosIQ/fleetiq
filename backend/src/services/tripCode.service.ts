import { db } from "../config/db";
import { generatePublicTripCode } from "../utils/generateTripCode";

export async function generateNextTripCode(tenantId: string) {
  const tenantResult = await db.query(`SELECT company_code FROM tenants WHERE id = $1`, [tenantId]);
  const tenant = tenantResult.rows[0];
  if (!tenant) throw new Error("Tenant not found");

  const result = await db.query(
    `SELECT COALESCE(MAX(trip_number), 0) + 1 AS next_number FROM trips WHERE tenant_id = $1`,
    [tenantId]
  );

  const tripNumber = Number(result.rows[0].next_number);
  return { tripNumber, publicTripCode: generatePublicTripCode(tenant.company_code, tripNumber) };
}
