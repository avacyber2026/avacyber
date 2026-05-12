-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('End-User', 'Security Manager', 'GSOC', 'GRC', 'IAM', 'Pentesting', 'Admin')),
  approved BOOLEAN NOT NULL DEFAULT false,
  rejection_comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets (Requests) table
-- created_by = analyst who created, assigned_to = end-user who receives
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  text TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'New',
  priority VARCHAR(50) DEFAULT 'Medium',
  created_by VARCHAR(255) NOT NULL,
  assigned_to VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  answer TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(50) PRIMARY KEY,
  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  from_user VARCHAR(255) NOT NULL,
  status BOOLEAN DEFAULT FALSE,
  answer_user VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Комментарии / пост-мортемы к инциденту (тикету)
CREATE TABLE IF NOT EXISTS ticket_timeline_entries (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_email VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_timeline_ticket ON ticket_timeline_entries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_timeline_created ON ticket_timeline_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_from_user ON reports(from_user);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
