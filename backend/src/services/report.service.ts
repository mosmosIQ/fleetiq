import { db } from "../config/db";

const ACTIVE_TRIP_STATUSES = [
  "ASSIGNED",
  "STARTED",
  "ON_ROUTE",
  "DELAYED",
  "BREAKDOWN",
  "ARRIVED"
];

function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function getCompanyReport(tenantId: string) {
  const month = getCurrentMonthKey();

  const [
    truckStats,
    driverStats,
    tripStats,
    messageUsage,
    recentTrips
  ] = await Promise.all([
    db.query(
      `
      SELECT
        COUNT(*)::int AS total_trucks,
        COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available_trucks,
        COUNT(*) FILTER (WHERE status = 'UNDER_MAINTENANCE')::int AS under_maintenance_trucks,
        COUNT(*) FILTER (WHERE status = 'INACTIVE')::int AS inactive_trucks,
        COUNT(*) FILTER (WHERE status IN ('ASSIGNED', 'ON_TRIP', 'ON_ROUTE', 'DELAYED', 'BREAKDOWN', 'ARRIVED'))::int AS active_trucks
      FROM trucks
      WHERE tenant_id = $1::uuid
      `,
      [tenantId]
    ),

    db.query(
      `
      SELECT
        COUNT(*)::int AS total_drivers,
        COUNT(*) FILTER (WHERE d.is_active = true)::int AS active_drivers,
        COUNT(*) FILTER (WHERE active_trip.id IS NULL AND d.is_active = true)::int AS available_drivers,
        COUNT(*) FILTER (WHERE active_trip.id IS NOT NULL)::int AS drivers_on_trip
      FROM drivers d
      LEFT JOIN LATERAL (
        SELECT t.id
        FROM trips t
        WHERE t.driver_id = d.id
          AND t.tenant_id = d.tenant_id
          AND t.status = ANY($2)
        LIMIT 1
      ) active_trip ON true
      WHERE d.tenant_id = $1::uuid
      `,
      [tenantId, ACTIVE_TRIP_STATUSES]
    ),

    db.query(
      `
      SELECT
        COUNT(*)::int AS total_trips,
        COUNT(*) FILTER (WHERE status = ANY($2))::int AS active_trips,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed_trips,
        COUNT(*) FILTER (WHERE status = 'DELAYED')::int AS delayed_trips,
        COUNT(*) FILTER (WHERE status = 'BREAKDOWN')::int AS breakdown_trips,
        COUNT(*) FILTER (WHERE status = 'ARRIVED')::int AS arrived_trips
      FROM trips
      WHERE tenant_id = $1::uuid
      `,
      [tenantId, ACTIVE_TRIP_STATUSES]
    ),

    db.query(
      `
      SELECT
        COALESCE(sms_sent, 0)::int AS sms_sent,
        COALESCE(whatsapp_sent, 0)::int AS whatsapp_sent
      FROM message_usage
      WHERE tenant_id = $1::uuid
        AND month = $2::varchar
      LIMIT 1
      `,
      [tenantId, month]
    ),

    db.query(
      `
      SELECT
        t.id,
        t.public_trip_code,
        t.route_from,
        t.route_to,
        t.status,
        t.created_at,
        tr.plate_number,
        d.full_name AS driver_name
      FROM trips t
      JOIN trucks tr
        ON tr.id = t.truck_id
       AND tr.tenant_id = t.tenant_id
      JOIN drivers d
        ON d.id = t.driver_id
       AND d.tenant_id = t.tenant_id
      WHERE t.tenant_id = $1::uuid
      ORDER BY t.created_at DESC
      LIMIT 10
      `,
      [tenantId]
    )
  ]);

  return {
    month,
    trucks: truckStats.rows[0],
    drivers: driverStats.rows[0],
    trips: tripStats.rows[0],
    messages: messageUsage.rows[0] || {
      sms_sent: 0,
      whatsapp_sent: 0
    },
    recent_trips: recentTrips.rows
  };
}