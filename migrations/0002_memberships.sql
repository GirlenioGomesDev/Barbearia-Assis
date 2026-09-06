CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  total_visits INTEGER NOT NULL CHECK (total_visits > 0),
  access_code TEXT NOT NULL,
  start_date TEXT NOT NULL,
  expires_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','finished','cancelled')) DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memberships_phone ON memberships(customer_phone);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_access ON memberships(customer_phone, access_code);

CREATE TABLE IF NOT EXISTS membership_usages (
  id TEXT PRIMARY KEY,
  membership_id TEXT NOT NULL,
  appointment_id TEXT,
  service_name TEXT NOT NULL,
  barber_name TEXT NOT NULL DEFAULT '',
  used_at TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_membership_usages_membership ON membership_usages(membership_id, used_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_usages_appointment ON membership_usages(appointment_id) WHERE appointment_id IS NOT NULL;
