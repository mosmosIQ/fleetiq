import { db } from "../config/db";

const ACTIVE_TRIP_STATUSES = [
  "ASSIGNED",
  "STARTED",
  "ON_ROUTE",
  "DELAYED",
  "BREAKDOWN",
  "ARRIVED"
];

const ALLOWED_TRAILER_STATUSES = [
  "AVAILABLE",
  "UNDER_MAINTENANCE",
  "INACTIVE"
];

export async function listTrailers(tenantId: string) {
  const result = await db.query(
    `
    SELECT
      tr.*,
      active_trip.id AS active_trip_id,
      active_trip.public_trip_code AS active_trip_code,
      CASE
        WHEN active_trip.id IS NULL THEN true
        ELSE false
      END AS can_change_status
    FROM trailers tr
    LEFT JOIN LATERAL (
      SELECT
        t.id,
        t.public_trip_code
      FROM trips t
      WHERE t.trailer_id = tr.id
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

export async function createTrailer(
  tenantId: string,
  input: {
    trailer_number: string;
    trailer_type?: string;
    trailer_model?: string;
    status?: string;
  }
) {
  const status = input.status ?? "AVAILABLE";

  if (!ALLOWED_TRAILER_STATUSES.includes(status)) {
    throw new Error("Invalid trailer status");
  }

  const result = await db.query(
    `
    INSERT INTO trailers (
      tenant_id,
      trailer_number,
      trailer_type,
      trailer_model,
      status
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      tenantId,
      input.trailer_number.trim(),
      input.trailer_type?.trim() || null,
      input.trailer_model?.trim() || null,
      status
    ]
  );

  return result.rows[0];
}

export async function updateTrailerStatus(
  tenantId: string,
  trailerId: string,
  status: string
) {
  if (!ALLOWED_TRAILER_STATUSES.includes(status)) {
    throw new Error("Invalid trailer status");
  }

  const trailerResult = await db.query(
    `
    SELECT
      tr.id,
      tr.status,
      active_trip.id AS active_trip_id,
      active_trip.public_trip_code AS active_trip_code
    FROM trailers tr
    LEFT JOIN LATERAL (
      SELECT
        t.id,
        t.public_trip_code
      FROM trips t
      WHERE t.trailer_id = tr.id
        AND t.tenant_id = tr.tenant_id
        AND t.status = ANY($3)
      ORDER BY t.created_at DESC
      LIMIT 1
    ) active_trip ON true
    WHERE tr.id = $1
      AND tr.tenant_id = $2
    LIMIT 1
    `,
    [trailerId, tenantId, ACTIVE_TRIP_STATUSES]
  );

  const trailer = trailerResult.rows[0];

  if (!trailer) {
    throw new Error("Trailer not found");
  }

  if (trailer.active_trip_id) {
    throw new Error(
      `This trailer is currently assigned to active trip ${trailer.active_trip_code}. Complete the trip first before changing trailer availability.`
    );
  }

  const result = await db.query(
    `
    UPDATE trailers
    SET
      status = $1,
      updated_at = NOW()
    WHERE id = $2
      AND tenant_id = $3
    RETURNING *
    `,
    [status, trailerId, tenantId]
  );

  return result.rows[0];
}

export async function updateTrailer(
  tenantId: string,
  trailerId: string,
  input: {
    trailer_number?: string;
    trailer_type?: string;
    trailer_model?: string;
  }
) {
  const trailerNumber =
    input.trailer_number !== undefined
      ? input.trailer_number.trim()
      : null;

  if (trailerNumber !== null && trailerNumber.length < 2) {
    throw new Error("A valid trailer number is required");
  }

  try {
    const result = await db.query(
      `
      UPDATE trailers
      SET
        trailer_number = COALESCE($3, trailer_number),
        trailer_type = CASE WHEN $4::boolean THEN $5 ELSE trailer_type END,
        trailer_model = CASE WHEN $6::boolean THEN $7 ELSE trailer_model END,
        updated_at = NOW()
      WHERE id = $1
        AND tenant_id = $2
      RETURNING *
      `,
      [
        trailerId,
        tenantId,
        trailerNumber,
        input.trailer_type !== undefined,
        input.trailer_type?.trim() || null,
        input.trailer_model !== undefined,
        input.trailer_model?.trim() || null
      ]
    );

    if (!result.rows[0]) {
      throw new Error("Trailer not found");
    }

    return result.rows[0];
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new Error(
        "Another trailer already uses this trailer number"
      );
    }

    throw error;
  }
}
