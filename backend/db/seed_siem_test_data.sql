-- SIEM Test Data Seed
-- Run with: psql $DATABASE_URL -f seed_siem_test_data.sql

-- Sources
INSERT INTO siem_sources (name, type, description, enabled, last_seen, event_count) VALUES
  ('Windows DC01', 'windows_event_log', 'Primary domain controller', true, NOW() - INTERVAL '2 minutes', 14823),
  ('Firewall-Palo', 'firewall', 'Palo Alto perimeter firewall', true, NOW() - INTERVAL '1 minute', 98341),
  ('Linux Web01', 'syslog', 'Public-facing web server', true, NOW() - INTERVAL '5 minutes', 5021),
  ('CrowdStrike EDR', 'edr', 'Endpoint detection and response', true, NOW() - INTERVAL '3 minutes', 31200),
  ('VPN Gateway', 'vpn', 'Cisco AnyConnect VPN', true, NOW() - INTERVAL '10 minutes', 2104)
ON CONFLICT DO NOTHING;

-- Events
INSERT INTO siem_events (source_name, event_type, severity, source_ip, destination_ip, username, hostname, raw_log, tags) VALUES
  ('Windows DC01', 'auth_failure', 'medium', '192.168.1.105', '10.0.0.5', 'jsmith', 'WORKSTATION-14', 'Event ID 4625: Failed login for jsmith from 192.168.1.105', ARRAY['authentication','brute-force']),
  ('Windows DC01', 'auth_failure', 'medium', '192.168.1.105', '10.0.0.5', 'jsmith', 'WORKSTATION-14', 'Event ID 4625: Failed login for jsmith from 192.168.1.105', ARRAY['authentication','brute-force']),
  ('Windows DC01', 'auth_failure', 'medium', '192.168.1.105', '10.0.0.5', 'jsmith', 'WORKSTATION-14', 'Event ID 4625: Failed login for jsmith from 192.168.1.105', ARRAY['authentication','brute-force']),
  ('Windows DC01', 'auth_failure', 'medium', '192.168.1.105', '10.0.0.5', 'jsmith', 'WORKSTATION-14', 'Event ID 4625: Failed login for jsmith from 192.168.1.105', ARRAY['authentication','brute-force']),
  ('Windows DC01', 'auth_failure', 'high', '192.168.1.105', '10.0.0.5', 'jsmith', 'WORKSTATION-14', 'Event ID 4625: Failed login for jsmith from 192.168.1.105', ARRAY['authentication','brute-force']),
  ('Firewall-Palo', 'network_connection', 'critical', '10.0.1.88', '185.220.101.45', NULL, NULL, 'OUTBOUND DENY: 10.0.1.88 -> 185.220.101.45:443 (TOR exit node)', ARRAY['threat-intel','tor','exfiltration']),
  ('CrowdStrike EDR', 'process_create', 'high', '10.0.0.22', NULL, 'mwilliams', 'LAPTOP-22', 'powershell.exe -EncodedCommand SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQA -Bypass -NoProfile', ARRAY['powershell','suspicious','lolbas']),
  ('Linux Web01', 'auth_success', 'low', '203.0.113.42', '10.0.0.80', 'deploy', 'web01', 'SSH login accepted for deploy from 203.0.113.42 at 02:14:33', ARRAY['authentication','after-hours']),
  ('Windows DC01', 'user_created', 'high', '10.0.0.5', NULL, 'administrator', 'DC01', 'Event ID 4720: New user account AVA_SVC_ADMIN created with admin privileges', ARRAY['admin','privileged','user-management']),
  ('VPN Gateway', 'auth_success', 'low', '91.108.4.200', '10.0.0.1', 'rjones', 'VPN-GW', 'AnyConnect: rjones authenticated from 91.108.4.200 (Russia) at 23:47', ARRAY['vpn','geo-anomaly','after-hours']),
  ('Firewall-Palo', 'network_connection', 'medium', '10.0.1.33', '8.8.8.8', NULL, 'SERVER-03', 'DNS query volume spike: 10.0.1.33 made 847 DNS requests in 60 seconds', ARRAY['dns','c2','suspicious']),
  ('CrowdStrike EDR', 'file_write', 'medium', '10.0.0.55', NULL, 'bthomas', 'WORKSTATION-07', 'mimikatz.exe written to C:\\Users\\bthomas\\AppData\\Local\\Temp\\', ARRAY['credential-theft','mimikatz','malware'])
;

-- Alerts
INSERT INTO siem_alerts (rule_name, severity, status, source_ip, username, hostname, description, ai_score, ai_summary) VALUES
  ('Multiple Failed Logins', 'high', 'open', '192.168.1.105', 'jsmith', 'WORKSTATION-14',
   '5 failed login attempts for jsmith from 192.168.1.105 within 3 minutes.',
   87, 'High confidence brute-force attack. Same source IP targeting a single account repeatedly. Recommend blocking IP and forcing password reset for jsmith.'),

  ('Outbound to Threat Intel IP', 'critical', 'open', '10.0.1.88', NULL, NULL,
   'Host 10.0.1.88 attempted outbound connection to known TOR exit node 185.220.101.45.',
   96, 'Critical — outbound connection to a known TOR exit node suggests data exfiltration or C2 communication. Isolate host immediately and investigate running processes.'),

  ('Suspicious PowerShell Execution', 'high', 'investigating', '10.0.0.22', 'mwilliams', 'LAPTOP-22',
   'PowerShell launched with -EncodedCommand and -Bypass flags on LAPTOP-22.',
   91, 'Encoded PowerShell with bypass flags is a strong indicator of malicious activity or red team tooling. Decoded command suggests IEX download cradle — likely stage 2 payload download.'),

  ('Login Outside Business Hours', 'medium', 'open', '203.0.113.42', 'deploy', 'web01',
   'SSH login to web01 at 02:14 AM from external IP 203.0.113.42.',
   62, 'Moderate risk — after-hours login on a production web server from an unfamiliar external IP. Could be legitimate maintenance but warrants verification with the owner.'),

  ('New Privileged Account Created', 'high', 'open', '10.0.0.5', 'administrator', 'DC01',
   'New admin account AVA_SVC_ADMIN created on domain controller by administrator.',
   78, 'A new privileged service account was created directly on the DC. If this was not a planned change, it could indicate persistence by a threat actor. Verify with IT immediately.'),

  ('Login Outside Business Hours', 'medium', 'open', '91.108.4.200', 'rjones', 'VPN-GW',
   'VPN login by rjones at 11:47 PM from Russia (91.108.4.200).',
   74, 'Geo-anomalous VPN login outside business hours from Russia. If rjones is not travelling, this may indicate credential compromise. Recommend MFA challenge and account review.'),

  ('Multiple Failed Logins', 'critical', 'resolved', '10.0.0.55', 'bthomas', 'WORKSTATION-07',
   'Mimikatz binary written to disk on WORKSTATION-07 by user bthomas.',
   99, 'Critical credential theft tool detected. Mimikatz written to temp directory strongly indicates active credential harvesting. Isolate endpoint, rotate all credentials accessible from this machine.')
;
