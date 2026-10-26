
import { db } from "../config/db";

export async function listBatches(tenantId: string) {
  const result = await db.query(
    `SELECT
       b.*,
       t.id AS trip_id,
       t.public_trip_code AS trip_code,
       t.status AS trip_status,
       tr.plate_number,
       tr.truck_type,
       d.full_name AS driver_name,
       d.phone_number AS driver_phone,
       tl.trailer_number,
       tl.trailer_type
     FROM trip_batches b
     LEFT JOIN trips t
       ON t.batch_id = b.id AND t.tenant_id = b.tenant_id
     LEFT JOIN trucks tr
       ON tr.id = t.truck_id AND tr.tenant_id = b.tenant_id
     LEFT JOIN drivers d
       ON d.id = t.driver_id AND d.tenant_id = b.tenant_id
     LEFT JOIN trailers tl
       ON tl.id = t.trailer_id AND tl.tenant_id = b.tenant_id
     WHERE b.tenant_id = $1::uuid
     ORDER BY b.created_at DESC`,
    [tenantId]
  );

  return result.rows;
}

export async function createBatch(
  tenantId: string,
  input: {
    direction: "NORTHBOUND" | "SOUTHBOUND";
    route_template_id: string;
    loading_point?: string;
    truck_handover_date?: string;
    loading_date?: string;
    tons?: number;
    release_date?: string;
    notes?: string;
  }
) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const routeResult = await client.query(
      `SELECT id, direction, checkpoints
       FROM public.route_templates
       WHERE id = $1::uuid
         AND tenant_id = $2::uuid
         AND is_active = TRUE
       FOR SHARE`,
      [input.route_template_id, tenantId]
    );

    const route = routeResult.rows[0];

    if (!route) {
      throw new Error("Active route template not found");
    }

    if (route.direction !== input.direction) {
      throw new Error(
        "The route template direction does not match the batch direction"
      );
    }

    const checkpoints = route.checkpoints;

    if (!Array.isArray(checkpoints) || checkpoints.length < 2) {
      throw new Error(
        "The selected route must have at least two checkpoints"
      );
    }

    const numberResult = await client.query(
      `SELECT COALESCE(MAX(batch_number), 0) + 1 AS next_number
       FROM trip_batches
       WHERE tenant_id = $1::uuid`,
      [tenantId]
    );

    const batchNumber = Number(numberResult.rows[0].next_number);

    const result = await client.query(
      `INSERT INTO trip_batches (
         tenant_id,
         batch_number,
         direction,
         route_template_id,
         checkpoint_snapshot,
         loading_point,
         truck_handover_date,
         loading_date,
         tons,
         release_date,
         notes
       )
       VALUES (
         $1::uuid, $2, $3, $4::uuid, $5::jsonb,
         $6, $7::date, $8::date, $9::numeric, $10::date, $11
       )
       RETURNING *`,
      [
        tenantId,
        batchNumber,
        input.direction,
        route.id,
        JSON.stringify(checkpoints),
        input.loading_point || null,
        input.truck_handover_date || null,
        input.loading_date || null,
        input.tons ?? null,
        input.release_date || null,
        input.notes || null
      ]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getBatch(
  tenantId: string,
  batchId: string
) {
  const result = await db.query(
    `SELECT
       b.*,
       t.id AS trip_id,
       t.public_trip_code AS trip_code,
       t.status AS trip_status,
       tr.plate_number,
       tr.truck_type,
       d.full_name AS driver_name,
       d.phone_number AS driver_phone,
       tl.trailer_number,
       tl.trailer_type
     FROM trip_batches b
     LEFT JOIN trips t
       ON t.batch_id = b.id AND t.tenant_id = b.tenant_id
     LEFT JOIN trucks tr
       ON tr.id = t.truck_id AND tr.tenant_id = b.tenant_id
     LEFT JOIN drivers d
       ON d.id = t.driver_id AND d.tenant_id = b.tenant_id
     LEFT JOIN trailers tl
       ON tl.id = t.trailer_id AND tl.tenant_id = b.tenant_id
     WHERE b.id = $1::uuid
       AND b.tenant_id = $2::uuid
     LIMIT 1`,
    [batchId, tenantId]
  );

  if (!result.rows[0]) {
    throw new Error("Batch not found");
  }

  return result.rows[0];
}
