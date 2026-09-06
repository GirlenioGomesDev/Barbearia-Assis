CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  barber_id TEXT NOT NULL,
  barber_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);

CREATE TABLE IF NOT EXISTS blocked_slots (
  id TEXT PRIMARY KEY,
  barber_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_barber_date ON blocked_slots(barber_id, date);

CREATE TABLE IF NOT EXISTS booking_slots (
  barber_id TEXT NOT NULL,
  date TEXT NOT NULL,
  slot TEXT NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('appointment','block')),
  owner_id TEXT NOT NULL,
  PRIMARY KEY (barber_id, date, slot)
);

CREATE INDEX IF NOT EXISTS idx_booking_slots_owner ON booking_slots(owner_type, owner_id);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
