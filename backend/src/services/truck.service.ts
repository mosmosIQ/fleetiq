import { db } from "../config/db";
import { ensureCanAddTruck } from "./subscription.service";

const ACTIVE_TRIP_STATUSES = [
  "ASSIGNED",
  "STARTED",
  "ON_ROUTE",
  "DELAYED",
  "BREAKDOWN",
  "ARRIVED"
];

export async function listTrucks(tenantId: string) {
  const result = await db.query(
    `
    SELECT
      tr.*,
      active_trip.id AS active_trip_id,
      active_trip.public_trip_code AS active_trip_code,
      active_trip.status AS active_trip_status,
      CASE
        WHEN active_trip.id IS NULL THEN true
        ELSE false
      END AS can_change_status
    FROM trucks tr
    LEFT JOIN LATERAL (
      SELECT t.id, t.public_trip_code, t.status
      FROM trips t
      WHERE t.truck_id = tr.id
        AND t.tenant_id = tr.tenant_id
        AND t.status = ANY($2)
      ORDER BY t.created_at DESC
      LIMIT 1
    ) active_trip ON true
    WHERE tr.tenant_id = $1
    ORDER BY tr.created_at DESC
    `,
    [tenantId, ACTIVE_TRIP_STATUSES]
  );

  return result.rows;
}

export async function createTruck(
  tenantId: string,
  input: {
    plate_number: string;
    truck_type?: string;
    capacity?: string;
    status?: string;
  }
) {
  await ensureCanAddTruck(tenantId);
  
  const result = await db.query(
    `INSERT INTO trucks (tenant_id, plate_number, truck_type, capacity, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      tenantId,
      input.plate_number,
      input.truck_type,
      input.capacity,
      input.status ?? "AVAILABLE"
    ]
  );

  return result.rows[0];
}

export async function updateTruckStatus(
  tenantId: string,
  truckId: string,
  status: string
) {
  const allowedStatuses = ["AVAILABLE", "UNDER_MAINTENANCE", "INACTIVE"];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid truck status");
  }

  const truckResult = await db.query(
    `
    SELECT
      tr.id,
      tr.status,
      active_trip.id AS active_trip_id,
      active_trip.public_trip_code AS active_trip_code
    FROM trucks tr
    LEFT JOIN LATERAL (
      SELECT t.id, t.public_trip_code
      FROM trips t
      WHERE t.truck_id = tr.id
        AND t.tenant_id = tr.tenant_id
        AND t.status = ANY($3)
      ORDER BY t.created_at DESC
      LIMIT 1
    ) active_trip ON true
    WHERE tr.id = $1
      AND tr.tenant_id = $2
    LIMIT 1
    `,
    [truckId, tenantId, ACTIVE_TRIP_STATUSES]
  );

  const truck = truckResult.rows[0];

  if (!truck) {
    throw new Error("Truck not found");
  }

  if (truck.active_trip_id) {
    throw new Error(
      `This truck is currently assigned to active trip ${truck.active_trip_code}. Complete the trip first before changing truck availability.`
    );
  }

  const result = await db.query(
    `UPDATE trucks
     SET status = $1,
         updated_at = NOW()
     WHERE id = $2
       AND tenant_id = $3
     RETURNING *`,
    [status, truckId, tenantId]
  );

  await db.query(
    `INSERT INTO status_logs (
      tenant_id,
      truck_id,
      old_status,
      new_status,
      source
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      'COMPANY_ADMIN'
    )`,
    [tenantId, truckId, truck.status, status]
  );

  return result.rows[0];
}