
import { db } from "../config/db";

const ALLOWED_EVENT_TYPES = [
  "HANDOVER",
  "LOADING",
  "RELEASE",
  "ARRIVAL",
  "DEPARTURE",
  "FINAL_ARRIVAL",
  "FINAL_OFFLOADING"
] as const;

type JourneyEventType = typeof ALLOWED_EVENT_TYPES[number];

function normalizeCheckpoint(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isFinalEvent(eventType: JourneyEventType): boolean {
  return (
    eventType === "FINAL_ARRIVAL" ||
    eventType === "FINAL_OFFLOADING"
  );
}

export async function listJourneyEvents(
  tenantId: string,
  tripId: string
) {
  const tripResult = await db.query(
    `
    SELECT id
    FROM trips
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
    LIMIT 1
    `,
    [tripId, tenantId]
  );

  if (!tripResult.rows[0]) {
    throw new Error("Trip not found");
  }

  const result = await db.query(
    `
    SELECT
      e.*,
      t.public_trip_code AS trip_code,
      b.batch_number,
      b.direction AS batch_direction
    FROM trip_journey_events e
    JOIN trips t
      ON t.id = e.trip_id
     AND t.tenant_id = e.tenant_id
    LEFT JOIN trip_batches b
      ON b.id = e.batch_id
     AND b.tenant_id = e.tenant_id
    WHERE e.trip_id = $1::uuid
      AND e.tenant_id = $2::uuid
    ORDER BY e.occurred_at ASC, e.created_at ASC
    `,
    [tripId, tenantId]
  );

  return result.rows;
}

export async function createJourneyEvent(
  tenantId: string,
  tripId: string,
  input: {
    checkpoint?: string;
    event_type: JourneyEventType;
    location?: string;
    occurred_at?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
    source?: string;
  }
) {
  if (!ALLOWED_EVENT_TYPES.includes(input.event_type)) {
    throw new Error("Invalid journey event type");
  }

  const finalEvent = isFinalEvent(input.event_type);
  const checkpoint = (input.checkpoint || "").trim();

  if (!finalEvent && checkpoint.length < 2) {
    throw new Error(
      "A checkpoint is required for this event type"
    );
  }

  // Load the trip and its saved checkpoint snapshot.
  // The snapshot belongs to the batch selected when the trip was created.
  const tripResult = await db.query(
    `
    SELECT
      t.id,
      t.batch_id,
      t.truck_id,
      t.driver_id,
      t.status,
      b.checkpoint_snapshot
    FROM trips t
    LEFT JOIN trip_batches b
      ON b.id = t.batch_id
     AND b.tenant_id = t.tenant_id
    WHERE t.id = $1::uuid
      AND t.tenant_id = $2::uuid
    LIMIT 1
    `,
    [tripId, tenantId]
  );

  const trip = tripResult.rows[0];

  if (!trip) {
    throw new Error("Trip not found");
  }

  if (trip.status === "COMPLETED") {
    throw new Error(
      "Journey events cannot be added to a completed trip"
    );
  }

  // Final arrival and final offloading are terminal events.
  // They use the special FINAL checkpoint and are not route checkpoints.
  if (!finalEvent) {
    const snapshot = trip.checkpoint_snapshot;

    if (!Array.isArray(snapshot) || snapshot.length === 0) {
      throw new Error(
        "This trip has no saved route checkpoints. Please assign a valid route template before recording journey events."
      );
    }

    const validCheckpoints = snapshot.filter(
      (item: unknown): item is string =>
        typeof item === "string" && item.trim().length > 0
    );

    const requestedCheckpoint = normalizeCheckpoint(checkpoint);

    const checkpointExists = validCheckpoints.some(
      (savedCheckpoint: string) =>
        normalizeCheckpoint(savedCheckpoint) === requestedCheckpoint
    );

    if (!checkpointExists) {
      throw new Error(
        "This checkpoint does not exist in the selected route. Please create a new route template to accommodate it."
      );
    }
  }

  const checkpointToSave = finalEvent ? "FINAL" : checkpoint;

  const result = await db.query(
    `
    INSERT INTO trip_journey_events (
      tenant_id,
      trip_id,
      batch_id,
      checkpoint,
      event_type,
      location,
      occurred_at,
      notes,
      latitude,
      longitude,
      source
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4::varchar,
      $5::varchar,
      $6::varchar,
      $7::timestamp,
      $8::text,
      $9::numeric,
      $10::numeric,
      $11::varchar
    )
    RETURNING *
    `,
    [
      tenantId,
      tripId,
      trip.batch_id || null,
      checkpointToSave,
      input.event_type,
      input.location || null,
      input.occurred_at || new Date(),
      input.notes || null,
      input.latitude ?? null,
      input.longitude ?? null,
      input.source || "COMPANY_ADMIN"
    ]
  );

  return result.rows[0];
}
