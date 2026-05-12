-- Время инцидента (обязательное для прохождения в очередь GSOC) и явное время закрытия
ALTER TABLE reports ADD COLUMN IF NOT EXISTS incident_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Прямой руководитель (email) — для уведомлений SLA и ответов по тикетам
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_manager_email ON users(manager_email) WHERE manager_email IS NOT NULL;
