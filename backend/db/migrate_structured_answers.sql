-- Structured answers: Activity Verification -> enum choice; Announcement -> acknowledged + reply
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS answer_type VARCHAR(50);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS answer_comment TEXT;
