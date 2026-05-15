const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ── Queue ─────────────────────────────────────────────────────────────────────

router.get('/queue', async (req, res) => {
  const { verdict, status } = req.query;
  const where = [];
  const params = [];
  let idx = 1;

  if (verdict && verdict !== 'all') { where.push(`qr.ai_verdict = $${idx++}`); params.push(verdict); }
  if (status === 'pending')  { where.push(`qr.manager_decision IS NULL`); }
  if (status === 'reviewed') { where.push(`qr.manager_decision IS NOT NULL`); }

  const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT
         qr.id, qr.alert_id, qr.action_id, qr.analyst_email, qr.ai_verdict,
         qr.ai_score, qr.ai_findings, qr.ai_summary, qr.manager_decision,
         qr.manager_email, qr.manager_notes, qr.reviewed_at, qr.created_at,
         sa.rule_name, sa.severity, sa.source_ip, sa.username, sa.hostname,
         sa.description AS alert_description,
         ac.resolution_type, ac.notes AS analyst_notes, ac.time_to_action_minutes,
         ac.analyst_name, ac.created_at AS action_at
       FROM qa_reviews qr
       JOIN siem_alerts sa ON sa.id = qr.alert_id
       LEFT JOIN siem_alert_actions ac ON ac.id = qr.action_id
       ${wc}
       ORDER BY
         CASE qr.ai_verdict WHEN 'fail' THEN 0 WHEN 'flag' THEN 1 ELSE 2 END,
         qr.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('QA queue:', err);
    res.status(500).json({ error: 'Failed to fetch QA queue' });
  }
});

// ── Scorecards ────────────────────────────────────────────────────────────────

router.get('/scorecards', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        qr.analyst_email,
        MAX(ac.analyst_name) AS analyst_name,
        COUNT(*)                                                             AS total_reviews,
        SUM(CASE WHEN qr.ai_verdict = 'pass' THEN 1 ELSE 0 END)            AS pass_count,
        SUM(CASE WHEN qr.ai_verdict = 'flag' THEN 1 ELSE 0 END)            AS flag_count,
        SUM(CASE WHEN qr.ai_verdict = 'fail' THEN 1 ELSE 0 END)            AS fail_count,
        ROUND(AVG(qr.ai_score))                                             AS avg_score,
        ROUND(AVG(ac.time_to_action_minutes))                               AS avg_time_min,
        SUM(CASE WHEN qr.manager_decision = 'approved' THEN 1 ELSE 0 END)  AS approved_count,
        SUM(CASE WHEN qr.manager_decision = 'overridden' THEN 1 ELSE 0 END) AS overridden_count
      FROM qa_reviews qr
      LEFT JOIN siem_alert_actions ac ON ac.id = qr.action_id
      GROUP BY qr.analyst_email
      ORDER BY avg_score DESC NULLS LAST
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('QA scorecards:', err);
    res.status(500).json({ error: 'Failed to fetch scorecards' });
  }
});

// ── Manager decisions ─────────────────────────────────────────────────────────

router.put('/reviews/:id/approve', async (req, res) => {
  const { notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE qa_reviews SET manager_decision = 'approved', manager_email = $1, manager_notes = $2, reviewed_at = NOW()
       WHERE id = $3 RETURNING *`,
      [req.user?.email, notes ?? null, parseInt(req.params.id)]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Review not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('QA approve:', err);
    res.status(500).json({ error: 'Failed to approve' });
  }
});

router.put('/reviews/:id/override', async (req, res) => {
  const { notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE qa_reviews SET manager_decision = 'overridden', manager_email = $1, manager_notes = $2, reviewed_at = NOW()
       WHERE id = $3 RETURNING *`,
      [req.user?.email, notes ?? null, parseInt(req.params.id)]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Review not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('QA override:', err);
    res.status(500).json({ error: 'Failed to override' });
  }
});

// ── AI QA run ─────────────────────────────────────────────────────────────────

router.post('/ai-run/:alertId', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' });

  const alertId = parseInt(req.params.alertId);

  try {
    const alertRes = await pool.query(`SELECT * FROM siem_alerts WHERE id = $1`, [alertId]);
    if (!alertRes.rows.length) return res.status(404).json({ error: 'Alert not found' });
    const alert = alertRes.rows[0];

    const actionRes = await pool.query(
      `SELECT * FROM siem_alert_actions WHERE alert_id = $1 ORDER BY created_at DESC LIMIT 1`, [alertId]
    );
    if (!actionRes.rows.length) return res.status(400).json({ error: 'No analyst action found for this alert' });
    const action = actionRes.rows[0];

    const SLA_MINUTES = { critical: 30, high: 120, medium: 240, low: 1440 };
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

Rules: verdict="fail" if classification is wrong OR SLA breached on critical/high, verdict="flag" if any non-critical issues, verdict="pass" if all checks pass. Score reflects overall quality 0-100.`,
        },
      ],
      temperature: 0.2,
    });

    let parsed;
    try { parsed = JSON.parse(completion.choices[0]?.message?.content || '{}'); }
    catch { return res.status(500).json({ error: 'AI returned invalid JSON' }); }

    // Upsert review (replace if exists for same action)
    const existing = await pool.query(
      `SELECT id FROM qa_reviews WHERE action_id = $1 LIMIT 1`, [action.id]
    );

    let reviewId;
    if (existing.rows.length) {
      await pool.query(
        `UPDATE qa_reviews SET ai_verdict=$1, ai_score=$2, ai_findings=$3, ai_summary=$4,
                               manager_decision=NULL, manager_email=NULL, manager_notes=NULL, reviewed_at=NULL
         WHERE id=$5`,
        [parsed.verdict, parsed.score, JSON.stringify(parsed.findings), parsed.summary, existing.rows[0].id]
      );
      reviewId = existing.rows[0].id;
    } else {
      const ins = await pool.query(
        `INSERT INTO qa_reviews (alert_id, action_id, analyst_email, ai_verdict, ai_score, ai_findings, ai_summary)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [alertId, action.id, action.analyst_email, parsed.verdict, parsed.score,
         JSON.stringify(parsed.findings), parsed.summary]
      );
      reviewId = ins.rows[0].id;
    }

    res.json({ ...parsed, review_id: reviewId });
  } catch (err) {
    console.error('QA AI run:', err);
    res.status(500).json({ error: 'AI QA failed' });
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [total, verdicts, pending] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM qa_reviews`),
      pool.query(`SELECT ai_verdict, COUNT(*) as count FROM qa_reviews GROUP BY ai_verdict`),
      pool.query(`SELECT COUNT(*) FROM qa_reviews WHERE manager_decision IS NULL`),
    ]);

    const breakdown = {};
    for (const row of verdicts.rows) breakdown[row.ai_verdict] = parseInt(row.count);

    res.json({
      total: parseInt(total.rows[0].count),
      pending: parseInt(pending.rows[0].count),
      verdictBreakdown: breakdown,
    });
  } catch (err) {
    console.error('QA stats:', err);
    res.status(500).json({ error: 'Failed to fetch QA stats' });
  }
});

module.exports = router;
