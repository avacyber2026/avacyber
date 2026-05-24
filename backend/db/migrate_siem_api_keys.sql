-- Client API keys for external log ingestion
CREATE TABLE IF NOT EXISTS siem_api_keys (
  id SERIAL PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  api_key VARCHAR(64) NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  event_count BIGINT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siem_api_keys_key ON siem_api_keys(api_key);

-- Add tenant tracking to events (non-destructive, nullable)
ALTER TABLE siem_events ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE siem_alerts ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
