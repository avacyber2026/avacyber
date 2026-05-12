-- Расширение reports для конвейера SIEM -> AI -> GSOC
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_email VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS hostname VARCHAR(255);

-- Текстовый pipeline_status вместо BOOLEAN status
ALTER TABLE reports ADD COLUMN IF NOT EXISTS pipeline_status VARCHAR(50) DEFAULT 'new';
UPDATE reports SET pipeline_status = CASE WHEN status = true THEN 'resolved' ELSE 'new' END
  WHERE pipeline_status = 'new' AND status = true;

-- SLA
ALTER TABLE reports ADD COLUMN IF NOT EXISTS sla_ack_deadline TIMESTAMP;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS sla_ack_at TIMESTAMP;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT FALSE;

-- SIEM
ALTER TABLE reports ADD COLUMN IF NOT EXISTS siem_incident_id VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS siem_incident_url TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS siem_assignee VARCHAR(255);

-- AI
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_result JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_category VARCHAR(100);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_is_sufficient BOOLEAN;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_reports_pipeline_status ON reports(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_reports_sla_breached ON reports(sla_breached);
