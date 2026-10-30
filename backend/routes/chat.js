const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { broadcastToChannel } = require('../ws/chatHub');

const router = express.Router();
router.use(authMiddleware);

async function ensureDefaultMembership(email) {
  const { rows } = await pool.query(
    `SELECT id FROM chat_channels WHERE type = 'channel' AND created_by = 'system'`
  );
  for (const { id } of rows) {
    await pool.query(
      `INSERT INTO chat_members (channel_id, user_email) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, email]
    );
  }
}

async function getSenderName(email) {
  try {
    const { rows } = await pool.query(
      `SELECT first_name, last_name FROM user_profiles WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (!rows.length) return email;
    const { first_name, last_name } = rows[0];
    const name = [first_name, last_name].filter(Boolean).join(' ').trim();
    return name || email;
  } catch {
    return email;
  }
}

// GET /chat/channels
router.get('/channels', async (req, res) => {
  const { email } = req.user;
  try {
    await ensureDefaultMembership(email);
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.type, c.created_at,
              (SELECT m.text FROM chat_messages m WHERE m.channel_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT m.created_at FROM chat_messages m WHERE m.channel_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
              CASE WHEN c.type = 'dm' THEN (
                SELECT cm2.user_email FROM chat_members cm2
                WHERE cm2.channel_id = c.id AND cm2.user_email != $1 LIMIT 1
              ) ELSE NULL END AS dm_peer_email
       FROM chat_channels c
       JOIN chat_members cm ON cm.channel_id = c.id AND cm.user_email = $1
       ORDER BY COALESCE(
         (SELECT m.created_at FROM chat_messages m WHERE m.channel_id = c.id ORDER BY m.created_at DESC LIMIT 1),
         c.created_at
       ) DESC`,
      [email]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /chat/channels/:id/messages
router.get('/channels/:id/messages', async (req, res) => {
  const channelId = parseInt(req.params.id);
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before ? parseInt(req.query.before) : null;
  const { email } = req.user;

  if (isNaN(channelId)) return res.status(400).json({ error: 'Invalid channel' });

  const { rows: membership } = await pool.query(
    'SELECT 1 FROM chat_members WHERE channel_id = $1 AND user_email = $2',
    [channelId, email]
  );
  if (!membership.length) return res.status(403).json({ error: 'Not a member' });

  try {
    const { rows } = before
      ? await pool.query(
          `SELECT * FROM chat_messages WHERE channel_id = $1 AND id < $2 ORDER BY created_at DESC LIMIT $3`,
          [channelId, before, limit]
        )
      : await pool.query(
          `SELECT * FROM chat_messages WHERE channel_id = $1 ORDER BY created_at DESC LIMIT $2`,
          [channelId, limit]
        );
    res.json(rows.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /chat/channels/:id/messages
router.post('/channels/:id/messages', async (req, res) => {
  const channelId = parseInt(req.params.id);
  const { text } = req.body;
  const { email } = req.user;

  if (isNaN(channelId)) return res.status(400).json({ error: 'Invalid channel' });
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' });

  const { rows: membership } = await pool.query(
    'SELECT 1 FROM chat_members WHERE channel_id = $1 AND user_email = $2',
    [channelId, email]
  );
  if (!membership.length) return res.status(403).json({ error: 'Not a member' });

  try {
    const senderName = await getSenderName(email);
    const { rows } = await pool.query(
      `INSERT INTO chat_messages (channel_id, sender_email, sender_name, text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [channelId, email, senderName, text.trim()]
    );
    const message = rows[0];
    await broadcastToChannel(pool, channelId, { type: 'chat_message', channel_id: channelId, message });
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /chat/dm
router.post('/dm', async (req, res) => {
  const { peer_email } = req.body;
  const { email: myEmail } = req.user;

  if (!peer_email || peer_email === myEmail) return res.status(400).json({ error: 'Invalid peer' });

  try {
    const { rows: existing } = await pool.query(
      `SELECT c.id FROM chat_channels c
       JOIN chat_members m1 ON m1.channel_id = c.id AND m1.user_email = $1
       JOIN chat_members m2 ON m2.channel_id = c.id AND m2.user_email = $2
       WHERE c.type = 'dm' LIMIT 1`,
      [myEmail, peer_email]
    );
    if (existing.length) return res.json({ id: existing[0].id });

    const { rows: ch } = await pool.query(
      `INSERT INTO chat_channels (type, created_by) VALUES ('dm', $1) RETURNING id`,
      [myEmail]
    );
    const channelId = ch[0].id;
    await pool.query(
      `INSERT INTO chat_members (channel_id, user_email) VALUES ($1, $2), ($1, $3)`,
      [channelId, myEmail, peer_email]
    );
    res.json({ id: channelId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /chat/users
router.get('/users', async (req, res) => {
  const { email } = req.user;
  try {
    const { rows } = await pool.query(
      `SELECT u.email,
              COALESCE(
                NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''),
                u.email
              ) AS name
       FROM users u
       LEFT JOIN user_profiles p ON p.email = u.email
       WHERE u.email != $1 AND (u.role IS NULL OR u.role NOT IN ('Admin', 'End-User'))
       ORDER BY 2`,
      [email]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
