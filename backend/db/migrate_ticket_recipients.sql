-- Мультиполучатели для Security Announcement (один тикет -> N пользователей)
CREATE TABLE IF NOT EXISTS ticket_recipients (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  acknowledged_at TIMESTAMP,
  reply_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ticket_id, user_email)
);
CREATE INDEX IF NOT EXISTS idx_ticket_recipients_ticket ON ticket_recipients(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_recipients_email ON ticket_recipients(user_email);
