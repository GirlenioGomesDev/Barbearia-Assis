CREATE TABLE IF NOT EXISTS appointment_access (
  appointment_id TEXT PRIMARY KEY,
  access_code TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appointment_access_code ON appointment_access(access_code);
