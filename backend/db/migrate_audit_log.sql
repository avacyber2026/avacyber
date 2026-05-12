-- Audit log for XLSX exports
CREATE TABLE IF NOT EXISTS export_audit_log (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  export_type VARCHAR(50) NOT NULL,
  date_from TIMESTAMP,
  date_to TIMESTAMP,
  row_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
