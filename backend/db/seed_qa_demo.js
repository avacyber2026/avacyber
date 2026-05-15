require('dotenv').config();
const pool = require('../db/pool');

const DEMO_ANALYSTS = [
  { email: 'j.miller@sochub.com', name: 'Jordan Miller' },
  { email: 's.chen@sochub.com',   name: 'Sarah Chen' },
  { email: 'k.patel@sochub.com',  name: 'Kiran Patel' },
  { email: 't.okafor@sochub.com', name: 'Tunde Okafor' },
];

// Pre-authored QA findings for each demo scenario
const DEMO_CASES = [
  {
    ruleName: 'Multiple Failed Logins', username: 'asmith',
    analyst: DEMO_ANALYSTS[0], resolutionType: 'true_positive', notes: null, timeMin: 18,
    verdict: 'flag', score: 68,
    summary: 'Alert correctly classified as True Positive, but analyst skipped notes and AI triage — both required for High severity alerts.',
    findings: [
      { category: 'Classification', passed: true,  detail: 'True Positive call is correct — 8 failed logins in 2 minutes is a clear brute-force indicator.' },
      { category: 'Notes',          passed: false, detail: 'No analyst notes recorded. Notes are mandatory for High and Critical severity alerts.' },
      { category: 'SLA',            passed: true,  detail: 'Resolved in 18 min, within the 2-hour SLA for High severity.' },
      { category: 'AI Tools Used',  passed: false, detail: 'AI Triage was not run prior to resolution — should be used on all High+ alerts.' },
      { category: 'Process',        passed: true,  detail: 'Alert resolved promptly.' },
    ],
    managerDecision: null,
  },
  {
    ruleName: 'Outbound to Threat Intel IP', hostname: 'SERVER-12',
    analyst: DEMO_ANALYSTS[0], resolutionType: 'true_positive', notes: 'Confirmed C2 connection, blocked at firewall.', timeMin: 95,
    verdict: 'fail', score: 34,
    summary: 'Critical alert resolved 65 minutes past SLA. C2 connection on port 4444 demanded immediate escalation, not solo resolution.',
    findings: [
      { category: 'Classification', passed: true,  detail: 'True Positive is correct — outbound to known C2 IP on port 4444 is confirmed malicious.' },
      { category: 'Notes',          passed: true,  detail: 'Notes present and describe the action taken.' },
      { category: 'SLA',            passed: false, detail: 'BREACH: Critical severity requires resolution within 30 min. Resolved in 95 min (+65 min overdue).' },
      { category: 'AI Tools Used',  passed: false, detail: 'AI Triage and Investigation not run. These are required for Critical alerts.' },
      { category: 'Process',        passed: false, detail: 'Active C2 connection requires immediate escalation to senior analyst — not solo close.' },
    ],
    managerDecision: 'approved', managerEmail: 't.okafor@sochub.com',
    managerNotes: 'Acknowledged. Jordan — critical alerts must be escalated immediately. SLA breach documented.',
  },
  {
    ruleName: 'Suspicious PowerShell Execution', username: 'mwilliams',
    analyst: DEMO_ANALYSTS[1], resolutionType: 'true_positive',
    notes: 'Confirmed malicious PowerShell with encoded command. Isolated LAPTOP-08, ticket #412 created, user notified. No lateral movement observed.',
    timeMin: 45,
    verdict: 'pass', score: 92,
    summary: 'Excellent handling — correct TP classification, full notes, AI triage used, resolved within SLA.',
    findings: [
      { category: 'Classification', passed: true, detail: 'True Positive is correct — encoded command with hidden window is a strong malicious indicator.' },
      { category: 'Notes',          passed: true, detail: 'Detailed notes document isolation, ticket creation, and lateral movement check.' },
      { category: 'SLA',            passed: true, detail: 'Resolved in 45 min, well within 2-hour SLA for High severity.' },
      { category: 'AI Tools Used',  passed: true, detail: 'AI Triage run — score confirmed high-risk before resolution.' },
      { category: 'Process',        passed: true, detail: 'Full process followed: triage → isolate → ticket → notify.' },
    ],
    managerDecision: 'approved', managerEmail: 't.okafor@sochub.com',
    managerNotes: 'Good work.',
  },
  {
    ruleName: 'Large Data Transfer', username: 'rjones',
    analyst: DEMO_ANALYSTS[2], resolutionType: 'false_positive',
    notes: 'Looks like normal backup activity.', timeMin: 25,
    verdict: 'fail', score: 22,
    summary: 'Critical misclassification — 1.2GB exfil to an external IP is not backup activity. This is a potential DLP incident that was incorrectly closed.',
    findings: [
      { category: 'Classification', passed: false, detail: 'INCORRECT: 1.2GB transferred to external IP 203.0.113.99 via HTTPS is not consistent with internal backup behavior. This should be True Positive pending investigation.' },
      { category: 'Notes',          passed: true,  detail: 'Notes present, but reasoning is insufficient for a Critical alert.' },
      { category: 'SLA',            passed: true,  detail: 'Resolved in 25 min, within 30-min SLA for Critical severity.' },
      { category: 'AI Tools Used',  passed: false, detail: 'AI Investigation not run. Required for Critical alerts to rule out data exfiltration.' },
      { category: 'Process',        passed: false, detail: 'Critical data transfer alert should not be closed as FP without DLP investigation and manager sign-off.' },
    ],
    managerDecision: null,
  },
  {
    ruleName: 'New Privileged Account Created', username: 'administrator',
    analyst: DEMO_ANALYSTS[3], resolutionType: 'true_positive',
    notes: 'Confirmed unauthorized. SVC_BACKUP2 created outside change window with no approved ticket. Account disabled, AD team notified, incident ticket #421 opened. CAB team alerted.',
    timeMin: 20,
    verdict: 'pass', score: 97,
    summary: 'Textbook handling — immediate action, full documentation, cross-team coordination, AI triage used.',
    findings: [
      { category: 'Classification', passed: true, detail: 'True Positive is correct — unauthorized domain admin account creation is a critical security event.' },
      { category: 'Notes',          passed: true, detail: 'Comprehensive notes covering all required steps: disable, ticket, notify, CAB alert.' },
      { category: 'SLA',            passed: true, detail: 'Resolved in 20 min, within 2-hour SLA for High severity.' },
      { category: 'AI Tools Used',  passed: true, detail: 'AI Triage and Investigation both run before resolution.' },
      { category: 'Process',        passed: true, detail: 'Full escalation and cross-team coordination documented.' },
    ],
    managerDecision: 'approved', managerEmail: 't.okafor@sochub.com',
    managerNotes: 'Excellent.',
  },
  {
    ruleName: 'Login Outside Business Hours', username: 'bjohnson',
    analyst: DEMO_ANALYSTS[0], resolutionType: 'benign', notes: null, timeMin: 120,
    verdict: 'fail', score: 28,
    summary: 'VPN login from Ukraine at 1:23 AM closed as benign with no notes or verification. This requires user callback or manager approval, not a solo benign close.',
    findings: [
      { category: 'Classification', passed: false, detail: 'QUESTIONABLE: Benign call for Ukraine login at 1 AM without user verification is insufficient. Should be True Positive pending callback.' },
      { category: 'Notes',          passed: false, detail: 'No notes whatsoever. For any geographic anomaly, notes are required explaining the verification steps taken.' },
      { category: 'SLA',            passed: true,  detail: 'Resolved within 4-hour SLA for Medium severity.' },
      { category: 'AI Tools Used',  passed: false, detail: 'AI Triage not run. Required for geo-anomaly alerts.' },
      { category: 'Process',        passed: false, detail: 'Impossible travel / geo-anomaly requires user callback or manager approval before closing.' },
    ],
    managerDecision: null,
  },
  {
    ruleName: 'Lateral Movement — SMB Spread', hostname: 'WORKSTATION-19',
    analyst: DEMO_ANALYSTS[1], resolutionType: 'true_positive',
    notes: 'Confirmed SMB lateral movement from WORKSTATION-19 to 7 hosts. Network isolated. Forensics team engaged. Possible ransomware precursor — escalated to IR team.',
    timeMin: 180,
    verdict: 'fail', score: 55,
    summary: 'Handling quality was good but SLA breach on a Critical alert is a major process failure — 150 minutes over the 30-minute SLA.',
    findings: [
      { category: 'Classification', passed: true,  detail: 'True Positive is correct — 7 SMB connections in 5 minutes is classic lateral movement.' },
      { category: 'Notes',          passed: true,  detail: 'Excellent notes documenting isolation, forensics engagement, and IR escalation.' },
      { category: 'SLA',            passed: false, detail: 'BREACH: Critical severity requires resolution within 30 min. Resolved in 180 min (+150 min overdue).' },
      { category: 'AI Tools Used',  passed: true,  detail: 'AI Investigation run — MITRE mapping and remediation steps documented.' },
      { category: 'Process',        passed: true,  detail: 'Correct IR escalation and network isolation steps taken.' },
    ],
    managerDecision: null,
  },
  {
    ruleName: 'Multiple Failed Logins', username: 'guest',
    analyst: DEMO_ANALYSTS[2], resolutionType: 'benign',
    notes: 'Guest account brute force on file server. Verified guest account is disabled and has no access. Attacker likely scanning — no real risk.',
    timeMin: 90,
    verdict: 'pass', score: 88,
    summary: 'Good call — benign classification is appropriate given disabled guest account. Notes justify the reasoning clearly.',
    findings: [
      { category: 'Classification', passed: true, detail: 'Benign is correct — guest account is disabled with no system access, so brute force has no impact.' },
      { category: 'Notes',          passed: true, detail: 'Notes explain the verification steps and risk assessment.' },
      { category: 'SLA',            passed: true, detail: 'Resolved in 90 min, within 4-hour SLA for Medium severity.' },
      { category: 'AI Tools Used',  passed: false, detail: 'AI Triage not run — acceptable for low-impact benign close but recommended.' },
      { category: 'Process',        passed: true, detail: 'Appropriate verification before benign classification.' },
    ],
    managerDecision: null,
  },
  {
    ruleName: 'Suspicious PowerShell Execution', username: 'jdoe',
    analyst: DEMO_ANALYSTS[3], resolutionType: 'true_positive',
    notes: 'Confirmed PowerShell download cradle — IEX from external IP. MITRE T1059.001 (PowerShell) + T1105 (Ingress Tool Transfer). LAPTOP-14 isolated, memory acquired, user suspended pending forensics. IR ticket #435.',
    timeMin: 15,
    verdict: 'pass', score: 99,
    summary: 'Outstanding response — fastest resolution of any critical alert this quarter, full MITRE mapping, immediate containment.',
    findings: [
      { category: 'Classification', passed: true, detail: 'True Positive is correct — IEX download cradle from external IP is a confirmed malicious execution.' },
      { category: 'Notes',          passed: true, detail: 'Exceptional notes: MITRE techniques cited, containment actions documented, IR ticket referenced.' },
      { category: 'SLA',            passed: true, detail: 'Resolved in 15 min — 50% of the 30-min Critical SLA. Fastest this quarter.' },
      { category: 'AI Tools Used',  passed: true, detail: 'Both AI Triage and AI Investigation run. MITRE mapping confirmed.' },
      { category: 'Process',        passed: true, detail: 'Immediate isolation, memory acquisition, user suspension — full IR playbook followed.' },
    ],
    managerDecision: 'approved', managerEmail: 't.okafor@sochub.com',
    managerNotes: 'Outstanding.',
  },
  {
    ruleName: 'Login Outside Business Hours', username: 'contractor01',
    analyst: DEMO_ANALYSTS[0], resolutionType: 'benign', notes: null, timeMin: 480,
    verdict: 'flag', score: 61,
    summary: 'Benign classification may be reasonable for a contractor but zero notes make it unverifiable. No documentation of any verification step taken.',
    findings: [
      { category: 'Classification', passed: true,  detail: 'Benign is plausible for a contractor working late — but requires verification.' },
      { category: 'Notes',          passed: false, detail: 'No notes. Any benign close on an after-hours login requires at minimum a note confirming user contact or business justification.' },
      { category: 'SLA',            passed: true,  detail: 'Resolved within 24-hour SLA for Low severity.' },
      { category: 'AI Tools Used',  passed: false, detail: 'AI Triage not run. Recommended even for Low severity when classification is ambiguous.' },
      { category: 'Process',        passed: true,  detail: 'Alert eventually handled within SLA.' },
    ],
    managerDecision: null,
  },
  {
    ruleName: 'Outbound to Threat Intel IP', hostname: 'SERVER-04',
    analyst: DEMO_ANALYSTS[1], resolutionType: 'true_positive',
    notes: 'Confirmed DNS beacon to known C2 domain — periodic 60s intervals. SERVER-04 isolated from network. DNS sinkholing applied. Forensic image taken. MITRE T1071.004 (DNS C2). IR ticket #442.',
    timeMin: 12,
    verdict: 'pass', score: 96,
    summary: 'Exemplary handling — DNS beacon detected and contained within SLA, full forensic chain documented.',
    findings: [
      { category: 'Classification', passed: true, detail: 'True Positive is correct — periodic DNS queries to known malware C2 domain is an active compromise.' },
      { category: 'Notes',          passed: true, detail: 'Comprehensive notes with sinkholing steps, forensics, and MITRE technique reference.' },
      { category: 'SLA',            passed: true, detail: 'Resolved in 12 min, within 30-min Critical SLA.' },
      { category: 'AI Tools Used',  passed: true, detail: 'AI Investigation run — narrative and recommended steps followed.' },
      { category: 'Process',        passed: true, detail: 'Network isolation, DNS sinkholing, forensic image — textbook DNS C2 response.' },
    ],
    managerDecision: 'approved', managerEmail: 't.okafor@sochub.com',
    managerNotes: 'Great response time on a critical.',
  },
  {
    ruleName: 'Large Data Transfer', username: 'kthomas',
    analyst: DEMO_ANALYSTS[2], resolutionType: 'true_positive',
    notes: 'USB exfil confirmed — 800MB on an unregistered device. DLP policy violation. HR notified, device confiscated, kthomas under investigation. Insider threat ticket #447.',
    timeMin: 55,
    verdict: 'pass', score: 90,
    summary: 'Correct TP classification with good notes and appropriate HR escalation for insider threat.',
    findings: [
      { category: 'Classification', passed: true, detail: 'True Positive is correct — unauthorized USB exfiltration of 800MB is a DLP and insider threat incident.' },
      { category: 'Notes',          passed: true, detail: 'Good notes: device confiscation, HR notification, and ticket reference.' },
      { category: 'SLA',            passed: true, detail: 'Resolved in 55 min, within 2-hour SLA for High severity.' },
      { category: 'AI Tools Used',  passed: false, detail: 'AI tools not used — acceptable but AI investigation would have strengthened the case documentation.' },
      { category: 'Process',        passed: true, detail: 'Correct insider threat escalation path: HR + ticket + device confiscation.' },
    ],
    managerDecision: null,
  },
  {
    ruleName: 'New Privileged Account Created', username: 'helpdesk01',
    analyst: DEMO_ANALYSTS[3], resolutionType: 'true_positive',
    notes: 'Policy violation confirmed — helpdesk01 elevated to Domain Admin without approved ticket. Privilege revoked within 5 min. CAB notified. Helpdesk supervisor contacted for disciplinary review.',
    timeMin: 30,
    verdict: 'pass', score: 94,
    summary: 'Prompt privilege revocation with full documentation and appropriate escalation.',
    findings: [
      { category: 'Classification', passed: true, detail: 'True Positive — unauthorized privilege escalation is a confirmed policy violation.' },
      { category: 'Notes',          passed: true, detail: 'Excellent notes: revocation time documented, CAB and HR loop completed.' },
      { category: 'SLA',            passed: true, detail: 'Resolved in 30 min, within 4-hour SLA for Medium severity.' },
      { category: 'AI Tools Used',  passed: true, detail: 'AI Triage used to confirm risk score before escalation.' },
      { category: 'Process',        passed: true, detail: 'Immediate revocation + disciplinary escalation followed process correctly.' },
    ],
    managerDecision: 'approved', managerEmail: 't.okafor@sochub.com',
    managerNotes: 'Clean handling.',
  },
  {
    ruleName: 'Lateral Movement — SMB Spread', username: 'svc_scan',
    analyst: DEMO_ANALYSTS[1], resolutionType: 'false_positive',
    notes: 'Verified with IT Ops — svc_scan is authorized for quarterly vulnerability scanning. Scan window was pre-approved in CAB ticket #389. Rule baseline needs updating to exclude this service account.',
    timeMin: 40,
    verdict: 'pass', score: 89,
    summary: 'Correct FP — authorized scan verified through change management. Good catch to flag rule baseline update.',
    findings: [
      { category: 'Classification', passed: true, detail: 'False Positive is correct — authorized scan verified via CAB ticket #389.' },
      { category: 'Notes',          passed: true, detail: 'Notes reference the specific CAB ticket number and identify the rule baseline improvement.' },
      { category: 'SLA',            passed: true, detail: 'Resolved in 40 min, within 2-hour SLA for High severity.' },
      { category: 'AI Tools Used',  passed: false, detail: 'AI tools not used — acceptable for a verified FP with clear evidence.' },
      { category: 'Process',        passed: true, detail: 'FP verification done correctly through IT Ops and change management records.' },
    ],
    managerDecision: null,
  },
  {
    ruleName: 'Suspicious PowerShell Execution', username: 'lwatson',
    analyst: DEMO_ANALYSTS[0], resolutionType: 'true_positive',
    notes: 'Mimikatz-like activity on WORKSTATION-05. Isolated host.', timeMin: 65,
    verdict: 'flag', score: 72,
    summary: 'Correct classification but notes are insufficient for a Mimikatz-level event. MITRE mapping missing and AI investigation not run on what is likely a credential theft incident.',
    findings: [
      { category: 'Classification', passed: true,  detail: 'True Positive is correct — LSASS memory read via PowerShell is a Mimikatz or similar credential theft tool.' },
      { category: 'Notes',          passed: false, detail: 'Notes too brief for this severity. Should document: process name, memory dump taken, accounts potentially compromised, containment steps beyond isolation.' },
      { category: 'SLA',            passed: true,  detail: 'Resolved in 65 min, within 2-hour SLA for High severity.' },
      { category: 'AI Tools Used',  passed: false, detail: 'AI Investigation not run. For credential theft indicators, AI narrative + MITRE mapping (T1003.001) is required.' },
      { category: 'Process',        passed: false, detail: 'Credential theft requires immediate password reset for potentially exposed accounts — not documented.' },
    ],
    managerDecision: null,
  },
];

async function seed() {
  const existing = await pool.query('SELECT COUNT(*) FROM qa_reviews');
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('QA demo data already seeded, skipping.');
    await pool.end();
    return;
  }

  let seeded = 0;

  for (const c of DEMO_CASES) {
    const where = [];
    const params = [];
    let idx = 1;

    where.push(`rule_name = $${idx++}`);
    params.push(c.ruleName);

    if (c.username) { where.push(`username = $${idx++}`); params.push(c.username); }
    if (c.hostname)  { where.push(`hostname = $${idx++}`); params.push(c.hostname); }

    const alertRes = await pool.query(
      `SELECT id FROM siem_alerts WHERE ${where.join(' AND ')} LIMIT 1`, params
    );

    if (!alertRes.rows.length) {
      console.log(`Skip — alert not found: ${c.ruleName}`);
      continue;
    }

    const alertId = alertRes.rows[0].id;

    // Mark alert as resolved
    await pool.query(
      `UPDATE siem_alerts SET status = 'resolved', resolved_at = NOW() - (RANDOM() * INTERVAL '6 hours') WHERE id = $1`,
      [alertId]
    );

    const actionRes = await pool.query(
      `INSERT INTO siem_alert_actions (alert_id, analyst_email, analyst_name, resolution_type, notes, time_to_action_minutes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6, NOW() - $7::interval)
       RETURNING id`,
      [
        alertId, c.analyst.email, c.analyst.name, c.resolutionType,
        c.notes, c.timeMin,
        `${c.timeMin} minutes`,
      ]
    );

    const actionId = actionRes.rows[0].id;

    await pool.query(
      `INSERT INTO qa_reviews (alert_id, action_id, analyst_email, ai_verdict, ai_score, ai_findings, ai_summary, manager_decision, manager_email, manager_notes, reviewed_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW())`,
      [
        alertId, actionId, c.analyst.email,
        c.verdict, c.score,
        JSON.stringify(c.findings), c.summary,
        c.managerDecision ?? null,
        c.managerDecision ? (c.managerEmail ?? null) : null,
        c.managerDecision ? (c.managerNotes ?? null) : null,
        c.managerDecision ? new Date() : null,
      ]
    );

    seeded++;
  }

  console.log(`QA demo seeded: ${seeded} reviews created.`);
  await pool.end();
}

seed().catch(err => { console.error('QA seed failed:', err); process.exit(1); });
