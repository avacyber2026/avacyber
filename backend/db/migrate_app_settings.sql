-- App settings (key-value) for admin-configurable values
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default on-call phone number
INSERT INTO app_settings (key, value) VALUES ('on_call_phone', '+1234567890')
ON CONFLICT (key) DO NOTHING;
