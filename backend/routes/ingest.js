/**
 * Public ingest API — authenticated by API key (X-AVA-API-Key header), not JWT.
 * Clients ship logs here; no user session required.
 *
 * POST /api/v1/ingest/events       — single event
 * POST /api/v1/ingest/events/batch — up to 500 events
 * GET  /api/v1/ingest/health       — liveness check (no auth)
 */
const express = require('express');
const pool = require('../db/pool');
const { apiKeyMiddleware } = require('../middleware/apiKey');

const router = express.Router();

// ── Health (no auth) ──────────────────────────────────────────────────────────

router.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1' });
});

// ── Single event ──────────────────────────────────────────────────────────────

router.post('/events', apiKeyMiddleware, async (req, res) => {
  const { client_name } = req.apiClient;
  try {
    const id = await ingestOne(req.body, client_name);
    res.status(201).json({ id });
  } catch (err) {
    console.error('ingest single:', err);
    res.status(500).json({ error: 'Failed to ingest event' });
  }
});

// ── Batch (up to 500) ─────────────────────────────────────────────────────────

router.post('/events/batch', apiKeyMiddleware, async (req, res) => {
  const events = req.body;
  if (!Array.isArray(events)) return res.status(400).json({ error: 'Body must be a JSON array' });
  if (events.length > 500) return res.status(400).json({ error: 'Max 500 events per batch' });

  const { client_name } = req.apiClient;
  try {
    const ids = await Promise.all(events.map(e => ingestOne(e, client_name)));
    res.status(201).json({ ingested: ids.length, ids });
  } catch (err) {
    console.error('ingest batch:', err);
    res.status(500).json({ error: 'Failed to ingest batch' });
  }
});

// ── Core ingest logic ─────────────────────────────────────────────────────────

async function ingestOne(body, clientName) {
  const {
    source_name, event_type, severity,
    source_ip, destination_ip, username, hostname,
    raw_log, tags, normalized,
  } = body;

  const resolvedSource = source_name || clientName;

  let sourceId = null;
  if (resolvedSource) {
    const src = await pool.query(
      `SELECT id FROM siem_sources WHERE name = $1 LIMIT 1`,
      [resolvedSource]
    );
    if (src.rows.length) {
      sourceId = src.rows[0].id;
      pool.query(
        `UPDATE siem_sources SET last_seen = NOW(), event_count = event_count + 1 WHERE id = $1`,
        [sourceId]
      ).catch(() => {});
    }
  }

  const result = await pool.query(
    `INSERT INTO siem_events
       (source_id, source_name, event_type, severity, source_ip, destination_ip,
        username, hostname, raw_log, normalized, tags, client_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      sourceId,
      resolvedSource,
      event_type || 'generic',
      severity || 'info',
      source_ip || null,
      destination_ip || null,
      username || null,
      hostname || null,
      raw_log || null,
      normalized ? JSON.stringify(normalized) : '{}',
      tags || [],
      clientName,
    ]
  );

  const eventId = result.rows[0].id;
  evaluateRules(eventId, { source_name: resolvedSource, event_type, severity, source_ip, username, hostname }).catch(() => {});
  return eventId;
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
        `Rule "${rule.name}" matched on event from ${event.source_name || 'unknown source'}`,
        event.client_name || null,
      ]
    ).catch(() => {});

    pool.query(`UPDATE siem_rules SET hit_count = hit_count + 1 WHERE id = $1`, [rule.id]).catch(() => {});
  }
}

module.exports = router;
