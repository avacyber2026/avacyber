CREATE TABLE IF NOT EXISTS siem_alert_comments (
  id         SERIAL PRIMARY KEY,
  alert_id   INTEGER NOT NULL REFERENCES siem_alerts(id) ON DELETE CASCADE,
  author     VARCHAR(255) NOT NULL,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siem_alert_comments_alert ON siem_alert_comments(alert_id);

-- Seed the Social Engineering - CreateSSOPasskey alert (idempotent)
INSERT INTO siem_alerts (rule_name, severity, status, description, ai_score, ai_summary)
SELECT
  'Social Engineering - CreateSSOPasskey',
  'high',
  'open',
  'The alert is searching for any instances of IPs or domains that are associated with social engineering techniques - creating fake pages for creation of SSOPasskey',
  87,
  'Active phishing campaign: lookalike domains hosting fake SSO Passkey enrollment pages detected. 3 users reached the pages, 2 submitted credentials. Immediate containment required.'
WHERE NOT EXISTS (
  SELECT 1 FROM siem_alerts WHERE rule_name = 'Social Engineering - CreateSSOPasskey'
);
