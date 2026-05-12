const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET my notifications (unread first)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { email } = req.user;
    const result = await pool.query(
      `SELECT id, title, body, read_at as "readAt", created_at as "createdAt",
              ticket_id as "ticketId", report_id as "reportId"
       FROM notifications WHERE user_email = $1
       ORDER BY read_at NULLS FIRST, created_at DESC`,
      [email]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH mark as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { email } = req.user;
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE notifications SET read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_email = $2
       RETURNING id, read_at as "readAt"`,
      [id, email]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST mark all as read
router.post('/read-all', authMiddleware, async (req, res) => {
  try {
    const { email } = req.user;
    await pool.query(
      `UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_email = $1 AND read_at IS NULL`,
      [email]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
