const pool = require('../db/pool');

const SLA_MINUTES = { critical: 30, high: 120, medium: 240, low: 1440 };

async function runQaForAlert(alertId) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return;

  const alertRes = await pool.query(`SELECT * FROM siem_alerts WHERE id = $1`, [alertId]);
  if (!alertRes.rows.length) return;
  const alert = alertRes.rows[0];

  const actionRes = await pool.query(
    `SELECT * FROM siem_alert_actions WHERE alert_id = $1 ORDER BY created_at DESC LIMIT 1`, [alertId]
  );
  if (!actionRes.rows.length) return;
  const action = actionRes.rows[0];

  const slaLimit = SLA_MINUTES[alert.severity] ?? 240;

  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey, timeout: 45000, maxRetries: 2 });

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a SOC Quality Assurance manager reviewing an analyst's handling of a security alert.
Evaluate across 5 categories and return a JSON QA report. Respond ONLY with valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: `QA Review Request:

ALERT:
- Rule: ${alert.rule_name}
- Severity: ${alert.severity}
- Description: ${alert.description}
- Source IP: ${alert.source_ip ?? 'N/A'}
- Username: ${alert.username ?? 'N/A'}
- Hostname: ${alert.hostname ?? 'N/A'}
- AI Triage Score: ${alert.ai_score ?? 'Not run'}
- AI Investigation: ${alert.ai_narrative ? 'Completed' : 'Not run'}

ANALYST ACTION:
- Analyst: ${action.analyst_name ?? action.analyst_email}
- Resolution: ${action.resolution_type}
- Notes: ${action.notes ?? '(none)'}
- Time to resolve: ${action.time_to_action_minutes} minutes
- SLA limit for ${alert.severity}: ${slaLimit} minutes

Evaluate and respond:
{
  "verdict": "pass|flag|fail",
  "score": 0-100,
  "summary": "one-sentence overall assessment",
  "findings": [
    {"category": "Classification", "passed": true/false, "detail": "..."},
    {"category": "Notes", "passed": true/false, "detail": "..."},
    {"category": "SLA", "passed": true/false, "detail": "..."},
    {"category": "AI Tools Used", "passed": true/false, "detail": "..."},
    {"category": "Process", "passed": true/false, "detail": "..."}
  ]
}

Rules: verdict="fail" if classification is wrong OR SLA breached on critical/high, verdict="flag" if any non-critical issues, verdict="pass" if all checks pass.`,
      },
    ],
    temperature: 0.2,
  });

  let parsed;
  try { parsed = JSON.parse(completion.choices[0]?.message?.content || '{}'); }
  catch { return; }

  const existing = await pool.query(
    `SELECT id FROM qa_reviews WHERE action_id = $1 LIMIT 1`, [action.id]
  );

  if (existing.rows.length) {
    await pool.query(
      `UPDATE qa_reviews SET ai_verdict=$1, ai_score=$2, ai_findings=$3, ai_summary=$4,
                             manager_decision=NULL, manager_email=NULL, manager_notes=NULL, reviewed_at=NULL
       WHERE id=$5`,
      [parsed.verdict, parsed.score, JSON.stringify(parsed.findings), parsed.summary, existing.rows[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO qa_reviews (alert_id, action_id, analyst_email, ai_verdict, ai_score, ai_findings, ai_summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [alertId, action.id, action.analyst_email, parsed.verdict, parsed.score,
       JSON.stringify(parsed.findings), parsed.summary]
    );
  }
}

module.exports = { runQaForAlert };
