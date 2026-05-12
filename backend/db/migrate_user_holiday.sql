-- User holiday / out-of-office (persisted with profile)
ALTER TABLE users ADD COLUMN IF NOT EXISTS holiday_mode BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS holiday_until TEXT;
