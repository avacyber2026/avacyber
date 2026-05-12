const express = require('express');
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get end-users for ticket assignment - Security Manager / GSOC only (email + profile names)
router.get('/end-users', authMiddleware, requireRole('Security Manager', 'GSOC'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        email,
        NULLIF(TRIM(first_name), '') AS "firstName",
        NULLIF(TRIM(last_name), '') AS "lastName"
      FROM users
      WHERE role = 'End-User'
      ORDER BY
        LOWER(COALESCE(TRIM(first_name), '') || ' ' || COALESCE(TRIM(last_name), '')),
        LOWER(email)
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
