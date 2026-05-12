-- Связь уведомлений с тикетами и репортами (история + ссылки в UI)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ticket_id INTEGER NULL REFERENCES tickets(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS report_id VARCHAR(50) NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_ticket_id ON notifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_report_id ON notifications(report_id);
