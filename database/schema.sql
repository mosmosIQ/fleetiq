CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(150) NOT NULL,
  company_code VARCHAR(10) NOT NULL UNIQUE,
  contact_email VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  address TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  communication_mode VARCHAR(50) NOT NULL DEFAULT 'SMS_PRIMARY',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  truck_limit INT NOT NULL,
  driver_limit INT NOT NULL,
  company_admin_limit INT NOT NULL,
  sms_monthly_limit INT NOT NULL,
  whatsapp_monthly_limit INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(50) NOT NULL,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  grace_period_ends_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'COMPANY_ADMIN')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  plate_number VARCHAR(50) NOT NULL,
  truck_type VARCHAR(100),
  capacity VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, plate_number)
);

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  full_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(30) NOT NULL,
  license_number VARCHAR(100),
  license_expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, phone_number)
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  trip_number INT NOT NULL,
  public_trip_code VARCHAR(50) NOT NULL UNIQUE,
  truck_id UUID NOT NULL REFERENCES trucks(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  route_from VARCHAR(150) NOT NULL,
  route_to VARCHAR(150) NOT NULL,
  cargo_description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED',
  planned_start_at TIMESTAMP,
  expected_arrival_at TIMESTAMP,
  started_at TIMESTAMP,
  on_route_at TIMESTAMP,
  arrived_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, trip_number)
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  truck_id UUID REFERENCES trucks(id),
  driver_id UUID REFERENCES drivers(id),
  document_type VARCHAR(100) NOT NULL,
  file_url TEXT,
  expiry_date DATE,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  trip_id UUID REFERENCES trips(id),
  driver_id UUID REFERENCES drivers(id),
  provider_message_id VARCHAR(255),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  phone_number VARCHAR(30) NOT NULL,
  message_text TEXT NOT NULL,
  provider VARCHAR(50) DEFAULT 'BEEM',
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  trip_id UUID REFERENCES trips(id),
  driver_id UUID REFERENCES drivers(id),
  provider_message_id VARCHAR(255),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  phone_number VARCHAR(30) NOT NULL,
  message_text TEXT NOT NULL,
  provider VARCHAR(50),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  trip_id UUID NOT NULL REFERENCES trips(id),
  truck_id UUID REFERENCES trucks(id),
  driver_id UUID REFERENCES drivers(id),
  status VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  raw_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  month VARCHAR(7) NOT NULL,
  sms_sent INT DEFAULT 0,
  whatsapp_sent INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, month)
);

CREATE TABLE IF NOT EXISTS message_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sms_extra INT DEFAULT 0,
  whatsapp_extra INT DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  trip_id UUID REFERENCES trips(id),
  truck_id UUID REFERENCES trucks(id),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by_user_id UUID REFERENCES users(id),
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(150) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
