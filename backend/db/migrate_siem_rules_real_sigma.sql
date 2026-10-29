-- Real Sigma rules, SPL, and KQL for all default SIEM detection rules

UPDATE siem_rules SET
  sigma_yaml = $sigma$title: Multiple Failed Login Attempts — Brute Force
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
status: production
description: Detects 5 or more failed authentication events originating from the same source IP within a 5-minute window, indicating a brute force or credential stuffing attack.
author: AVA Cyber SOC
date: 2026/01/15
modified: 2026/09/22
references:
    - https://attack.mitre.org/techniques/T1110/
    - https://attack.mitre.org/techniques/T1110/001/
tags:
    - attack.credential_access
    - attack.t1110
    - attack.t1110.001
logsource:
    category: authentication
    product: generic
detection:
    selection:
        event_type: 'auth_failure'
    timeframe: 5m
    condition: selection | count() by source_ip > 5
fields:
    - source_ip
    - username
    - hostname
    - destination_ip
falsepositives:
    - Misconfigured application retrying authentication in a loop
    - Expired service account credentials causing repeated failures
    - Password manager bulk-testing credentials
level: high$sigma$,
  spl = $spl$index=* sourcetype=siem event_type="auth_failure" earliest=-5m
| stats count AS failure_count by source_ip
| where failure_count >= 5
| sort -failure_count
| eval risk_score=case(failure_count >= 20, "critical", failure_count >= 10, "high", failure_count >= 5, "medium", true(), "low")
| table source_ip, failure_count, risk_score$spl$,
  kql = $kql$SiemEvents
| where event_type == "auth_failure"
    and ingested_at > ago(5m)
| summarize failure_count = count() by source_ip
| where failure_count >= 5
| extend risk_score = case(failure_count >= 20, "critical",
                           failure_count >= 10, "high",
                           "medium")
| order by failure_count desc$kql$,
  logic = '{"type":"threshold","field":"event_type","value":"auth_failure","group_by":"source_ip","threshold":5,"window_minutes":5,"description":"Count auth_failure events per source_ip; fire if count exceeds 5 within window"}'
WHERE name = 'Multiple Failed Logins';

UPDATE siem_rules SET
  sigma_yaml = $sigma$title: Successful Authentication Outside Business Hours
id: b2c3d4e5-f6a7-8901-bcde-f12345678901
status: production
description: Detects successful authentication events occurring between 22:00 and 06:00 UTC. Access outside core business hours may indicate compromised credentials, insider threat activity, or an attacker exploiting a harvested session.
author: AVA Cyber SOC
date: 2026/01/15
modified: 2026/09/22
references:
    - https://attack.mitre.org/techniques/T1078/
tags:
    - attack.initial_access
    - attack.persistence
    - attack.t1078
    - attack.t1078.004
logsource:
    category: authentication
    product: generic
detection:
    selection:
        event_type: 'auth_success'
    filter_after_hours:
        timestamp|after_hour: 22
    filter_before_hours:
        timestamp|before_hour: 6
    filter_exclude_service_accounts:
        username|endswith:
            - '-svc'
            - '-sa'
            - '@serviceaccount'
    condition: selection and (filter_after_hours or filter_before_hours) and not filter_exclude_service_accounts
fields:
    - username
    - source_ip
    - hostname
    - timestamp
falsepositives:
    - On-call engineers responding to incidents
    - Users working across international time zones
    - Automated deployment pipelines running overnight
    - Scheduled maintenance windows
level: medium$sigma$,
  spl = $spl$index=* sourcetype=siem event_type="auth_success"
| eval hour=strftime("%H", _time)
| where hour >= "22" OR hour < "06"
| where NOT match(username, "(-svc|-sa|@serviceaccount)$")
| stats count AS login_count by username, source_ip, hour
| sort -login_count
| table username, source_ip, hour, login_count$spl$,
  kql = $kql$SiemEvents
| where event_type == "auth_success"
    and (hourofday(ingested_at) >= 22 or hourofday(ingested_at) < 6)
    and username !endswith "-svc"
    and username !endswith "-sa"
| project ingested_at, username, source_ip, hostname
| order by ingested_at desc$kql$,
  logic = '{"type":"time_range","event_type":"auth_success","outside_hours":{"start":"06:00","end":"22:00"},"exclude_patterns":["*-svc","*-sa"]}'
WHERE name = 'Login Outside Business Hours';

UPDATE siem_rules SET
  sigma_yaml = $sigma$title: Large Outbound Data Transfer — Potential Exfiltration
id: c3d4e5f6-a7b8-9012-cdef-123456789012
status: production
description: Detects outbound network sessions transferring more than 500 MB of data in a single connection. Unusually large data volumes to external destinations are a primary indicator of data exfiltration via web protocols, cloud storage, or direct TCP transfer.
author: AVA Cyber SOC
date: 2026/01/15
modified: 2026/09/22
references:
    - https://attack.mitre.org/techniques/T1048/
    - https://attack.mitre.org/techniques/T1048/003/
    - https://attack.mitre.org/techniques/T1041/
tags:
    - attack.exfiltration
    - attack.t1048
    - attack.t1048.003
    - attack.t1041
logsource:
    category: network_connection
    product: generic
detection:
    selection:
        event_type: 'network_connection'
        direction: 'outbound'
        bytes_out|gt: 524288000
    filter_known_backup:
        destination_ip|cidr:
            - '10.0.0.0/8'
            - '172.16.0.0/12'
            - '192.168.0.0/16'
    condition: selection and not filter_known_backup
fields:
    - source_ip
    - destination_ip
    - bytes_out
    - username
    - hostname
    - destination_port
falsepositives:
    - Scheduled cloud backups (AWS S3, Azure Blob, GCS)
    - Large software update distribution
    - Video conferencing recording uploads
    - CI/CD artifact publishing pipelines
level: high$sigma$,
  spl = $spl$index=* sourcetype=siem event_type="network_connection" direction="outbound"
| where bytes_out > 524288000
| where NOT cidrmatch("10.0.0.0/8", destination_ip)
    AND NOT cidrmatch("172.16.0.0/12", destination_ip)
    AND NOT cidrmatch("192.168.0.0/16", destination_ip)
| eval bytes_out_mb=round(bytes_out / 1048576, 2)
| sort -bytes_out_mb
| table _time, source_ip, destination_ip, destination_port, bytes_out_mb, hostname, username$spl$,
  kql = $kql$SiemEvents
| where event_type == "network_connection"
    and raw_log contains "outbound"
    and ingested_at > ago(24h)
| extend bytes_out = toint(extract("bytes_out=(\\d+)", 1, raw_log))
| where bytes_out > 524288000
| extend bytes_out_mb = round(todouble(bytes_out) / 1048576, 2)
| project ingested_at, source_ip, destination_ip, bytes_out_mb, hostname, username
| order by bytes_out_mb desc$kql$,
  logic = '{"type":"threshold","field":"bytes_out","threshold":524288000,"direction":"outbound","exclude_private_ranges":true}'
WHERE name = 'Large Data Transfer';

UPDATE siem_rules SET
  sigma_yaml = $sigma$title: New Privileged Account Created
id: d4e5f6a7-b8c9-0123-defa-234567890123
status: production
description: Detects the creation of a new user account with administrator, privileged, or elevated role membership. Unauthorised privileged account creation is a key persistence and privilege escalation technique used by both external threat actors and malicious insiders.
author: AVA Cyber SOC
date: 2026/01/15
modified: 2026/09/22
references:
    - https://attack.mitre.org/techniques/T1136/
    - https://attack.mitre.org/techniques/T1136/001/
    - https://attack.mitre.org/techniques/T1098/
tags:
    - attack.persistence
    - attack.privilege_escalation
    - attack.t1136
    - attack.t1136.001
    - attack.t1098
logsource:
    category: authentication
    product: generic
detection:
    selection:
        event_type: 'user_created'
    filter_privileged:
        tags|contains:
            - 'admin'
            - 'administrator'
            - 'privileged'
            - 'sudo'
            - 'root'
            - 'domain_admin'
    filter_legitimate_provisioning:
        source_ip|cidr:
            - '10.0.0.0/8'
    condition: selection and filter_privileged
fields:
    - username
    - source_ip
    - hostname
    - timestamp
falsepositives:
    - Legitimate provisioning via approved change management request
    - Automated service account creation during application deployments
    - HR onboarding workflows for new IT staff
level: high$sigma$,
  spl = $spl$index=* sourcetype=siem event_type="user_created"
| where tags="admin" OR tags="privileged" OR tags="administrator" OR tags="domain_admin"
| stats count AS accounts_created by source_ip, username
| eval alert_reason="Privileged account created outside provisioning system"
| sort -accounts_created
| table _time, username, source_ip, hostname, tags, alert_reason$spl$,
  kql = $kql$SiemEvents
| where event_type == "user_created"
    and (tags has "admin" or tags has "privileged" or tags has "administrator")
| project ingested_at, username, source_ip, hostname
| order by ingested_at desc$kql$,
  logic = '{"type":"pattern","event_type":"user_created","tags_contains_any":["admin","privileged","administrator","sudo","domain_admin"]}'
WHERE name = 'New Privileged Account Created';

UPDATE siem_rules SET
  sigma_yaml = $sigma$title: Outbound Connection to Known Threat Intelligence IP
id: e5f6a7b8-c9d0-1234-efab-345678901234
status: production
description: Detects outbound network connections to IP addresses present on configured threat intelligence blocklists (AbuseIPDB score >= 80, Emerging Threats Blocklist, Spamhaus DROP/EDROP, or custom IOC feeds). Connections to known malicious IPs indicate possible C2 beaconing, malware callback, or active data exfiltration.
author: AVA Cyber SOC
date: 2026/01/15
modified: 2026/09/22
references:
    - https://attack.mitre.org/techniques/T1071/
    - https://attack.mitre.org/techniques/T1071/001/
    - https://attack.mitre.org/techniques/T1041/
    - https://attack.mitre.org/techniques/T1095/
tags:
    - attack.command_and_control
    - attack.exfiltration
    - attack.t1071
    - attack.t1071.001
    - attack.t1041
    - attack.t1095
logsource:
    category: network_connection
    product: generic
detection:
    selection:
        event_type: 'network_connection'
        direction: 'outbound'
        threat_intel_match: true
    condition: selection
fields:
    - source_ip
    - destination_ip
    - destination_port
    - hostname
    - username
    - threat_intel_feed
    - threat_intel_score
falsepositives:
    - Stale or inaccurate threat intel feed entries
    - Shared hosting IPs used by both malicious and legitimate services
    - Newly re-assigned IP space not yet cleaned from blocklists
level: critical$sigma$,
  spl = $spl$index=* sourcetype=siem event_type="network_connection" direction="outbound"
| lookup threat_intel_ips.csv destination_ip AS destination_ip OUTPUT threat_intel_feed, abuse_score
| where isnotnull(threat_intel_feed)
| eval risk=case(abuse_score >= 90, "critical", abuse_score >= 70, "high", true(), "medium")
| sort -abuse_score
| table _time, source_ip, destination_ip, destination_port, hostname, threat_intel_feed, abuse_score, risk$spl$,
  kql = $kql$let ThreatIntelIPs = externaldata(ip: string, feed: string, score: int)
    [@"https://threat-intel.ava-cyber.com/blocklist.csv"]
    with (format="csv", ignoreFirstRecord=true);
SiemEvents
| where event_type == "network_connection"
| lookup kind=inner ThreatIntelIPs on $left.destination_ip == $right.ip
| extend risk = case(score >= 90, "critical", score >= 70, "high", "medium")
| project ingested_at, source_ip, destination_ip, destination_port, hostname, feed, score, risk
| order by score desc$kql$,
  logic = '{"type":"threat_intel_lookup","direction":"outbound","feeds":["abuseipdb","emerging_threats","spamhaus_drop"],"threshold_score":80}'
WHERE name = 'Outbound to Threat Intel IP';

UPDATE siem_rules SET
  sigma_yaml = $sigma$title: Lateral Movement via SMB — Multiple Internal Hosts
id: f6a7b8c9-d0e1-2345-fabc-456789012345
status: production
description: Detects a single source host establishing SMB (port 445) or NetBIOS (port 139) connections to 5 or more distinct internal hosts within a 10-minute window. This pattern is consistent with lateral movement tools such as PsExec, WMIExec, CrackMapExec, Impacket, or ransomware propagation using SMB spreader modules (e.g. WannaCry EternalBlue, NotPetya).
author: AVA Cyber SOC
date: 2026/01/15
modified: 2026/09/22
references:
    - https://attack.mitre.org/techniques/T1021/002/
    - https://attack.mitre.org/techniques/T1570/
    - https://attack.mitre.org/techniques/T1135/
tags:
    - attack.lateral_movement
    - attack.t1021
    - attack.t1021.002
    - attack.t1570
    - attack.t1135
logsource:
    category: network_connection
    product: generic
detection:
    selection:
        event_type: 'network_connection'
        destination_port:
            - 445
            - 139
        destination_ip|is_private: true
    filter_expected_dc:
        source_ip|cidr:
            - '10.0.1.0/24'
    timeframe: 10m
    condition: selection and not filter_expected_dc | count(destination_ip) by source_ip > 5
fields:
    - source_ip
    - hostname
    - username
falsepositives:
    - Domain controllers during Group Policy refresh cycles
    - Backup agents (e.g. Veeam, Commvault) scanning network shares
    - IT management tools (PDQ Deploy, Ansible, SCCM)
    - Vulnerability scanners (Nessus, Qualys) during scheduled scans
level: critical$sigma$,
  spl = $spl$index=* sourcetype=siem event_type="network_connection" (destination_port=445 OR destination_port=139) earliest=-10m
| where cidrmatch("10.0.0.0/8", destination_ip)
    OR cidrmatch("172.16.0.0/12", destination_ip)
    OR cidrmatch("192.168.0.0/16", destination_ip)
| stats dc(destination_ip) AS unique_hosts, values(destination_ip) AS hosts_reached by source_ip, hostname
| where unique_hosts >= 5
| eval severity=case(unique_hosts >= 20, "critical", unique_hosts >= 10, "high", true(), "medium")
| sort -unique_hosts
| table source_ip, hostname, unique_hosts, hosts_reached, severity$spl$,
  kql = $kql$SiemEvents
| where event_type == "network_connection"
    and (destination_port == 445 or destination_port == 139)
    and ingested_at > ago(10m)
    and (ipv4_is_private(destination_ip) == true)
| summarize
    unique_hosts = dcount(destination_ip),
    hosts_reached = make_set(destination_ip)
    by source_ip, hostname
| where unique_hosts >= 5
| extend severity = case(unique_hosts >= 20, "critical",
                         unique_hosts >= 10, "high",
                         "medium")
| order by unique_hosts desc$kql$,
  logic = '{"type":"cardinality","event_type":"network_connection","destination_port":[445,139],"destination_scope":"private","group_by":"source_ip","distinct_field":"destination_ip","threshold":5,"window_minutes":10}'
WHERE name = 'Lateral Movement — SMB Spread';

UPDATE siem_rules SET
  sigma_yaml = $sigma$title: Suspicious PowerShell Execution with Defence Evasion Flags
id: a7b8c9d0-e1f2-3456-abcd-567890123456
status: production
description: Detects PowerShell (powershell.exe or pwsh.exe) processes spawned with command-line arguments commonly associated with defence evasion and fileless execution: -EncodedCommand (base64-encoded payload), -ExecutionPolicy Bypass, -NonInteractive -NoProfile combinations, or inline expression execution via IEX / Invoke-Expression. These patterns are prevalent in commodity malware loaders, post-exploitation frameworks (Cobalt Strike, Metasploit, Empire), and living-off-the-land (LotL) attacks.
author: AVA Cyber SOC
date: 2026/01/15
modified: 2026/09/22
references:
    - https://attack.mitre.org/techniques/T1059/001/
    - https://attack.mitre.org/techniques/T1027/
    - https://attack.mitre.org/techniques/T1086/
    - https://lolbas-project.github.io/lolbas/Binaries/Powershell/
tags:
    - attack.execution
    - attack.defense_evasion
    - attack.t1059.001
    - attack.t1027
    - attack.t1086
logsource:
    category: process_creation
    product: windows
    service: sysmon
detection:
    selection_process:
        event_type: 'process_create'
        Image|endswith:
            - '\powershell.exe'
            - '\pwsh.exe'
            - '\powershell_ise.exe'
    selection_evasion:
        CommandLine|contains:
            - '-EncodedCommand'
            - '-enc '
            - '-ec '
            - '-ExecutionPolicy Bypass'
            - '-Exec Bypass'
            - '-ep bypass'
            - '-NoProfile'
            - '-NonInteractive'
            - '-WindowStyle Hidden'
            - 'IEX('
            - 'IEX ('
            - 'Invoke-Expression'
            - 'DownloadString'
            - 'Net.WebClient'
            - 'FromBase64String'
    filter_legitimate_admin:
        ParentImage|contains:
            - '\sccm\client\'
            - '\ccm\TSManager.exe'
    condition: (selection_process and selection_evasion) and not filter_legitimate_admin
fields:
    - hostname
    - username
    - CommandLine
    - ParentImage
    - ParentCommandLine
    - ProcessId
falsepositives:
    - Legitimate administrative scripts using -EncodedCommand for Unicode character handling
    - SCCM / Intune MDM management scripts deployed via system context
    - Software installers invoking PowerShell with bypass to run bundled setup scripts
    - Security tooling (CrowdStrike RTR, SentinelOne Remote Scripts)
level: high$sigma$,
  spl = $spl$index=* sourcetype=siem event_type="process_create"
| where (process_name="powershell.exe" OR process_name="pwsh.exe" OR raw_log LIKE "%powershell.exe%")
| where (cmdline LIKE "%-EncodedCommand%" OR cmdline LIKE "%-enc %" OR cmdline LIKE "%-Bypass%"
         OR cmdline LIKE "%IEX(%" OR cmdline LIKE "%IEX (%" OR cmdline LIKE "%Invoke-Expression%"
         OR cmdline LIKE "%DownloadString%" OR cmdline LIKE "%FromBase64String%" OR cmdline LIKE "%WindowStyle Hidden%")
| where NOT (parent_process LIKE "%\\sccm\\%" OR parent_process LIKE "%CCM\\%")
| eval risk=case(
    match(cmdline, "DownloadString|FromBase64String"), "critical",
    match(cmdline, "IEX|Invoke-Expression"), "high",
    true(), "medium")
| table _time, hostname, username, process_name, cmdline, parent_process, risk
| sort -_time$spl$,
  kql = $kql$SiemEvents
| where event_type == "process_create"
    and (raw_log contains "powershell.exe" or raw_log contains "pwsh.exe")
    and (
        raw_log contains "-EncodedCommand" or
        raw_log contains "-enc " or
        raw_log contains "-Bypass" or
        raw_log contains "IEX(" or
        raw_log contains "Invoke-Expression" or
        raw_log contains "DownloadString" or
        raw_log contains "FromBase64String" or
        raw_log contains "WindowStyle Hidden"
    )
    and raw_log !contains "\\sccm\\"
| extend risk = case(
    raw_log contains "DownloadString" or raw_log contains "FromBase64String", "critical",
    raw_log contains "IEX" or raw_log contains "Invoke-Expression", "high",
    "medium")
| project ingested_at, hostname, username, raw_log, risk
| order by ingested_at desc$kql$,
  logic = '{"type":"pattern","event_type":"process_create","process_name_in":["powershell.exe","pwsh.exe"],"cmdline_contains_any":["-EncodedCommand","-enc ","-Bypass","IEX(","Invoke-Expression","DownloadString","FromBase64String","-WindowStyle Hidden"],"exclude_parent_paths":["\\\\sccm\\\\","\\\\CCM\\\\"]}'
WHERE name = 'Suspicious PowerShell Execution';
