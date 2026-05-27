const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();
router.use(authMiddleware);

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [campaigns, totals, recent] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('draft','completed')) AS active,
        COUNT(*) AS total
        FROM phishing_campaigns`),
      pool.query(`SELECT
        COALESCE(SUM(total_sent),0)     AS sent,
        COALESCE(SUM(total_clicked),0)  AS clicked,
        COALESCE(SUM(total_reported),0) AS reported,
        COALESCE(SUM(total_opened),0)   AS opened
        FROM phishing_campaigns WHERE status = 'completed'`),
      pool.query(`SELECT c.id, c.name, c.type, c.status, c.total_sent, c.total_clicked,
        c.total_reported, c.created_at, t.name AS template_name
        FROM phishing_campaigns c
        LEFT JOIN phishing_templates t ON t.id = c.template_id
        ORDER BY c.created_at DESC LIMIT 5`),
    ]);

    const t = totals.rows[0];
    const sent = parseInt(t.sent) || 0;
    const clicked = parseInt(t.clicked) || 0;
    const reported = parseInt(t.reported) || 0;

    res.json({
      totalCampaigns:  parseInt(campaigns.rows[0].total),
      activeCampaigns: parseInt(campaigns.rows[0].active),
      totalSent:    sent,
      totalClicked: clicked,
      totalReported: reported,
      clickRate:    sent > 0 ? Math.round((clicked / sent) * 100) : 0,
      reportRate:   sent > 0 ? Math.round((reported / sent) * 100) : 0,
      recentCampaigns: recent.rows,
    });
  } catch (err) {
    console.error('phishing stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Campaigns ─────────────────────────────────────────────────────────────────

router.get('/campaigns', async (req, res) => {
  try {
    const rows = await pool.query(`
      SELECT c.*, t.name AS template_name
      FROM phishing_campaigns c
      LEFT JOIN phishing_templates t ON t.id = c.template_id
      ORDER BY c.created_at DESC
    `);
    res.json(rows.rows);
  } catch (err) {
    console.error('phishing campaigns:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.post('/campaigns', async (req, res) => {
  const { name, description, type, template_id, group_ids, scheduled_at } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const status = scheduled_at ? 'scheduled' : 'draft';
    const r = await pool.query(
      `INSERT INTO phishing_campaigns (name, description, type, status, template_id, group_ids, scheduled_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, description || null, type || 'url', status, template_id || null,
       JSON.stringify(group_ids || []), scheduled_at || null, req.user.email || req.user.username]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('phishing create campaign:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.get('/campaigns/:id', async (req, res) => {
  try {
    const [camp, results] = await Promise.all([
      pool.query(`SELECT c.*, t.name AS template_name FROM phishing_campaigns c
        LEFT JOIN phishing_templates t ON t.id = c.template_id WHERE c.id = $1`, [req.params.id]),
      pool.query(`SELECT * FROM phishing_results WHERE campaign_id = $1 ORDER BY sent_at DESC`, [req.params.id]),
    ]);
    if (!camp.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ ...camp.rows[0], results: results.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

router.put('/campaigns/:id', async (req, res) => {
  const { name, description, status, scheduled_at } = req.body;
  try {
    const r = await pool.query(
      `UPDATE phishing_campaigns SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        scheduled_at = COALESCE($4, scheduled_at),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, description, status, scheduled_at, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

router.delete('/campaigns/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM phishing_campaigns WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

router.post('/campaigns/:id/launch', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE phishing_campaigns SET status = 'running', started_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status IN ('draft','scheduled') RETURNING *`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(400).json({ error: 'Campaign cannot be launched' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to launch campaign' });
  }
});

// ── Templates ─────────────────────────────────────────────────────────────────

router.get('/templates', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM phishing_templates ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.post('/templates', async (req, res) => {
  const { name, type, subject, from_name, from_email, html_body, preview_text, category, difficulty } = req.body;
  if (!name || !subject) return res.status(400).json({ error: 'name and subject required' });
  try {
    const r = await pool.query(
      `INSERT INTO phishing_templates (name, type, subject, from_name, from_email, html_body, preview_text, category, difficulty, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, type || 'url', subject, from_name || 'IT Security', from_email || 'security@corp.com',
       html_body || '', preview_text || null, category || 'general', difficulty || 'medium',
       req.user.email || req.user.username]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('phishing create template:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM phishing_templates WHERE id = $1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

router.put('/templates/:id', async (req, res) => {
  const { name, type, subject, from_name, from_email, html_body, preview_text, category, difficulty } = req.body;
  try {
    const r = await pool.query(
      `UPDATE phishing_templates SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        subject = COALESCE($3, subject),
        from_name = COALESCE($4, from_name),
        from_email = COALESCE($5, from_email),
        html_body = COALESCE($6, html_body),
        preview_text = COALESCE($7, preview_text),
        category = COALESCE($8, category),
        difficulty = COALESCE($9, difficulty),
        updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [name, type, subject, from_name, from_email, html_body, preview_text, category, difficulty, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM phishing_templates WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ── User Groups ───────────────────────────────────────────────────────────────

router.get('/groups', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM phishing_user_groups ORDER BY created_at ASC');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

router.post('/groups', async (req, res) => {
  const { name, description, user_emails } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const r = await pool.query(
      `INSERT INTO phishing_user_groups (name, description, user_emails) VALUES ($1,$2,$3) RETURNING *`,
      [name, description || null, JSON.stringify(user_emails || [])]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

router.put('/groups/:id', async (req, res) => {
  const { name, description, user_emails } = req.body;
  try {
    const r = await pool.query(
      `UPDATE phishing_user_groups SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        user_emails = COALESCE($3, user_emails)
       WHERE id = $4 RETURNING *`,
      [name, description, user_emails ? JSON.stringify(user_emails) : null, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update group' });
  }
});

router.delete('/groups/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM phishing_user_groups WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

module.exports = router;
