-- Optional SIEM alert / correlation ID for Activity Verification incidents (SOC-created tickets)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS siem_alert_id VARCHAR(255) NULL;
