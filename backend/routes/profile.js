const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { decodeMultipartUtf8Filename } = require('../lib/multipartFilename');

const router = express.Router();
const UPLOADS_DIR = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    file.originalname = decodeMultipartUtf8Filename(file.originalname);
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().replace(/jpeg/, 'jpg');
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
    const hash = crypto.randomBytes(8).toString('hex');
    cb(null, `avatar-${hash}${safeExt}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images (JPEG, PNG, GIF, WebP) allowed'));
  },
});

// GET current user profile
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { email } = req.user;
    const result = await pool.query(
      `SELECT email, first_name as "firstName", last_name as "lastName",
              job_title as "jobTitle", department, avatar_url as "avatarUrl",
              COALESCE(holiday_mode, false) as "holidayMode",
              holiday_until as "holidayUntil"
       FROM users WHERE email = $1`,
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const u = result.rows[0];
    const displayName = [u.firstName, u.lastName ? u.lastName[0] + '.' : ''].filter(Boolean).join(' ') || email;
    res.json({ ...u, displayName });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /profile/avatar — upload avatar file
router.post('/avatar', authMiddleware, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large (max 2MB)' });
      return res.status(400).json({ error: err.message || 'Invalid file' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const { email } = req.user;
    const avatarUrl = `/uploads/${req.file.filename}`;

    await pool.query('UPDATE users SET avatar_url = $1 WHERE email = $2', [avatarUrl, email]);

    const result = await pool.query(
      `SELECT email, first_name as "firstName", last_name as "lastName",
              job_title as "jobTitle", department, avatar_url as "avatarUrl",
              COALESCE(holiday_mode, false) as "holidayMode",
              holiday_until as "holidayUntil"
       FROM users WHERE email = $1`,
      [email]
    );
    const u = result.rows[0];
    const displayName = [u.firstName, u.lastName ? u.lastName[0] + '.' : ''].filter(Boolean).join(' ') || email;
    res.json({ ...u, displayName });
  } catch (err) {
    console.error('Avatar upload error:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// DELETE /profile/avatar — remove avatar
router.delete('/avatar', authMiddleware, async (req, res) => {
  try {
    const { email } = req.user;
    const r = await pool.query('SELECT avatar_url FROM users WHERE email = $1', [email]);
    if (r.rows[0]?.avatar_url) {
      const filePath = path.join(UPLOADS_DIR, path.basename(r.rows[0].avatar_url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('UPDATE users SET avatar_url = NULL WHERE email = $1', [email]);

    const result = await pool.query(
      `SELECT email, first_name as "firstName", last_name as "lastName",
              job_title as "jobTitle", department, avatar_url as "avatarUrl",
              COALESCE(holiday_mode, false) as "holidayMode",
              holiday_until as "holidayUntil"
       FROM users WHERE email = $1`,
      [email]
    );
    const u = result.rows[0];
    const displayName = [u.firstName, u.lastName ? u.lastName[0] + '.' : ''].filter(Boolean).join(' ') || email;
    res.json({ ...u, displayName });
  } catch (err) {
    console.error('Avatar delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH current user profile (firstName, lastName, jobTitle, department, holidayMode, holidayUntil)
router.patch('/', authMiddleware, async (req, res) => {
  try {
    const { email } = req.user;
    const { firstName, lastName, jobTitle, department, holidayMode, holidayUntil } = req.body;

    const updates = [];
    const values = [];
    let i = 1;
    if (firstName !== undefined) {
      const t = String(firstName).trim();
      if (!t) return res.status(400).json({ error: 'First name cannot be empty' });
      updates.push(`first_name = $${i++}`);
      values.push(t);
    }
    if (lastName !== undefined) {
      const t = String(lastName).trim();
      if (!t) return res.status(400).json({ error: 'Last name cannot be empty' });
      updates.push(`last_name = $${i++}`);
      values.push(t);
    }
    if (jobTitle !== undefined) { updates.push(`job_title = $${i++}`); values.push(String(jobTitle).trim() || null); }
    if (department !== undefined) { updates.push(`department = $${i++}`); values.push(String(department).trim() || null); }
    if (holidayMode !== undefined) {
      updates.push(`holiday_mode = $${i++}`);
      values.push(Boolean(holidayMode));
    }
    if (holidayUntil !== undefined) {
      const u = holidayUntil == null || String(holidayUntil).trim() === '' ? null : String(holidayUntil).trim();
      updates.push(`holiday_until = $${i++}`);
      values.push(u);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    values.push(email);
    const updateResult = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE email = $${i}`,
      values
    );
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    const result = await pool.query(
      `SELECT email, first_name as "firstName", last_name as "lastName",
              job_title as "jobTitle", department, avatar_url as "avatarUrl",
              COALESCE(holiday_mode, false) as "holidayMode",
              holiday_until as "holidayUntil"
       FROM users WHERE email = $1`,
      [email]
    );
    const u = result.rows[0];
    if (!u) {
      return res.status(404).json({ error: 'User not found' });
    }
    const displayName = [u.firstName, u.lastName ? u.lastName[0] + '.' : ''].filter(Boolean).join(' ') || email;
    res.json({ ...u, displayName });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
