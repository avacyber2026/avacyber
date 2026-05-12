const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** List published articles (authenticated app users) */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, published, created_at, updated_at, body_html
       FROM guide_articles
       WHERE published = true
       ORDER BY updated_at DESC`
    );
    const rows = result.rows.map(({ body_html, ...rest }) => {
      const plain = stripHtml(body_html);
      const excerpt = plain.length > 280 ? `${plain.slice(0, 280)}…` : plain;
      return { ...rest, excerpt };
    });
    res.json(rows);
  } catch (err) {
    console.error('Guide articles list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Single published article by id */
router.get('/:id', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const result = await pool.query(
      `SELECT id, title, body_html, published, created_at, updated_at
       FROM guide_articles
       WHERE id = $1 AND published = true`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      title: row.title,
      bodyHtml: row.body_html,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    console.error('Guide article get error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
