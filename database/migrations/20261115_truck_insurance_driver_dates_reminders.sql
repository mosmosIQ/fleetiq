-- Driver joining / leaving dates
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS joining_date DATE,
  ADD COLUMN IF NOT EXISTS leaving_date DATE;

-- Truck insurance details (the insurance copy is stored in documents)
ALTER TABLE trucks
  ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS truck_id UUID REFERENCES trucks(id),
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);

-- One row per document, per expiry date, per day it was reminded.
-- This is what allows a reminder to be sent once every day (and only once per day).
CREATE TABLE IF NOT EXISTS expiry_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type VARCHAR(20) NOT NULL,
  entity_id UUID NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  expiry_date DATE NOT NULL,
  reminder_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, entity_type, entity_id, document_type, expiry_date, reminder_date)
);
