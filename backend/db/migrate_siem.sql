-- SIEM: Log sources
CREATE TABLE IF NOT EXISTS siem_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ,
  event_count BIGINT DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SIEM: Raw ingested events
CREATE TABLE IF NOT EXISTS siem_events (
  id BIGSERIAL PRIMARY KEY,
  source_id INT REFERENCES siem_sources(id) ON DELETE SET NULL,
  source_name VARCHAR(255),
  event_type VARCHAR(100) DEFAULT 'generic',
  severity VARCHAR(20) DEFAULT 'info',
  source_ip VARCHAR(100),
  destination_ip VARCHAR(100),
  username VARCHAR(255),
  hostname VARCHAR(255),
  raw_log TEXT,
  normalized JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);

-- SIEM: Detection rules
CREATE TABLE IF NOT EXISTS siem_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logic JSONB NOT NULL DEFAULT '{}',
  sigma_yaml TEXT,
  severity VARCHAR(20) DEFAULT 'medium',
  enabled BOOLEAN DEFAULT true,
  ai_generated BOOLEAN DEFAULT false,
  created_by VARCHAR(255),
  hit_count INT DEFAULT 0,
  false_positive_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SIEM: Alerts
CREATE TABLE IF NOT EXISTS siem_alerts (
  id SERIAL PRIMARY KEY,
  rule_id INT REFERENCES siem_rules(id) ON DELETE SET NULL,
  rule_name VARCHAR(255),
  event_id BIGINT REFERENCES siem_events(id) ON DELETE SET NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',
  source_ip VARCHAR(100),
  username VARCHAR(255),
  hostname VARCHAR(255),
  description TEXT,
  ai_score INT,
  ai_summary TEXT,
  ai_narrative TEXT,
  assigned_to VARCHAR(255),
  ticket_id INT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default detection rules
INSERT INTO siem_rules (name, description, logic, severity, enabled, ai_generated)
VALUES
  (
    'Multiple Failed Logins',
    'Detects 5+ failed login attempts from the same IP within 5 minutes — possible brute force.',
    '{"type":"threshold","field":"event_type","value":"auth_failure","threshold":5,"window_minutes":5}',
    'high', true, false
  ),
  (
    'Login Outside Business Hours',
    'Detects successful logins between 10pm and 6am local time.',
    '{"type":"time_range","event_type":"auth_success","outside_hours":{"start":"06:00","end":"22:00"}}',
    'medium', true, false
  ),
  (
    'Large Data Transfer',
    'Detects outbound transfer exceeding 500MB in a single session — possible exfiltration.',
    '{"type":"threshold","field":"bytes_out","threshold":524288000}',
    'high', true, false
  ),
  (
    'New Privileged Account Created',
    'Detects creation of a new admin or privileged user account.',
    '{"type":"pattern","event_type":"user_created","tags":["admin","privileged"]}',
    'high', true, false
  ),
  (
    'Outbound to Threat Intel IP',
    'Detects outbound connection to an IP on known threat intelligence blocklists.',
    '{"type":"threat_intel","direction":"outbound"}',
    'critical', true, false
  ),
  (
    'Lateral Movement — SMB Spread',
    'Detects a single host connecting to 5+ internal hosts via SMB within 10 minutes.',
    '{"type":"threshold","field":"smb_connections","threshold":5,"window_minutes":10,"internal_only":true}',
    'critical', true, false
  ),
  (
    'Suspicious PowerShell Execution',
    'Detects PowerShell launched with encoded command or bypass flags.',
    '{"type":"pattern","event_type":"process_create","process":"powershell.exe","args_contains":["-EncodedCommand","-Bypass","-NoProfile"]}',
    'high', true, false
  )
ON CONFLICT DO NOTHING;
