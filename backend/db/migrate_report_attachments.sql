-- Attachments for incident reports (user-submitted files)
CREATE TABLE IF NOT EXISTS report_attachments (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(50) NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  stored_name VARCHAR(512) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  mime VARCHAR(150),
  size_bytes INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_report_attachments_report_id ON report_attachments(report_id);
