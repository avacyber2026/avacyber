-- AI prompt/response log (90-day retention, cleaned by cron)
CREATE TABLE IF NOT EXISTS ai_prompt_log (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(50) REFERENCES reports(id),
  prompt_hash VARCHAR(64) NOT NULL,
  prompt_version VARCHAR(20),
  response_json JSONB,
  model_name VARCHAR(100),
  latency_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_log_created ON ai_prompt_log(created_at);
