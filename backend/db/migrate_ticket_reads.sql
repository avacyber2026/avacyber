CREATE TABLE IF NOT EXISTS ticket_reads (
  ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ticket_id, user_email)
);
