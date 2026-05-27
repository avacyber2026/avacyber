-- SIEM Demo Alerts seed (no E-string narratives — those are AI-generated on demand)

INSERT INTO siem_alerts
  (rule_name, severity, status, source_ip, username, hostname, description, ai_score, ai_summary, created_at)
VALUES

('Multiple Failed Logins', 'high', 'open', '192.168.1.105', 'jsmith', 'DC01',
 '6 failed login attempts for jsmith from 192.168.1.105 within 4 minutes, followed by a successful login.',
 89,
 'High confidence credential brute-force. Same source IP targeting a single account; succeeded on attempt 7. Recommend password reset for jsmith and block 192.168.1.105.',
 NOW() - INTERVAL '67 hours 50 minutes'),

('Suspicious PowerShell Execution', 'critical', 'investigating', '10.0.0.22', 'mwilliams', 'LAPTOP-22',
 'PowerShell with encoded command and -Bypass flags executed on LAPTOP-22, followed by LSASS memory dump (42.1 MB).',
 97,
 'Critical — encoded PowerShell download cradle followed by LSASS credential dump. Strong indicator of active compromise. Isolate LAPTOP-22 immediately.',
 NOW() - INTERVAL '54 hours 45 minutes'),

('Outbound to Threat Intel IP', 'critical', 'open', '10.0.1.88', NULL, NULL,
 'Host 10.0.1.88 beaconing to known TOR exit node 185.220.101.45 on port 443 and 9001 at 60-second intervals.',
 96,
 'Critical — consistent 60-second beaconing to a known TOR exit node. Strong C2 communication pattern. Isolate host immediately and block both IPs at the firewall.',
 NOW() - INTERVAL '47 hours 55 minutes'),

('Lateral Movement — SMB Spread', 'critical', 'open', '10.0.5.33', NULL, 'WORKSTATION-19',
 'Host 10.0.5.33 connected to 7 internal hosts via SMB within 5 minutes — ransomware or worm propagation pattern.',
 94,
 'Critical — rapid SMB spread to 7 unique internal hosts in 5 minutes matches ransomware lateral movement. Isolate 10.0.5.33 and activate incident response.',
 NOW() - INTERVAL '41 hours 53 minutes'),

('Impossible Travel Detected', 'high', 'open', '91.108.4.200', 'rjones', 'VPN-GW',
 'rjones authenticated from London (UK) at 08:12 and from Moscow (RU) 2h 14m later — physically impossible travel.',
 85,
 'High confidence account compromise. rjones cannot travel from London to Moscow in 2h 14m. Suspend VPN access and force password reset pending investigation.',
 NOW() - INTERVAL '35 hours 44 minutes'),

('Cloud Privilege Escalation', 'critical', 'open', '203.0.113.99', 'sarah.smith', 'N/A',
 'sarah.smith created a new IAM user with AdministratorAccess, then accessed 847 S3 objects and exfiltrated 1.8GB to an external bucket.',
 98,
 'Critical — full AWS privilege escalation chain with confirmed 1.8GB data exfiltration to external S3 bucket. Revoke sarah.smith credentials and delete the backdoor IAM user immediately.',
 NOW() - INTERVAL '29 hours 28 minutes'),

('Malware Dropper on Web Server', 'high', 'open', '203.0.113.42', 'deploy', 'web01',
 'After-hours SSH login to web01, followed by a curl pipe-to-bash execution and dropped ELF binary in /tmp.',
 88,
 'High confidence malware staging on production web server. ELF binary dropped via remote download cradle under the deploy account. Rotate SSH keys and check for persistence.',
 NOW() - INTERVAL '24 hours 48 minutes'),

('Insider Threat — USB Data Exfiltration', 'high', 'open', '10.0.0.55', 'bthomas', 'WORKSTATION-07',
 'bthomas accessed 312 financial files from the file server and transferred 4.2GB to a USB device.',
 76,
 'Moderate-high confidence insider threat. Mass file access from Finance share followed by large USB transfer. Initiate discreet HR/legal review before contacting the employee.',
 NOW() - INTERVAL '21 hours 43 minutes'),

('New Privileged Account Created', 'high', 'open', '10.0.0.5', 'administrator', 'DC01',
 'New domain admin account AVA_SVC_ADMIN created on DC01 and added to Domain Admins group outside of change window.',
 81,
 'High risk — new domain admin account created outside change window. If unauthorized, this is attacker persistence. Verify with IT and disable immediately if not approved.',
 NOW() - INTERVAL '17 hours 53 minutes'),

('DNS C2 Beacon', 'high', 'open', '10.0.1.33', NULL, 'SERVER-03',
 'SERVER-03 making DNS requests to update-cdn-assets[.]xyz at precise 60-second intervals — consistent C2 beacon.',
 83,
 'High confidence DNS-based C2 beacon. Regular 60-second interval to a suspicious recently-registered domain. Isolate SERVER-03 and block the domain at DNS resolver and firewall.',
 NOW() - INTERVAL '14 hours 57 minutes'),

('Web Application Brute Force', 'medium', 'open', '45.33.32.156', NULL, 'web01',
 'External IP 45.33.32.156 made 43 failed login attempts against the web API before a successful authentication.',
 71,
 'Automated brute force against the web application API succeeded after 43 attempts. Investigate what was accessed post-login and block 45.33.32.156.',
 NOW() - INTERVAL '11 hours 38 minutes'),

('Login Outside Business Hours', 'medium', 'resolved', '91.108.4.200', 'contractor01', 'VPN-GW',
 'Contractor account logged in via VPN at 11:45 PM on a Saturday from an IP in Eastern Europe.',
 45,
 'Low-moderate risk — contractor after-hours VPN access. No suspicious activity detected post-login. Verified with contractor as legitimate remote work session.',
 NOW() - INTERVAL '48 hours');
