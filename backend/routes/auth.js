const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, passwordConfirm, firstName, lastName } = req.body;
    if (!email || !password || !passwordConfirm) {
      return res.status(400).json({ error: 'Email, password and confirmation required' });
    }
    const first = String(firstName ?? '').trim();
    const last = String(lastName ?? '').trim();
    if (!first || !last) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }
    if (password !== passwordConfirm) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const emailTrimmed = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [emailTrimmed]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (email, password_hash, role, approved, first_name, last_name) VALUES ($1, $2, $3, true, $4, $5)',
      [emailTrimmed, password_hash, 'End-User', first, last]
    );

    res.status(201).json({ message: 'Registration successful. You can sign in.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, role, approved, rejection_comment, first_name, last_name FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    if (!user.approved) {
      return res.status(403).json({
        error: 'Account not approved',
        code: 'NOT_APPROVED',
        rejection_comment: user.rejection_comment || null,
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    const displayName = [user.first_name, user.last_name ? user.last_name[0] + '.' : ''].filter(Boolean).join(' ') || user.email;
    res.json({
      token,
      user: { email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name, displayName },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin panel login (separate credentials table)
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await pool.query(
      'SELECT id, username, password_hash FROM admin_credentials WHERE username = $1',
      [String(username).trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { admin: true, username: admin.username },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({ token, user: { username: admin.username } });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
