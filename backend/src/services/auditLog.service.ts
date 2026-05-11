import { db } from "../config/db";

export async function createAuditLog(input: any) {
  await db.query(
    `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, details)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [input.tenantId ?? null, input.userId ?? null, input.action, input.entityType ?? null, input.entityId ?? null, input.details ? JSON.stringify(input.details) : null]
  );
}
