-- Fleet units: each truck can have one linked (default) trailer and driver.
ALTER TABLE trucks
  ADD COLUMN IF NOT EXISTS assigned_trailer_id UUID REFERENCES trailers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL;

-- Driver documents: remember the uploaded file's original name.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);

-- One-time backfill so existing trucks keep their familiar trailer/driver pairing:
-- each truck takes the trailer/driver from its most recent trip, and a trailer
-- or driver is only linked to the one truck that used it most recently.
WITH latest AS (
  SELECT DISTINCT ON (t.truck_id)
    t.truck_id, t.trailer_id, t.driver_id, t.created_at
  FROM trips t
  ORDER BY t.truck_id, t.created_at DESC
),
trailer_pick AS (
  SELECT DISTINCT ON (trailer_id) truck_id, trailer_id
  FROM latest
  WHERE trailer_id IS NOT NULL
  ORDER BY trailer_id, created_at DESC
),
driver_pick AS (
  SELECT DISTINCT ON (driver_id) truck_id, driver_id
  FROM latest
  WHERE driver_id IS NOT NULL
  ORDER BY driver_id, created_at DESC
)
UPDATE trucks tr
SET
  assigned_trailer_id = COALESCE(tr.assigned_trailer_id, (SELECT trailer_id FROM trailer_pick tp WHERE tp.truck_id = tr.id)),
  assigned_driver_id  = COALESCE(tr.assigned_driver_id,  (SELECT driver_id  FROM driver_pick dp  WHERE dp.truck_id = tr.id));
