import ExcelJS from "exceljs";
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

// ------------------------------------------------------------
// FLEET ASSIGNMENT REPORT
// Truck -> linked trailer + linked driver, taken from the unit's
// registered links (falling back to the truck's latest trip).
// ------------------------------------------------------------

export async function getFleetAssignmentReport(tenantId: string) {
  const result = await db.query(
    `
    SELECT
      tr.id AS truck_id,
      tr.plate_number,
      tr.truck_type,
      tr.capacity,
      tr.status AS truck_status,

      lt.public_trip_code AS trip_code,
      lt.status AS trip_status,

      tl.trailer_number,
      tl.trailer_type,
      tl.trailer_model,

      d.full_name AS driver_name,
      d.phone_number AS driver_phone,
      d.passport_number,
      d.license_number,
      d.chemical_certificate_number
    FROM trucks tr
    LEFT JOIN LATERAL (
      SELECT t.*
      FROM trips t
      WHERE t.truck_id = tr.id
        AND t.tenant_id = tr.tenant_id
      ORDER BY
        CASE WHEN t.status = ANY($2) THEN 0 ELSE 1 END,
        t.created_at DESC
      LIMIT 1
    ) lt ON true
    LEFT JOIN trailers tl
      ON tl.id = COALESCE(tr.assigned_trailer_id, lt.trailer_id)
     AND tl.tenant_id = tr.tenant_id
    LEFT JOIN drivers d
      ON d.id = COALESCE(tr.assigned_driver_id, lt.driver_id)
     AND d.tenant_id = tr.tenant_id
    WHERE tr.tenant_id = $1
    ORDER BY tr.plate_number ASC
    `,
    [tenantId, ACTIVE_TRIP_STATUSES]
  );

  return result.rows;
}

export async function buildFleetAssignmentWorkbook(
  tenantId: string
): Promise<Buffer> {
  const rows = await getFleetAssignmentReport(tenantId);

  const workbook = new ExcelJS.Workbook();
  workbook.title = "FLEET ASSIGNMENT REPORT";

  const sheet = workbook.addWorksheet("Fleet Assignments");

  sheet.columns = [
    { header: "Truck Plate", key: "plate_number", width: 16 },
    { header: "Truck Type", key: "truck_type", width: 18 },
    { header: "Capacity", key: "capacity", width: 14 },
    { header: "Truck Status", key: "truck_status", width: 18 },
    { header: "Trip", key: "trip_code", width: 18 },
    { header: "Trailer Number", key: "trailer_number", width: 18 },
    { header: "Trailer Type", key: "trailer_type", width: 18 },
    { header: "Trailer Model", key: "trailer_model", width: 18 },
    { header: "Driver", key: "driver_name", width: 24 },
    { header: "Driver Phone", key: "driver_phone", width: 18 },
    { header: "Passport No", key: "passport_number", width: 18 },
    { header: "License No", key: "license_number", width: 18 },
    { header: "Chemical Certificate No", key: "chemical_certificate_number", width: 24 }
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    sheet.addRow({
      ...row,
      truck_status: String(row.truck_status || "").replace(/_/g, " ")
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
