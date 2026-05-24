const pool = require('../db/pool');

async function apiKeyMiddleware(req, res, next) {
  const key = req.headers['x-ava-api-key'];
  if (!key) return res.status(401).json({ error: 'Missing X-AVA-API-Key header' });

  try {
    const result = await pool.query(
      `SELECT id, client_name, enabled FROM siem_api_keys WHERE api_key = $1 LIMIT 1`,
      [key]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid API key' });
    const row = result.rows[0];
    if (!row.enabled) return res.status(403).json({ error: 'API key disabled' });

    pool.query(
      `UPDATE siem_api_keys SET last_used_at = NOW(), event_count = event_count + 1 WHERE id = $1`,
      [row.id]
    ).catch(() => {});

    req.apiClient = { id: row.id, client_name: row.client_name };
    next();
  } catch (err) {
    console.error('API key auth:', err);
    res.status(500).json({ error: 'Auth error' });
  }
}

module.exports = { apiKeyMiddleware };
