CREATE TABLE IF NOT EXISTS siem_alert_actions (
  id                     SERIAL PRIMARY KEY,
  alert_id               INTEGER NOT NULL REFERENCES siem_alerts(id) ON DELETE CASCADE,
  analyst_email          VARCHAR(255) NOT NULL,
  analyst_name           VARCHAR(255),
  resolution_type        VARCHAR(50) NOT NULL DEFAULT 'true_positive',
  notes                  TEXT,
  time_to_action_minutes INTEGER,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qa_reviews (
  id               SERIAL PRIMARY KEY,
  alert_id         INTEGER NOT NULL REFERENCES siem_alerts(id) ON DELETE CASCADE,
  action_id        INTEGER REFERENCES siem_alert_actions(id) ON DELETE SET NULL,
  analyst_email    VARCHAR(255) NOT NULL,
  ai_verdict       VARCHAR(20)  NOT NULL DEFAULT 'pass',
  ai_score         INTEGER,
  ai_findings      JSONB        DEFAULT '[]',
  ai_summary       TEXT,
  manager_decision VARCHAR(20),
  manager_email    VARCHAR(255),
  manager_notes    TEXT,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siem_alert_actions_alert  ON siem_alert_actions(alert_id);
CREATE INDEX IF NOT EXISTS idx_qa_reviews_analyst        ON qa_reviews(analyst_email);
CREATE INDEX IF NOT EXISTS idx_qa_reviews_verdict        ON qa_reviews(ai_verdict);
CREATE INDEX IF NOT EXISTS idx_qa_reviews_manager        ON qa_reviews(manager_decision);
