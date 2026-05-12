-- Users: profile fields (first_name, last_name may already exist from migrate_reports_users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Reports: priority, comment, updated_at (if not exist)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Medium';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS comment TEXT DEFAULT '';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
UPDATE reports SET updated_at = created_at WHERE updated_at IS NULL;

-- Notifications for users
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  body TEXT DEFAULT '',
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at);
