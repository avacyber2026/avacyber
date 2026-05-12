const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const pool = require('../db/pool');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { decodeMultipartUtf8Filename } = require('../lib/multipartFilename');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../uploads');

const adminAvatarStorage = multer.diskStorage({
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
const adminAvatarUpload = multer({
  storage: adminAvatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images (JPEG, PNG, GIF, WebP) allowed'));
  },
});

function deleteStoredAvatarFile(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return;
  const trimmed = avatarUrl.trim();
  if (!trimmed.startsWith('/uploads/')) return;
  const filePath = path.join(UPLOADS_DIR, path.basename(trimmed));
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
}

router.use(authMiddleware);
router.use(requireAdmin);

// List all users (profile fields included when columns exist)
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, role, approved, rejection_comment, created_at,
              first_name AS "firstName", last_name AS "lastName",
              job_title AS "jobTitle", department,
              avatar_url AS "avatarUrl",
              manager_email AS "managerEmail"
       FROM users
       ORDER BY approved ASC, created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List all tickets (requests) for admin
router.get('/tickets', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, text, status, priority, created_by, assigned_to, type, answer, created_at, siem_alert_id
       FROM tickets
       ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin get tickets error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const TICKET_PRIORITIES = ['Low', 'Medium', 'High'];
const TICKET_STATUSES = ['New', 'Active', 'Resolved'];
const TICKET_TYPES = ['Security Announcement', 'Activity Verification', 'Communication Channel'];

// Update any ticket field (admin)
router.patch('/tickets/:id', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const body = req.body || {};
    const ex = await pool.query('SELECT id FROM tickets WHERE id = $1', [id]);
    if (ex.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const updates = [];
    const values = [];
    let n = 1;

    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (!t) return res.status(400).json({ error: 'Title cannot be empty' });
      updates.push(`title = $${n++}`);
      values.push(t);
    }
    if (body.text !== undefined) {
      updates.push(`text = $${n++}`);
      values.push(String(body.text ?? ''));
    }
    if (body.status !== undefined) {
      const s = String(body.status).trim();
      if (!TICKET_STATUSES.includes(s)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push(`status = $${n++}`);
      values.push(s);
    }
    if (body.priority !== undefined) {
      const p = String(body.priority).trim();
      if (!TICKET_PRIORITIES.includes(p)) {
        return res.status(400).json({ error: 'Invalid priority' });
      }
      updates.push(`priority = $${n++}`);
      values.push(p);
    }
    if (body.type !== undefined) {
      const ty = String(body.type).trim();
      if (!TICKET_TYPES.includes(ty)) {
        return res.status(400).json({ error: 'Invalid type' });
      }
      updates.push(`type = $${n++}`);
      values.push(ty);
    }
    if (body.created_by !== undefined) {
      const c = String(body.created_by).trim();
      if (!c) return res.status(400).json({ error: 'Created by cannot be empty' });
      updates.push(`created_by = $${n++}`);
      values.push(c);
    }
    if (body.assigned_to !== undefined) {
      const a = String(body.assigned_to).trim();
      if (!a) return res.status(400).json({ error: 'Assigned to cannot be empty' });
      updates.push(`assigned_to = $${n++}`);
      values.push(a);
    }
    if (body.answer !== undefined) {
      updates.push(`answer = $${n++}`);
      values.push(String(body.answer ?? ''));
    }
    if (body.siem_alert_id !== undefined || body.siemAlertId !== undefined) {
      const raw = body.siem_alert_id !== undefined ? body.siem_alert_id : body.siemAlertId;
      const v =
        raw == null || String(raw).trim() === ''
          ? null
          : String(raw).trim().slice(0, 255);
      updates.push(`siem_alert_id = $${n++}`);
      values.push(v);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${n}
       RETURNING id, title, text, status, priority, created_by, assigned_to, type, answer, created_at, siem_alert_id`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin patch ticket error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve user
router.patch('/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users SET approved = true, rejection_comment = NULL
       WHERE id = $1
       RETURNING id, email, role, approved, rejection_comment`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin approve error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject user (with optional comment)
router.patch('/users/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body || {};
    const result = await pool.query(
      `UPDATE users SET approved = false, rejection_comment = $2
       WHERE id = $1
       RETURNING id, email, role, approved, rejection_comment`,
      [id, comment != null ? String(comment) : null]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin reject error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const ALLOWED_ROLES = ['End-User', 'Security Manager', 'GSOC', 'GRC', 'IAM', 'Pentesting'];

// Upload avatar file for a user (multipart field "avatar")
router.post('/users/:id/avatar', (req, res, next) => {
  adminAvatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large (max 2MB)' });
      return res.status(400).json({ error: err.message || 'Invalid file' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const ex = await pool.query('SELECT id, avatar_url FROM users WHERE id = $1', [id]);
    if (ex.rows.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'User not found' });
    }
    deleteStoredAvatarFile(ex.rows[0].avatar_url);
    const avatarUrl = `/uploads/${req.file.filename}`;
    const result = await pool.query(
      `UPDATE users SET avatar_url = $1 WHERE id = $2
       RETURNING id, email, role, approved, rejection_comment, created_at,
         first_name AS "firstName", last_name AS "lastName",
         job_title AS "jobTitle", department, avatar_url AS "avatarUrl"`,
      [avatarUrl, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin avatar upload error:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove user avatar (and delete local upload file if any)
router.delete('/users/:id/avatar', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const r = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [id]);
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    deleteStoredAvatarFile(r.rows[0].avatar_url);
    const result = await pool.query(
      `UPDATE users SET avatar_url = NULL WHERE id = $1
       RETURNING id, email, role, approved, rejection_comment, created_at,
         first_name AS "firstName", last_name AS "lastName",
         job_title AS "jobTitle", department, avatar_url AS "avatarUrl"`,
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin avatar delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user (role, email, profile). Email change cascades to tickets, reports, notifications.
router.patch('/users/:id', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const body = req.body || {};

    const curResult = await pool.query(
      `SELECT id, email FROM users WHERE id = $1`,
      [id]
    );
    if (curResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const oldEmail = String(curResult.rows[0].email || '').trim();

    let newEmail = null;
    if (body.email !== undefined) {
      newEmail = String(body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return res.status(400).json({ error: 'Invalid email' });
      }
    }

    if (newEmail != null && newEmail !== oldEmail.toLowerCase()) {
      const dup = await pool.query(
        'SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER($1) AND id <> $2',
        [newEmail, id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    const sets = [];
    const vals = [];
    let i = 1;

    if (newEmail != null) {
      sets.push(`email = $${i++}`);
      vals.push(newEmail);
    }
    if (body.role !== undefined) {
      const role = String(body.role);
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Valid role required: ' + ALLOWED_ROLES.join(', ') });
      }
      sets.push(`role = $${i++}`);
      vals.push(role);
    }
    if (body.firstName !== undefined) {
      const v = String(body.firstName).trim();
      sets.push(`first_name = $${i++}`);
      vals.push(v ? v.slice(0, 100) : null);
    }
    if (body.lastName !== undefined) {
      const v = String(body.lastName).trim();
      sets.push(`last_name = $${i++}`);
      vals.push(v ? v.slice(0, 100) : null);
    }
    if (body.jobTitle !== undefined) {
      const v = String(body.jobTitle).trim();
      sets.push(`job_title = $${i++}`);
      vals.push(v ? v.slice(0, 200) : null);
    }
    if (body.department !== undefined) {
      const v = String(body.department).trim();
      sets.push(`department = $${i++}`);
      vals.push(v ? v.slice(0, 200) : null);
    }
    if (body.avatarUrl !== undefined) {
      const v = String(body.avatarUrl).trim();
      sets.push(`avatar_url = $${i++}`);
      vals.push(v ? v.slice(0, 4000) : null);
    }
    if (body.managerEmail !== undefined) {
      const raw = body.managerEmail === null || body.managerEmail === '' ? '' : String(body.managerEmail).trim();
      if (raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
        return res.status(400).json({ error: 'Invalid manager email' });
      }
      sets.push(`manager_email = $${i++}`);
      vals.push(raw || null);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (newEmail != null && newEmail !== oldEmail.toLowerCase()) {
        await client.query(
          'UPDATE tickets SET created_by = $1 WHERE LOWER(TRIM(created_by)) = LOWER($2)',
          [newEmail, oldEmail]
        );
        await client.query(
          'UPDATE tickets SET assigned_to = $1 WHERE LOWER(TRIM(assigned_to)) = LOWER($2)',
          [newEmail, oldEmail]
        );
        try {
          await client.query(
            'UPDATE reports SET from_user = $1 WHERE LOWER(TRIM(from_user)) = LOWER($2)',
            [newEmail, oldEmail]
          );
        } catch (_) {}
        try {
          await client.query(
            'UPDATE notifications SET user_email = $1 WHERE LOWER(TRIM(user_email)) = LOWER($2)',
            [newEmail, oldEmail]
          );
        } catch (_) {}
      }
      vals.push(id);
      const q = `UPDATE users SET ${sets.join(', ')} WHERE id = $${i}
        RETURNING id, email, role, approved, rejection_comment, created_at,
          first_name AS "firstName", last_name AS "lastName",
          job_title AS "jobTitle", department, avatar_url AS "avatarUrl",
          manager_email AS "managerEmail"`;
      const result = await client.query(q, vals);
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (and all their requests: created_by or assigned_to = user email)
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userRow = await pool.query('SELECT email FROM users WHERE id = $1', [id]);
    if (userRow.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const email = userRow.rows[0].email;
    await pool.query(
      'DELETE FROM tickets WHERE created_by = $1 OR assigned_to = $1',
      [email]
    );
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete single request (ticket)
router.delete('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tickets WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Admin delete ticket error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get settings (admin)
router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT key, value FROM app_settings WHERE key = 'on_call_phone'"
    );
    const onCallPhone = result.rows[0]?.value || '+1234567890';
    res.json({ onCallPhone });
  } catch (err) {
    console.error('Admin get settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update settings (admin)
router.put('/settings', async (req, res) => {
  try {
    const { onCallPhone } = req.body || {};
    const phone = typeof onCallPhone === 'string' ? onCallPhone.trim() : '+1234567890';
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ('on_call_phone', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [phone || '+1234567890']
    );
    res.json({ onCallPhone: phone || '+1234567890' });
  } catch (err) {
    console.error('Admin update settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- User guide articles (blog), full CRUD for admins ---

router.get('/guide-articles', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, body_html, published, created_at, updated_at
       FROM guide_articles
       ORDER BY updated_at DESC`
    );
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        title: r.title,
        bodyHtml: r.body_html,
        published: r.published,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    );
  } catch (err) {
    console.error('Admin guide-articles list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/guide-articles', async (req, res) => {
  try {
    const { title, bodyHtml, published } = req.body || {};
    const t = String(title ?? '').trim();
    if (!t) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const html = typeof bodyHtml === 'string' ? bodyHtml : '';
    const pub = Boolean(published);
    const result = await pool.query(
      `INSERT INTO guide_articles (title, body_html, published)
       VALUES ($1, $2, $3)
       RETURNING id, title, body_html, published, created_at, updated_at`,
      [t, html, pub]
    );
    const r = result.rows[0];
    res.status(201).json({
      id: r.id,
      title: r.title,
      bodyHtml: r.body_html,
      published: r.published,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  } catch (err) {
    console.error('Admin guide-articles create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/guide-articles/:id', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const { title, bodyHtml, published } = req.body || {};
    const existing = await pool.query('SELECT id FROM guide_articles WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const updates = [];
    const values = [];
    let i = 1;
    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) return res.status(400).json({ error: 'Title cannot be empty' });
      updates.push(`title = $${i++}`);
      values.push(t);
    }
    if (bodyHtml !== undefined) {
      updates.push(`body_html = $${i++}`);
      values.push(typeof bodyHtml === 'string' ? bodyHtml : '');
    }
    if (published !== undefined) {
      updates.push(`published = $${i++}`);
      values.push(Boolean(published));
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await pool.query(
      `UPDATE guide_articles SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, title, body_html, published, created_at, updated_at`,
      values
    );
    const r = result.rows[0];
    res.json({
      id: r.id,
      title: r.title,
      bodyHtml: r.body_html,
      published: r.published,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  } catch (err) {
    console.error('Admin guide-articles patch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/guide-articles/:id', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const result = await pool.query('DELETE FROM guide_articles WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Admin guide-articles delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
