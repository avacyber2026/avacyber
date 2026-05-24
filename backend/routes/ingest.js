/**
 * Public ingest API — authenticated by API key (X-AVA-API-Key header), not JWT.
 *
 * GET  /v1/ingest/health              — liveness (no auth)
 * POST /v1/ingest/events              — generic single event or raw JSON
 * POST /v1/ingest/events/batch        — up to 500 events
 * POST /v1/ingest/cloudflare          — Cloudflare Logpush (single or array)
 * POST /v1/ingest/jumpcloud           — JumpCloud Directory Insights webhook
 * POST /v1/ingest/raw                 — raw syslog line or plain text over HTTP
 */
const express = require('express');
const pool = require('../db/pool');
const { apiKeyMiddleware } = require('../middleware/apiKey');
const {
  normalizeCloudflare,
  normalizeJumpCloud,
  normalizeGenericJSON,
  normalizeSyslog,
} = require('../services/logParser');

const router = express.Router();

// ── Health ────────────────────────────────────────────────────────────────────

router.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1' });
});

// ── Cloudflare Logpush ────────────────────────────────────────────────────────

router.post('/cloudflare', apiKeyMiddleware, async (req, res) => {
  try {
    const events = normalizeCloudflare(req.body);
    const ids = await insertMany(events, req.apiClient.client_name);
    res.status(201).json({ ingested: ids.length });
  } catch (err) {
    console.error('ingest/cloudflare:', err);
    res.status(500).json({ error: 'Failed to ingest' });
  }
});

// ── JumpCloud webhook ─────────────────────────────────────────────────────────

router.post('/jumpcloud', apiKeyMiddleware, async (req, res) => {
  try {
    const events = normalizeJumpCloud(req.body);
    const ids = await insertMany(events, req.apiClient.client_name);
    res.status(201).json({ ingested: ids.length });
  } catch (err) {
    console.error('ingest/jumpcloud:', err);
    res.status(500).json({ error: 'Failed to ingest' });
  }
});

// ── Raw syslog line over HTTP ─────────────────────────────────────────────────

router.post('/raw', apiKeyMiddleware, express.text({ type: '*/*' }), async (req, res) => {
  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const sourceIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
    const event = normalizeSyslog(raw, sourceIp);
    const [id] = await insertMany([event], req.apiClient.client_name);
    res.status(201).json({ id });
  } catch (err) {
    console.error('ingest/raw:', err);
    res.status(500).json({ error: 'Failed to ingest' });
  }
});

// ── Generic single event ──────────────────────────────────────────────────────

router.post('/events', apiKeyMiddleware, async (req, res) => {
  try {
    const sourceName = req.body?.source_name || req.apiClient.client_name;
    const events = normalizeGenericJSON(req.body, sourceName);
    const [id] = await insertMany(events, req.apiClient.client_name);
    res.status(201).json({ id });
  } catch (err) {
    console.error('ingest/events:', err);
    res.status(500).json({ error: 'Failed to ingest' });
  }
});

// ── Batch ─────────────────────────────────────────────────────────────────────

router.post('/events/batch', apiKeyMiddleware, async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Body must be a JSON array' });
  if (req.body.length > 500) return res.status(400).json({ error: 'Max 500 events per batch' });

  try {
    const sourceName = req.apiClient.client_name;
    const events = normalizeGenericJSON(req.body, sourceName);
    const ids = await insertMany(events, sourceName);
    res.status(201).json({ ingested: ids.length, ids });
  } catch (err) {
    console.error('ingest/batch:', err);
    res.status(500).json({ error: 'Failed to ingest batch' });
  }
});

// ── Core insert ───────────────────────────────────────────────────────────────

async function insertMany(events, clientName) {
  const ids = [];
  for (const e of events) {
    const result = await pool.query(
      `INSERT INTO siem_events
         (source_name, event_type, severity, source_ip, destination_ip,
          username, hostname, raw_log, normalized, tags, client_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        e.source_name || clientName,
        e.event_type || 'generic',
        e.severity || 'info',
        e.source_ip || null,
        e.destination_ip || null,
        e.username || null,
        e.hostname || null,
        e.raw_log || null,
        JSON.stringify(e.normalized || {}),
        e.tags || [],
        clientName,
      ]
    );
    const id = result.rows[0].id;
    ids.push(id);
    evaluateRules(id, e).catch(() => {});
  }
  return ids;
}

async function evaluateRules(eventId, event) {
  const rules = await pool.query(`SELECT * FROM siem_rules WHERE enabled = true`);
  for (const rule of rules.rows) {
    const logic = rule.logic;
    let matched = false;
    if (logic.type === 'pattern' && logic.event_type === event.event_type) matched = true;
    if (!matched) continue;

    await pool.query(
      `INSERT INTO siem_alerts
         (rule_id, rule_name, event_id, severity, source_ip, username, hostname, description, client_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        rule.id, rule.name, eventId, rule.severity,
        event.source_ip, event.username, event.hostname,
        `Rule "${rule.name}" matched on event from ${event.source_name || 'unknown'}`,
        event.client_name || null,
      ]
    ).catch(() => {});

    pool.query(`UPDATE siem_rules SET hit_count = hit_count + 1 WHERE id = $1`, [rule.id]).catch(() => {});
  }
}

module.exports = router;
