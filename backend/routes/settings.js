const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// Public: get on-call phone number (for on-call page)
router.get('/on-call-phone', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT value FROM app_settings WHERE key = 'on_call_phone'"
    );
    const phone = result.rows[0]?.value || '+1234567890';
    res.json({ phone });
  } catch (err) {
    console.error('Settings get on-call-phone error:', err);
    res.status(500).json({ error: 'Server error', phone: '+1234567890' });
  }
});

module.exports = router;
