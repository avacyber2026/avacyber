-- Step 1: Delete duplicate seeded tickets, keep only the latest batch (904865-904888)
DELETE FROM tickets
WHERE type IN ('User Report','Activity Verification','Security Announcement','Policy Notification','Investigation','Vulnerability Coordination')
  AND id NOT IN (
    SELECT MAX(id) FROM tickets
    WHERE type IN ('User Report','Activity Verification','Security Announcement','Policy Notification','Investigation','Vulnerability Coordination')
    GROUP BY title, type
  );

-- Step 2: Resolve selected tickets in each tab (keep 3 open per tab)

-- From Users: resolve 4, keep 3 open
UPDATE tickets SET status = 'Resolved', answer = 'Confirmed scam. User did not comply with the request. Awareness training completed. Ticket closed.', answer_type = 'Resolved'
WHERE title = 'Received WhatsApp messages from CEO' AND type = 'User Report';

UPDATE tickets SET status = 'Resolved', answer = 'Malware scan completed. Threat quarantined and removed. USB device isolated. User educated on removable media policy. System confirmed clean.', answer_type = 'Resolved'
WHERE title = 'Unknown USB device used' AND type = 'User Report';

UPDATE tickets SET status = 'Resolved', answer = 'Investigation complete. CMD window was triggered by a legitimate Windows Update scheduled task. No malicious activity detected. Closed.', answer_type = 'Resolved'
WHERE title = 'CMD window appearing in background' AND type = 'User Report';

UPDATE tickets SET status = 'Resolved', answer = 'File reviewed — no sensitive PII or confidential data included. External partner confirmed secure handling. No further action required.', answer_type = 'Resolved'
WHERE title = 'Accidentally sent sensitive file externally' AND type = 'User Report';

-- To Users: resolve 1, keep 3 open
UPDATE tickets SET status = 'Resolved', answer = 'All affected parties notified. Financial transactions suspended and verified through alternative channels. Customer confirmed account secured. Normal operations resumed.', answer_type = 'Resolved'
WHERE title = 'Compromised customer email account' AND type = 'Security Announcement';

-- GRC: resolve 1, keep 3 open
UPDATE tickets SET status = 'Resolved', answer = 'Policy violation confirmed. User received formal warning and completed mandatory data handling training. Case documented in compliance register. GRC acknowledged.', answer_type = 'Resolved'
WHERE title = 'Use of personal email for company documents' AND type = 'Policy Notification';

-- Pentesting: resolve 1, keep 3 open
UPDATE tickets SET status = 'Resolved', answer = 'Confirmed genuine incident — not authorised red team activity. Host isolated, forensic image taken. Metasploit components removed and eradicated. Full incident report filed.', answer_type = 'Resolved'
WHERE title = 'Unauthorized use of exploitation framework detected' AND type = 'Investigation';

-- Vuln Mgmt: resolve 2, keep 3 open
UPDATE tickets SET status = 'Resolved', answer = 'All Fortinet VPN appliances patched to firmware 7.2.5. CVE-2023-27997 remediated across all affected devices. Patch verification scan completed successfully.', answer_type = 'Resolved'
WHERE title = 'Critical vulnerability in Fortinet VPN appliances' AND type = 'Vulnerability Coordination';

UPDATE tickets SET status = 'Resolved', answer = 'All ESXi hosts updated to version 8.0 Update 2. CVE-2023-20867 remediated across all hypervisors. Verification scan completed and signed off by infrastructure team.', answer_type = 'Resolved'
WHERE title = 'VMware ESXi vulnerability requiring patching' AND type = 'Vulnerability Coordination';
