-- Files attached to SOC-created tickets (same pattern as report_attachments)
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  stored_name VARCHAR(512) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  mime VARCHAR(150),
  size_bytes INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
