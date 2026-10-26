import ExcelJS from "exceljs";
import { db } from "../config/db";

const CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const DATE_FORMAT = "dd/mm/yyyy hh:mm";

type ReportDirection = "NORTHBOUND" | "SOUTHBOUND";

interface JourneyEvent {
  checkpoint: string;
  event_type: string;
  location?: string | null;
  occurred_at?: string | Date | null;
  notes?: string | null;
  created_at?: string | Date | null;
}

interface ReportTrip {
  id: string;
  public_trip_code: string;
  destination_country?: string | null;
  direction: ReportDirection | null;
  batch_id: string | null;
  batch_number: number | string | null;
  route_template_id: string | null;
  checkpoint_snapshot: unknown;
  loading_point: string | null;
  truck_handover_date: string | Date | null;
  loading_date: string | Date | null;
  tons: number | string | null;
  release_date: string | Date | null;
  plate_number: string;
  trailer_number: string | null;
  driver_name: string;
  events: JourneyEvent[];
}

interface RouteGroup {
  direction: ReportDirection | null;
  loadingPoint: string;
  checkpoints: string[];
  trips: ReportTrip[];
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function toExcelDate(
  value: string | Date | null | undefined
): Date | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getCheckpointSnapshot(value: unknown): string[] {
  let parsed = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function findCheckpointEvent(
  events: JourneyEvent[],
  checkpoint: string,
  eventType: string
): JourneyEvent | null {
  const checkpointName = normalizeText(checkpoint);
  const wantedType = normalizeText(eventType);

  const matches = events.filter(
    (event) =>
      normalizeText(event.checkpoint) === checkpointName &&
      normalizeText(event.event_type) === wantedType
  );

  if (matches.length === 0) {
    return null;
  }

  matches.sort((a, b) => {
    const aTime = toExcelDate(a.occurred_at)?.getTime() ?? 0;
    const bTime = toExcelDate(b.occurred_at)?.getTime() ?? 0;

    return bTime - aTime;
  });

  return matches[0];
}

function findFinalEvent(
  events: JourneyEvent[],
  eventType: string
): JourneyEvent | null {
  const wantedType = normalizeText(eventType);

  const matches = events.filter(
    (event) => normalizeText(event.event_type) === wantedType
  );

  if (matches.length === 0) {
    return null;
  }

  matches.sort((a, b) => {
    const aTime = toExcelDate(a.occurred_at)?.getTime() ?? 0;
    const bTime = toExcelDate(b.occurred_at)?.getTime() ?? 0;

    return bTime - aTime;
  });

  return matches[0];
}

function getCurrentLocation(events: JourneyEvent[]): string {
  if (events.length === 0) {
    return "";
  }

  const sorted = [...events].sort((a, b) => {
    const aTime = toExcelDate(a.occurred_at)?.getTime() ?? 0;
    const bTime = toExcelDate(b.occurred_at)?.getTime() ?? 0;

    return bTime - aTime;
  });

  const latest = sorted[0];

  return latest.location || latest.checkpoint || "";
}

/**
 * Fetch trips belonging to one tenant and their journey events.
 *
 * The checkpoint_snapshot stored on the batch is used so later
 * changes to a route template do not rewrite an existing batch's route.
 */
async function getTrackingTrips(
  tenantId: string
): Promise<ReportTrip[]> {
  const result = await db.query(
    `
    SELECT
      t.id,
      t.public_trip_code,
      t.destination_country,

      b.id AS batch_id,
      b.batch_number,
      b.direction,
      b.route_template_id,
      b.checkpoint_snapshot,
      b.loading_point,
      b.truck_handover_date,
      b.loading_date,
      b.tons,
      b.release_date,

      tr.plate_number,
      trailer.trailer_number,
      d.full_name AS driver_name

    FROM trips t

    LEFT JOIN trip_batches b
      ON b.id = t.batch_id
     AND b.tenant_id = t.tenant_id

    INNER JOIN trucks tr
      ON tr.id = t.truck_id
     AND tr.tenant_id = t.tenant_id

    INNER JOIN drivers d
      ON d.id = t.driver_id
     AND d.tenant_id = t.tenant_id

    LEFT JOIN trailers trailer
      ON trailer.id = t.trailer_id
     AND trailer.tenant_id = t.tenant_id

    WHERE t.tenant_id = $1::uuid

    ORDER BY
      CASE b.direction
        WHEN 'NORTHBOUND' THEN 1
        WHEN 'SOUTHBOUND' THEN 2
        ELSE 3
      END,
      b.batch_number ASC NULLS LAST,
      t.created_at ASC
    `,
    [tenantId]
  );

  const trips: ReportTrip[] = [];

  for (const row of result.rows) {
    const eventsResult = await db.query(
      `
      SELECT
        checkpoint,
        event_type,
        location,
        occurred_at,
        notes,
        created_at
      FROM trip_journey_events
      WHERE trip_id = $1::uuid
        AND tenant_id = $2::uuid
      ORDER BY occurred_at ASC NULLS LAST, created_at ASC
      `,
      [row.id, tenantId]
    );

    trips.push({
      ...row,
      events: eventsResult.rows
    } as ReportTrip);
  }

  return trips;
}

/**
 * Create one group for every distinct combination of:
 * direction + loading point + saved checkpoint sequence.
 */
function groupTripsBySavedRoute(trips: ReportTrip[]): RouteGroup[] {
  const groups = new Map<string, RouteGroup>();

  for (const trip of trips) {
    const checkpoints = getCheckpointSnapshot(
      trip.checkpoint_snapshot
    );

    const direction = trip.direction;
    const loadingPoint = trip.loading_point?.trim() || "Not specified";

    const key = JSON.stringify({
      direction: direction ?? "UNASSIGNED",
      loadingPoint: normalizeText(loadingPoint),
      checkpoints: checkpoints.map(normalizeText)
    });

    let group = groups.get(key);

    if (!group) {
      group = {
        direction,
        loadingPoint,
        checkpoints,
        trips: []
      };

      groups.set(key, group);
    }

    group.trips.push(trip);
  }

  return Array.from(groups.values()).sort((a, b) => {
    const directionOrder = (
      direction: ReportDirection | null
    ): number => {
      if (direction === "NORTHBOUND") return 1;
      if (direction === "SOUTHBOUND") return 2;
      return 3;
    };

    const directionDifference =
      directionOrder(a.direction) - directionOrder(b.direction);

    if (directionDifference !== 0) {
      return directionDifference;
    }

    const loadingDifference =
      a.loadingPoint.localeCompare(b.loadingPoint);

    if (loadingDifference !== 0) {
      return loadingDifference;
    }

    return JSON.stringify(a.checkpoints).localeCompare(
      JSON.stringify(b.checkpoints)
    );
  });
}

function styleHeaderRow(row: ExcelJS.Row): void {
  row.font = {
    bold: true,
    color: { argb: "FFFFFFFF" }
  };

  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF244062" }
  };

  row.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true
  };

  row.height = 32;

  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
  });
}

function styleDataRow(row: ExcelJS.Row): void {
  row.alignment = {
    vertical: "middle",
    wrapText: true
  };

  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
  });
}

function buildReportColumns(checkpoints: string[]) {
  const columns: Array<{
    header: string;
    key: string;
    width: number;
    style?: Partial<ExcelJS.Style>;
  }> = [
    { header: "No.", key: "serial", width: 7 },
    { header: "Trip Code", key: "trip_code", width: 18 },
    { header: "Truck", key: "truck", width: 16 },
    { header: "Trailer", key: "trailer", width: 16 },
    { header: "Driver", key: "driver", width: 24 },
    { header: "Loading Point", key: "loading_point", width: 22 },
    {
      header: "Truck Handover Date",
      key: "truck_handover_date",
      width: 20,
      style: { numFmt: DATE_FORMAT }
    },
    {
      header: "Loading Date",
      key: "loading_date",
      width: 18,
      style: { numFmt: DATE_FORMAT }
    },
    { header: "Tons", key: "tons", width: 12 },
    {
      header: "Release Date",
      key: "release_date",
      width: 18,
      style: { numFmt: DATE_FORMAT }
    },
    { header: "Current Location", key: "current_location", width: 24 }
  ];

  checkpoints.forEach((checkpoint, index) => {
    columns.push({
      header: `${checkpoint} - Arrival`,
      key: `checkpoint_${index}_arrival`,
      width: 20,
      style: { numFmt: DATE_FORMAT }
    });

    columns.push({
      header: `${checkpoint} - Departure`,
      key: `checkpoint_${index}_departure`,
      width: 20,
      style: { numFmt: DATE_FORMAT }
    });
  });

  columns.push(
    {
      header: "Final Arrival",
      key: "final_arrival",
      width: 20,
      style: { numFmt: DATE_FORMAT }
    },
    {
      header: "Final Offloading",
      key: "final_offloading",
      width: 20,
      style: { numFmt: DATE_FORMAT }
    }
  );

  return columns;
}

function buildReportRow(
  trip: ReportTrip,
  checkpoints: string[],
  serialNumber: number
): Record<string, string | number | Date | null> {
  const row: Record<string, string | number | Date | null> = {
    serial: serialNumber,
    trip_code: trip.public_trip_code || "",
    truck: trip.plate_number || "",
    trailer: trip.trailer_number || "",
    driver: trip.driver_name || "",
    loading_point: trip.loading_point || "",
    truck_handover_date: toExcelDate(trip.truck_handover_date),
    loading_date: toExcelDate(trip.loading_date),
    tons:
      trip.tons === null || trip.tons === undefined
        ? null
        : Number(trip.tons),
    release_date: toExcelDate(trip.release_date),
    current_location: getCurrentLocation(trip.events),
    final_arrival: toExcelDate(
      findFinalEvent(trip.events, "FINAL_ARRIVAL")?.occurred_at
    ),
    final_offloading: toExcelDate(
      findFinalEvent(trip.events, "FINAL_OFFLOADING")?.occurred_at
    )
  };

  checkpoints.forEach((checkpoint, index) => {
    const arrival = findCheckpointEvent(
      trip.events,
      checkpoint,
      "ARRIVAL"
    );

    const departure = findCheckpointEvent(
      trip.events,
      checkpoint,
      "DEPARTURE"
    );

    row[`checkpoint_${index}_arrival`] =
      toExcelDate(arrival?.occurred_at);

    row[`checkpoint_${index}_departure`] =
      toExcelDate(departure?.occurred_at);
  });

  return row;
}

/**
 * Generate a fresh dynamic Excel report.
 * A new workbook is used so deleted or outdated template checkpoint
 * values cannot carry over into a new report.
 */
export async function generateTrackingReport(
  tenantId: string,
  userId: string
) {
  const userResult = await db.query(
    `
    SELECT id, full_name, email
    FROM users
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
      AND is_active = true
    LIMIT 1
    `,
    [userId, tenantId]
  );

  const user = userResult.rows[0];

  if (!user) {
    throw new Error("Current user not found");
  }

  const trips = await getTrackingTrips(tenantId);
  const routeGroups = groupTripsBySavedRoute(trips);

  const northboundCount = trips.filter(
    (trip) => trip.direction === "NORTHBOUND"
  ).length;

  const southboundCount = trips.filter(
    (trip) => trip.direction === "SOUTHBOUND"
  ).length;

  const workbook = new ExcelJS.Workbook();

  workbook.creator = user.full_name || user.email || "FleetIQ";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = "FleetIQ Impala Tracking Report";
  workbook.title = "IMPALA TRACKING REPORT";

  const worksheet = workbook.addWorksheet("IMPALA");

  worksheet.properties.defaultRowHeight = 20;
  worksheet.views = [{ state: "frozen", ySplit: 5 }];

  worksheet.mergeCells("A1:F1");
  worksheet.getCell("A1").value = "IMPALA TRACKING REPORT";
  worksheet.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: "FF244062" }
  };
  worksheet.getCell("A1").alignment = {
    vertical: "middle",
    horizontal: "left"
  };
  worksheet.getRow(1).height = 30;

  worksheet.getCell("A2").value = "Generated by";
  worksheet.getCell("B2").value =
    user.full_name || user.email || "";
  worksheet.getCell("A3").value = "Generated at";
  worksheet.getCell("B3").value = new Date();
  worksheet.getCell("B3").numFmt = "dd mmmm yyyy hh:mm";

  worksheet.getCell("D2").value = "Northbound trips";
  worksheet.getCell("E2").value = northboundCount;
  worksheet.getCell("D3").value = "Southbound trips";
  worksheet.getCell("E3").value = southboundCount;

  for (const cellAddress of ["A2", "A3", "D2", "D3"]) {
    worksheet.getCell(cellAddress).font = { bold: true };
  }

  let currentRow = 5;

  if (routeGroups.length === 0) {
    worksheet.getCell(currentRow, 1).value =
      "No trips were available when this report was generated.";
    worksheet.getCell(currentRow, 1).font = { italic: true };
    currentRow += 2;
  }

  for (const group of routeGroups) {
    const directionLabel = group.direction || "UNASSIGNED";

    worksheet.mergeCells(
      currentRow,
      1,
      currentRow,
      Math.max(1, buildReportColumns(group.checkpoints).length)
    );

    const groupTitle = worksheet.getCell(currentRow, 1);
    groupTitle.value =
      `${directionLabel} | Loading point: ${group.loadingPoint}`;

    groupTitle.font = {
      bold: true,
      size: 12,
      color: { argb: "FF244062" }
    };

    groupTitle.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9EAF7" }
    };

    groupTitle.alignment = {
      vertical: "middle",
      wrapText: true
    };

    worksheet.getRow(currentRow).height = 25;
    currentRow++;

    const columns = buildReportColumns(group.checkpoints);

    const headerRow = worksheet.getRow(currentRow);

    columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = column.header;
      cell.numFmt = column.style?.numFmt || "General";
      worksheet.getColumn(index + 1).width = Math.max(
        worksheet.getColumn(index + 1).width || 0,
        column.width
      );
    });

    styleHeaderRow(headerRow);
    currentRow++;

    for (let index = 0; index < group.trips.length; index++) {
      const trip = group.trips[index];
      const values = buildReportRow(
        trip,
        group.checkpoints,
        index + 1
      );

      const dataRow = worksheet.getRow(currentRow);

      columns.forEach((column, columnIndex) => {
        const cell = dataRow.getCell(columnIndex + 1);
        cell.value = values[column.key] ?? null;

        if (column.style?.numFmt) {
          cell.numFmt = column.style.numFmt;
        }
      });

      styleDataRow(dataRow);
      currentRow++;
    }

    currentRow += 2;
  }

  worksheet.autoFilter = undefined;

  // Full event history, kept separately from the route-specific tables.
  const eventSheet = workbook.addWorksheet("Journey Event Log");

  eventSheet.columns = [
    { header: "Direction", key: "direction", width: 16 },
    { header: "Destination Country", key: "destination_country", width: 20 },
    { header: "Trip Code", key: "trip_code", width: 18 },
    { header: "Truck", key: "truck", width: 16 },
    { header: "Trailer", key: "trailer", width: 16 },
    { header: "Batch", key: "batch", width: 12 },
    { header: "Loading Point", key: "loading_point", width: 22 },
    { header: "Checkpoint", key: "checkpoint", width: 28 },
    { header: "Event", key: "event_type", width: 22 },
    { header: "Location", key: "location", width: 28 },
    { header: "Date & Time", key: "occurred_at", width: 22 },
    { header: "Notes", key: "notes", width: 40 }
  ];

  styleHeaderRow(eventSheet.getRow(1));
  eventSheet.views = [{ state: "frozen", ySplit: 1 }];
  eventSheet.autoFilter = {
    from: "A1",
    to: "L1"
  };

  for (const trip of trips) {
    for (const event of trip.events) {
      const eventRow = eventSheet.addRow({
        direction: trip.direction || "",
        destination_country: trip.destination_country || "",
        trip_code: trip.public_trip_code,
        truck: trip.plate_number,
        trailer: trip.trailer_number || "",
        batch: trip.batch_number ?? "",
        loading_point: trip.loading_point || "",
        checkpoint: event.checkpoint || "",
        event_type: event.event_type || "",
        location: event.location || "",
        occurred_at: toExcelDate(event.occurred_at),
        notes: event.notes || ""
      });

      eventRow.getCell(11).numFmt = DATE_FORMAT;
      styleDataRow(eventRow);
    }
  }

  // Generate the next report number for this tenant.
  const reportNumberResult = await db.query(
    `
    SELECT COALESCE(MAX(report_number), 0) + 1 AS report_number
    FROM tracking_reports
    WHERE tenant_id = $1::uuid
    `,
    [tenantId]
  );

  const reportNumber = Number(
    reportNumberResult.rows[0]?.report_number ?? 1
  );

  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName =
    `IMPALA TRACKING REPORT ${reportNumber} - ${dateStamp}.xlsx`;

  const fileBuffer = Buffer.from(
    await workbook.xlsx.writeBuffer()
  );

  const snapshotData = {
    report_number: reportNumber,
    generated_by: {
      user_id: user.id,
      name: user.full_name,
      email: user.email
    },
    generated_at: new Date().toISOString(),
    northbound_count: northboundCount,
    southbound_count: southboundCount,
    route_groups: routeGroups.map((group) => ({
      direction: group.direction,
      loading_point: group.loadingPoint,
      checkpoints: group.checkpoints,
      trips: group.trips.map((trip) => ({
        trip_id: trip.id,
        trip_code: trip.public_trip_code,
        batch_number: trip.batch_number,
        truck: trip.plate_number,
        trailer: trip.trailer_number,
        driver: trip.driver_name,
        events: trip.events
      }))
    }))
  };

  const insertResult = await db.query(
    `
    INSERT INTO tracking_reports (
      tenant_id,
      report_number,
      file_name,
      content_type,
      file_data,
      generated_by_user_id,
      northbound_count,
      southbound_count,
      snapshot_data
    )
    VALUES (
      $1::uuid,
      $2,
      $3,
      $4,
      $5,
      $6::uuid,
      $7,
      $8,
      $9::jsonb
    )
    RETURNING
      id,
      tenant_id,
      report_number,
      file_name,
      generated_at,
      northbound_count,
      southbound_count
    `,
    [
      tenantId,
      reportNumber,
      fileName,
      CONTENT_TYPE,
      fileBuffer,
      userId,
      northboundCount,
      southboundCount,
      JSON.stringify(snapshotData)
    ]
  );

  return {
    report: insertResult.rows[0],
    fileBuffer
  };
}

/**
 * List reports for the current tenant.
 */
export async function listTrackingReports(tenantId: string) {
  const result = await db.query(
    `
    SELECT
      r.id,
      r.report_number,
      r.file_name,
      r.generated_at,
      r.northbound_count,
      r.southbound_count,
      r.generated_by_user_id,
      u.full_name AS generated_by_name
    FROM tracking_reports r
    LEFT JOIN users u
      ON u.id = r.generated_by_user_id
     AND u.tenant_id = r.tenant_id
    WHERE r.tenant_id = $1::uuid
    ORDER BY r.generated_at DESC
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Fetch a saved report file for download.
 */
export async function getTrackingReport(
  tenantId: string,
  reportId: string
) {
  const result = await db.query(
    `
    SELECT
      id,
      report_number,
      file_name,
      content_type,
      file_data,
      generated_at
    FROM tracking_reports
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
    LIMIT 1
    `,
    [reportId, tenantId]
  );

  return result.rows[0] || null;
}

/**
 * Delete one report belonging to the current tenant.
 */
export async function deleteTrackingReport(
  tenantId: string,
  reportId: string
): Promise<boolean> {
  const result = await db.query(
    `
    DELETE FROM tracking_reports
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
    RETURNING id
    `,
    [reportId, tenantId]
  );

  return (result.rowCount ?? 0) > 0;
}