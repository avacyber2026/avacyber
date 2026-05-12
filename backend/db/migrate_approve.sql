-- Add approved and rejection_comment to users
-- Run: psql -U secureconnect -d secureconnect -f backend/db/migrate_approve.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_comment TEXT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN ('End-User', 'Security Manager', 'GSOC', 'GRC', 'IAM', 'Pentesting', 'Admin')
);

-- Approve all existing users so they are not locked out; new registrations stay approved = false
UPDATE users SET approved = true;

-- To create an admin (run manually with your email):
-- UPDATE users SET role = 'Admin', approved = true WHERE email = 'admin@example.com';
