const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ── Stats ────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [events24h, activeAlerts, activeRules, activeSources, severity, trend] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM siem_events WHERE ingested_at > NOW() - INTERVAL '24 hours'`),
      pool.query(`SELECT COUNT(*) FROM siem_alerts WHERE status = 'open'`),
      pool.query(`SELECT COUNT(*) FROM siem_rules WHERE enabled = true`),
      pool.query(`SELECT COUNT(*) FROM siem_sources WHERE enabled = true`),
      pool.query(`SELECT severity, COUNT(*) as count FROM siem_alerts WHERE status = 'open' GROUP BY severity`),
      pool.query(`
        SELECT date_trunc('hour', ingested_at) as hour, COUNT(*) as count
        FROM siem_events
        WHERE ingested_at > NOW() - INTERVAL '24 hours'
        GROUP BY hour ORDER BY hour
      `),
    ]);

    const severityBreakdown = {};
    for (const row of severity.rows) severityBreakdown[row.severity] = parseInt(row.count);

    res.json({
      events24h: parseInt(events24h.rows[0].count),
      activeAlerts: parseInt(activeAlerts.rows[0].count),
      activeRules: parseInt(activeRules.rows[0].count),
      activeSources: parseInt(activeSources.rows[0].count),
      severityBreakdown,
      eventTrend: trend.rows,
    });
  } catch (err) {
    console.error('SIEM stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Events ───────────────────────────────────────────────────────────────────

router.get('/events', async (req, res) => {
  const { limit = 50, offset = 0, severity, search } = req.query;
  const where = [];
  const params = [];
  let idx = 1;

  if (severity) { where.push(`e.severity = $${idx++}`); params.push(severity); }
  if (search) {
    where.push(`(e.raw_log ILIKE $${idx} OR e.username ILIKE $${idx} OR e.source_ip ILIKE $${idx} OR e.hostname ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }

  const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT e.id, e.source_name, e.event_type, e.severity, e.source_ip,
                e.destination_ip, e.username, e.hostname, e.raw_log, e.tags, e.ingested_at
         FROM siem_events e ${wc}
         ORDER BY e.ingested_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), parseInt(offset)]
      ),
      pool.query(`SELECT COUNT(*) FROM siem_events e ${wc}`, params),
    ]);
    res.json({ events: rows.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    console.error('SIEM events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /siem/events/ingest — accepts log events from any source
router.post('/events/ingest', async (req, res) => {
  const { source_name, event_type, severity, source_ip, destination_ip, username, hostname, raw_log, tags, normalized } = req.body;

  try {
    let sourceId = null;
    if (source_name) {
      const src = await pool.query(`SELECT id FROM siem_sources WHERE name = $1 LIMIT 1`, [source_name]);
      if (src.rows.length > 0) {
        sourceId = src.rows[0].id;
        await pool.query(`UPDATE siem_sources SET last_seen = NOW(), event_count = event_count + 1 WHERE id = $1`, [sourceId]);
      }
    }

    const result = await pool.query(
      `INSERT INTO siem_events (source_id, source_name, event_type, severity, source_ip, destination_ip, username, hostname, raw_log, normalized, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [sourceId, source_name, event_type || 'generic', severity || 'info', source_ip, destination_ip, username, hostname, raw_log, normalized ? JSON.stringify(normalized) : '{}', tags || []]
    );

    evaluateRules(result.rows[0].id, { source_name, event_type, severity, source_ip, username, hostname }).catch(console.error);
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('SIEM ingest:', err);
    res.status(500).json({ error: 'Failed to ingest event' });
  }
});

async function evaluateRules(eventId, event) {
  const rules = await pool.query(`SELECT * FROM siem_rules WHERE enabled = true`);
  for (const rule of rules.rows) {
    const logic = rule.logic;
    let matched = false;
    if (logic.type === 'pattern' && logic.event_type === event.event_type) matched = true;
    if (matched) {
      await pool.query(
        `INSERT INTO siem_alerts (rule_id, rule_name, event_id, severity, source_ip, username, hostname, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [rule.id, rule.name, eventId, rule.severity, event.source_ip, event.username, event.hostname,
         `Rule "${rule.name}" matched on event from ${event.source_name || 'unknown source'}`]
      );
      await pool.query(`UPDATE siem_rules SET hit_count = hit_count + 1 WHERE id = $1`, [rule.id]);
    }
  }
}

// ── Alerts ───────────────────────────────────────────────────────────────────

router.get('/alerts', async (req, res) => {
  const { limit = 50, offset = 0, status, severity } = req.query;
  const where = [];
  const params = [];
  let idx = 1;

  if (status) { where.push(`status = $${idx++}`); params.push(status); }
  if (severity) { where.push(`severity = $${idx++}`); params.push(severity); }

  const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT id, rule_id, rule_name, event_id, severity, status, source_ip, username, hostname,
                description, ai_score, ai_summary, ai_narrative, assigned_to, ticket_id, resolved_at, created_at, updated_at
         FROM siem_alerts ${wc}
         ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), parseInt(offset)]
      ),
      pool.query(`SELECT COUNT(*) FROM siem_alerts ${wc}`, params),
    ]);
    res.json({ alerts: rows.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    console.error('SIEM alerts:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.put('/alerts/:id', async (req, res) => {
  const { status, assigned_to } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (status) { updates.push(`status = $${idx++}`); params.push(status); }
  if (assigned_to !== undefined) { updates.push(`assigned_to = $${idx++}`); params.push(assigned_to); }
  if (status === 'resolved') updates.push(`resolved_at = NOW()`);
  updates.push(`updated_at = NOW()`);
  params.push(parseInt(req.params.id));

  try {
    const result = await pool.query(`UPDATE siem_alerts SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (!result.rows.length) return res.status(404).json({ error: 'Alert not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('SIEM alert update:', err);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// ── Rules ────────────────────────────────────────────────────────────────────

router.get('/rules', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, logic, sigma_yaml, spl, kql, severity, enabled, ai_generated,
              created_by, hit_count, false_positive_count, created_at, updated_at
       FROM siem_rules ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('SIEM rules:', err);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

router.post('/rules', async (req, res) => {
  const { name, description, logic, sigma_yaml, severity, ai_generated } = req.body;
  if (!name || !logic) return res.status(400).json({ error: 'name and logic are required' });

  try {
    const result = await pool.query(
      `INSERT INTO siem_rules (name, description, logic, sigma_yaml, severity, ai_generated, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, description, JSON.stringify(logic), sigma_yaml, severity || 'medium', ai_generated || false, req.user?.email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('SIEM rule create:', err);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

router.put('/rules/:id', async (req, res) => {
  const { name, description, logic, sigma_yaml, severity, enabled } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(name); }
  if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description); }
  if (logic !== undefined) { updates.push(`logic = $${idx++}`); params.push(JSON.stringify(logic)); }
  if (sigma_yaml !== undefined) { updates.push(`sigma_yaml = $${idx++}`); params.push(sigma_yaml); }
  if (severity !== undefined) { updates.push(`severity = $${idx++}`); params.push(severity); }
  if (enabled !== undefined) { updates.push(`enabled = $${idx++}`); params.push(enabled); }
  updates.push(`updated_at = NOW()`);
  params.push(parseInt(req.params.id));

  try {
    const result = await pool.query(`UPDATE siem_rules SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (!result.rows.length) return res.status(404).json({ error: 'Rule not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('SIEM rule update:', err);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

router.delete('/rules/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM siem_rules WHERE id = $1`, [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    console.error('SIEM rule delete:', err);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// ── Sources ──────────────────────────────────────────────────────────────────

router.get('/sources', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, type, description, enabled, last_seen, event_count, created_at
       FROM siem_sources ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('SIEM sources:', err);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

router.post('/sources', async (req, res) => {
  const { name, type, description, config } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });

  try {
    const result = await pool.query(
      `INSERT INTO siem_sources (name, type, description, config) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, type, description, config ? JSON.stringify(config) : '{}']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('SIEM source create:', err);
    res.status(500).json({ error: 'Failed to create source' });
  }
});

router.delete('/sources/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM siem_sources WHERE id = $1`, [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    console.error('SIEM source delete:', err);
    res.status(500).json({ error: 'Failed to delete source' });
  }
});

// ── AI ───────────────────────────────────────────────────────────────────────

router.post('/ai/generate-rule', async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: 'description is required' });

  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI not configured — set OPENAI_API_KEY' });

  try {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey, timeout: 45000, maxRetries: 2 });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert security detection engineer with deep knowledge of Splunk SPL, Microsoft Sentinel KQL, and Sigma rules.
Generate complete, production-ready detection rules in all formats.
Respond ONLY with valid JSON, no markdown, no code fences.`,
        },
        {
          role: 'user',
          content: `Create a detection rule for: "${description}"

Respond with this exact JSON structure:
{
  "name": "short descriptive rule name",
  "description": "what this rule detects and why it matters",
  "severity": "low|medium|high|critical",
  "logic": {
    "type": "pattern|threshold|time_range|threat_intel|behavioral",
    "description": "plain english logic description"
  },
  "sigma_yaml": "complete valid Sigma rule in YAML format",
  "spl": "complete Splunk SPL search query with index, sourcetype, stats, eval etc",
  "kql": "complete Microsoft Sentinel KQL query using SecurityEvent or relevant tables",
  "reasoning": "why this detection catches the described threat"
}`,
        },
      ],
      temperature: 0.2,
    });

    let parsed;
    try { parsed = JSON.parse(completion.choices[0]?.message?.content || '{}'); }
    catch { return res.status(500).json({ error: 'AI returned invalid JSON' }); }
    res.json(parsed);
  } catch (err) {
    console.error('SIEM AI generate-rule:', err);
    res.status(500).json({ error: 'AI rule generation failed' });
  }
});

// POST /siem/ai/translate-rule/:id — generate SPL + KQL for an existing rule
router.post('/ai/translate-rule/:id', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' });

  try {
    const ruleRes = await pool.query(`SELECT * FROM siem_rules WHERE id = $1`, [parseInt(req.params.id)]);
    if (!ruleRes.rows.length) return res.status(404).json({ error: 'Rule not found' });
    const rule = ruleRes.rows[0];

    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey, timeout: 45000, maxRetries: 2 });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert security detection engineer. Translate detection rules into SPL and KQL. Respond ONLY with valid JSON, no markdown.',
        },
        {
          role: 'user',
          content: `Translate this detection rule into SPL and KQL:

Name: ${rule.name}
Description: ${rule.description}
Logic: ${JSON.stringify(rule.logic)}
Sigma: ${rule.sigma_yaml || 'not available'}

Respond with:
{
  "spl": "complete Splunk SPL search query",
  "kql": "complete Microsoft Sentinel KQL query",
  "sigma_yaml": "complete Sigma rule YAML if not already provided"
}`,
        },
      ],
      temperature: 0.1,
    });

    let parsed;
    try { parsed = JSON.parse(completion.choices[0]?.message?.content || '{}'); }
    catch { return res.status(500).json({ error: 'AI returned invalid JSON' }); }

    await pool.query(
      `UPDATE siem_rules SET spl = $1, kql = $2, sigma_yaml = COALESCE(sigma_yaml, $3), updated_at = NOW() WHERE id = $4`,
      [parsed.spl, parsed.kql, parsed.sigma_yaml, parseInt(req.params.id)]
    );

    res.json(parsed);
  } catch (err) {
    console.error('SIEM AI translate-rule:', err);
    res.status(500).json({ error: 'AI translation failed' });
  }
});

router.post('/ai/triage/:id', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' });

  try {
    const alertRes = await pool.query(`SELECT * FROM siem_alerts WHERE id = $1`, [parseInt(req.params.id)]);
    if (!alertRes.rows.length) return res.status(404).json({ error: 'Alert not found' });
    const alert = alertRes.rows[0];

    const eventsRes = await pool.query(
      `SELECT event_type, severity, source_ip, username, hostname, raw_log, ingested_at
       FROM siem_events WHERE (source_ip = $1 OR username = $2) AND ingested_at > NOW() - INTERVAL '24 hours'
       ORDER BY ingested_at DESC LIMIT 10`,
      [alert.source_ip, alert.username]
    );

    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey, timeout: 30000, maxRetries: 2 });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert SOC analyst performing alert triage. Respond ONLY with valid JSON.',
        },
        {
          role: 'user',
          content: `Triage alert: ${JSON.stringify({ rule_name: alert.rule_name, severity: alert.severity, source_ip: alert.source_ip, username: alert.username, description: alert.description })}\n\nRecent events: ${JSON.stringify(eventsRes.rows)}\n\nRespond: {"score":0-100,"summary":"...","recommended_action":"suppress|investigate|escalate","reasoning":"..."}`,
        },
      ],
      temperature: 0.1,
    });

    let parsed;
    try { parsed = JSON.parse(completion.choices[0]?.message?.content || '{}'); }
    catch { return res.status(500).json({ error: 'AI returned invalid JSON' }); }

    await pool.query(`UPDATE siem_alerts SET ai_score = $1, ai_summary = $2, updated_at = NOW() WHERE id = $3`, [parsed.score, parsed.summary, parseInt(req.params.id)]);
    res.json(parsed);
  } catch (err) {
    console.error('SIEM AI triage:', err);
    res.status(500).json({ error: 'AI triage failed' });
  }
});

router.post('/ai/investigate/:id', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' });

  try {
    const alertRes = await pool.query(`SELECT * FROM siem_alerts WHERE id = $1`, [parseInt(req.params.id)]);
    if (!alertRes.rows.length) return res.status(404).json({ error: 'Alert not found' });
    const alert = alertRes.rows[0];

    const eventsRes = await pool.query(
      `SELECT event_type, severity, source_ip, destination_ip, username, hostname, raw_log, ingested_at
       FROM siem_events WHERE (source_ip = $1 OR username = $2) AND ingested_at > NOW() - INTERVAL '24 hours'
       ORDER BY ingested_at ASC LIMIT 20`,
      [alert.source_ip, alert.username]
    );

    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey, timeout: 60000, maxRetries: 2 });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert SOC analyst writing incident investigation narratives. Use MITRE ATT&CK where relevant. Respond ONLY with valid JSON.',
        },
        {
          role: 'user',
          content: `Write investigation narrative for: ${JSON.stringify({ rule_name: alert.rule_name, severity: alert.severity, source_ip: alert.source_ip, username: alert.username, hostname: alert.hostname, description: alert.description, created_at: alert.created_at })}\n\nTimeline: ${JSON.stringify(eventsRes.rows)}\n\nRespond: {"narrative":"...","timeline":[{"time":"...","event":"..."}],"mitre_techniques":["T1078"],"recommended_steps":["..."],"severity_assessment":"..."}`,
        },
      ],
      temperature: 0.2,
    });

    let parsed;
    try { parsed = JSON.parse(completion.choices[0]?.message?.content || '{}'); }
    catch { return res.status(500).json({ error: 'AI returned invalid JSON' }); }

    await pool.query(`UPDATE siem_alerts SET ai_narrative = $1, updated_at = NOW() WHERE id = $2`, [JSON.stringify(parsed), parseInt(req.params.id)]);
    res.json(parsed);
  } catch (err) {
    console.error('SIEM AI investigate:', err);
    res.status(500).json({ error: 'AI investigation failed' });
  }
});

// POST /siem/bulk-correlate — checks which usernames/hostnames have open SIEM alerts
router.post('/bulk-correlate', async (req, res) => {
  const { items } = req.body; // [{username, hostname}]
  if (!Array.isArray(items) || items.length === 0) return res.json({ matches: {} });

  try {
    const usernames = [...new Set(items.map(i => i.username).filter(Boolean))];
    const hostnames = [...new Set(items.map(i => i.hostname).filter(Boolean))];

    const conditions = [];
    const params = [];
    let idx = 1;

    if (usernames.length > 0) {
      conditions.push(`username = ANY($${idx++})`);
      params.push(usernames);
    }
    if (hostnames.length > 0) {
      conditions.push(`hostname = ANY($${idx++})`);
      params.push(hostnames);
    }

    if (conditions.length === 0) return res.json({ matches: {} });

    const result = await pool.query(
      `SELECT id, rule_name, severity, username, hostname, status
       FROM siem_alerts
       WHERE status IN ('open', 'investigating') AND (${conditions.join(' OR ')})
       ORDER BY created_at DESC`,
      params
    );

    // Build a lookup: key = "username:hostname" -> alerts[]
    const matches: Record<string, { id: number; rule_name: string; severity: string }[]> = {};
    for (const row of result.rows) {
      const keys = new Set<string>();
      if (row.username) {
        for (const item of items) {
          if (item.username === row.username) keys.add(`${item.username}:${item.hostname || ''}`);
        }
      }
      if (row.hostname) {
        for (const item of items) {
          if (item.hostname === row.hostname) keys.add(`${item.username || ''}:${item.hostname}`);
        }
      }
      for (const key of keys) {
        if (!matches[key]) matches[key] = [];
        matches[key].push({ id: row.id, rule_name: row.rule_name, severity: row.severity });
      }
    }

    res.json({ matches });
  } catch (err) {
    console.error('SIEM bulk-correlate:', err);
    res.json({ matches: {} });
  }
});

module.exports = router;
