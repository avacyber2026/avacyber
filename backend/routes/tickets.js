const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { createInAppNotification, looksLikeUserEmail } = require('../lib/inAppNotification');
const { decodeMultipartUtf8Filename } = require('../lib/multipartFilename');

const router = express.Router();

const TICKETS_UPLOAD_DIR = path.join(__dirname, '../uploads/tickets');
const ticketUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(TICKETS_UPLOAD_DIR)) fs.mkdirSync(TICKETS_UPLOAD_DIR, { recursive: true });
      cb(null, TICKETS_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      file.originalname = decodeMultipartUtf8Filename(file.originalname);
      const ext = path.extname(file.originalname || '').slice(0, 24).toLowerCase();
      const safe = ext.replace(/[^a-z0-9.]/g, '') || '.bin';
      cb(null, `tic-${crypto.randomBytes(16).toString('hex')}${safe}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 20 },
});

function multipartTicketsUpload(req, res, next) {
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('multipart/form-data')) return next();
  return ticketUpload.array('files', 20)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'File upload error' });
    next();
  });
}

async function cleanupTicketDiskFiles(files) {
  for (const f of files || []) {
    try {
      if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
    } catch (_) {}
  }
}

async function loadAttachmentsByTicketIds(ids) {
  if (!ids.length) return {};
  try {
    const r = await pool.query(
      `SELECT id, ticket_id as "ticketId", original_name as "originalName", stored_name as "storedName"
       FROM ticket_attachments WHERE ticket_id = ANY($1::int[]) ORDER BY id`,
      [ids]
    );
    const by = {};
    for (const a of r.rows) {
      if (!by[a.ticketId]) by[a.ticketId] = [];
      by[a.ticketId].push({
        id: a.id,
        originalName: a.originalName,
        url: `/uploads/${a.storedName}`,
      });
    }
    return by;
  } catch (e) {
    if (e.code === '42P01') return {};
    throw e;
  }
}

const TEAM_ROLES = ['GRC', 'IAM', 'Pentesting'];
const ROLE_TO_TEAM = { GRC: 'GRC', IAM: 'IAM', Pentesting: 'Pentesting' };

function canAccessTicket(req, row) {
  if (!row) return false;
  const { role, email } = req.user;
  if (role === 'Security Manager' || role === 'GSOC' || role === 'Admin') return true;
  if (role === 'End-User' && row.assigned_to === email) return true;
  if (TEAM_ROLES.includes(role) && row.assigned_to === ROLE_TO_TEAM[role]) return true;
  return false;
}

async function fetchTicketRow(id) {
  const r = await pool.query(
    `SELECT id, title, text, status, priority, type, answer,
            answer_type as "answerType", answer_comment as "answerComment",
            created_at as "createdAt",
            created_by as "createdBy", assigned_to as "assignedTo",
            siem_alert_id as "siemAlertId"
     FROM tickets WHERE id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

function mapTicketForClient(row, role) {
  const createdAt = row.createdAt ?? row.created_at ?? null;
  const siemAlertId = row.siemAlertId ?? row.siem_alert_id ?? null;
  const answerType = row.answerType ?? row.answer_type ?? null;
  const answerComment = row.answerComment ?? row.answer_comment ?? null;
  const attachmentCount =
    row.attachmentCount != null ? Number(row.attachmentCount) : undefined;
  const attachments = row.attachments;
  const recipients = row.recipients;
  if (role === 'End-User' || TEAM_ROLES.includes(role)) {
    return {
      id: row.id,
      title: row.title,
      text: row.text,
      status: row.status,
      priority: row.priority,
      type: row.type,
      answer: row.answer,
      answerType,
      answerComment,
      createdAt,
      fromUser: row.createdBy,
      siemAlertId,
      ...(attachmentCount != null && !Number.isNaN(attachmentCount) ? { attachmentCount } : {}),
      ...(attachments ? { attachments } : {}),
    };
  }
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    status: row.status,
    priority: row.priority,
    type: row.type,
    answer: row.answer,
    answerType,
    answerComment,
    createdAt,
    fromUser: row.assignedTo,
    createdBy: row.createdBy,
    assignedTo: row.assignedTo,
    siemAlertId,
    ...(attachmentCount != null && !Number.isNaN(attachmentCount) ? { attachmentCount } : {}),
    ...(attachments ? { attachments } : {}),
    ...(recipients ? { recipients } : {}),
  };
}

// Get tickets - End-User sees assigned to them; GRC/IAM/Pentesting see assigned to team; GSOC/Management see all
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { role, email } = req.user;

    let result;
    const attCountSql = `(SELECT COUNT(*)::int FROM ticket_attachments ta WHERE ta.ticket_id = `;
    if (role === 'End-User') {
      result = await pool.query(
        `SELECT t.id, t.title, t.text, t.status, t.priority, t.created_by as "fromUser", t.type, t.answer,
                t.answer_type as "answerType", t.answer_comment as "answerComment",
                t.created_at as "createdAt", t.siem_alert_id as "siemAlertId",
                ${attCountSql}t.id) as "attachmentCount"
         FROM tickets t
         LEFT JOIN ticket_recipients tr ON tr.ticket_id = t.id AND tr.user_email = $1
         WHERE t.assigned_to = $1 OR tr.user_email IS NOT NULL
         ORDER BY t.created_at DESC NULLS LAST, t.id DESC`,
        [email]
      );
    } else if (TEAM_ROLES.includes(role)) {
      const team = ROLE_TO_TEAM[role];
      result = await pool.query(
        `SELECT id, title, text, status, priority, created_by as "fromUser", type, answer,
                created_at as "createdAt", siem_alert_id as "siemAlertId",
                ${attCountSql}tickets.id) as "attachmentCount"
         FROM tickets WHERE assigned_to = $1
         ORDER BY created_at DESC NULLS LAST, id DESC`,
        [team]
      );
    } else {
      result = await pool.query(
        `SELECT t.id, t.title, t.text, t.status, t.priority, t.created_by as "createdBy",
                t.assigned_to as "fromUser", t.assigned_to as "assignedTo", t.type, t.answer,
                t.answer_type as "answerType", t.answer_comment as "answerComment",
                t.created_at as "createdAt", u.role as "createdByRole",
                t.siem_alert_id as "siemAlertId",
                ${attCountSql}t.id) as "attachmentCount",
                (SELECT COUNT(*)::int FROM ticket_recipients tr2 WHERE tr2.ticket_id = t.id) as "recipientCount",
                (SELECT COUNT(*)::int FROM ticket_recipients tr3 WHERE tr3.ticket_id = t.id AND tr3.acknowledged_at IS NOT NULL) as "acknowledgedCount"
         FROM tickets t
         LEFT JOIN users u ON LOWER(TRIM(u.email)) = LOWER(TRIM(t.created_by))
         ORDER BY t.id DESC`,
        []
      );
    }

    const rows = result.rows.map((r) => ({
      ...r,
      createdAt: r.createdAt ?? r.created_at ?? null,
    }));
    res.json(rows);
  } catch (err) {
    console.error('Get tickets error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create ticket - Management / GSOC only (JSON or multipart with optional files)
router.post(
  '/',
  authMiddleware,
  requireRole('Security Manager', 'GSOC'),
  multipartTicketsUpload,
  async (req, res) => {
    const files = req.files || [];
    try {
      const body = req.body || {};
      const toWhom = String(body.toWhom ?? '').trim();
      const userEmail = body.user != null ? String(body.user).trim() : '';
      const subject = String(body.subject ?? '').trim();
      const description = String(body.description ?? '').trim();
      const priority = String(body.priority ?? '').trim();
      const type = String(body.type ?? '').trim();

      if (!toWhom || !subject || !description || !priority || !type) {
        await cleanupTicketDiskFiles(files);
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const rawSiem = body.siemAlertId ?? body.siem_alert_id;
      const hasSiemInBody = rawSiem !== undefined && rawSiem !== null && String(rawSiem).trim() !== '';
      if (hasSiemInBody && type !== 'Activity Verification') {
        await cleanupTicketDiskFiles(files);
        return res.status(400).json({ error: 'SIEM alert ID is only allowed for Activity Verification' });
      }
      let siemAlertId = null;
      if (type === 'Activity Verification' && hasSiemInBody) {
        siemAlertId = String(rawSiem).trim().slice(0, 255);
      }

      const allowedToWhom = ['User', 'GRC', 'IAM', 'Pentesting'];
      if (!allowedToWhom.includes(toWhom)) {
        await cleanupTicketDiskFiles(files);
        return res.status(400).json({ error: 'Invalid To Whom' });
      }
      const rawUsers = body.users;
      const userEmails = Array.isArray(rawUsers)
        ? rawUsers.map((e) => String(e).trim()).filter(Boolean)
        : userEmail ? [userEmail] : [];

      let assignedTo;
      if (toWhom === 'User') {
        if (!userEmails.length) {
          await cleanupTicketDiskFiles(files);
          return res.status(400).json({ error: 'User email required when To Whom is User' });
        }
        assignedTo = userEmails.length === 1 ? userEmails[0] : 'MULTI';
      } else {
        assignedTo = toWhom;
      }
      const allowedTypes = toWhom === 'User'
        ? ['Security Announcement', 'Activity Verification']
        : ['Security Announcement', 'Communication Channel'];
      if (!allowedTypes.includes(type)) {
        await cleanupTicketDiskFiles(files);
        return res.status(400).json({ error: 'Invalid type for selected To Whom' });
      }

      const client = await pool.connect();
      let created;
      try {
        await client.query('BEGIN');
        const result = await client.query(
          `INSERT INTO tickets (title, text, status, priority, created_by, assigned_to, type, answer, siem_alert_id)
           VALUES ($1, $2, 'New', $3, $4, $5, $6, '', $7)
           RETURNING id, title, text, status, priority, assigned_to as "fromUser", type, answer,
                     siem_alert_id as "siemAlertId"`,
          [subject, description, priority, req.user.email, assignedTo, type, siemAlertId]
        );
        created = result.rows[0];
        const ticketId = created.id;
        for (const f of files) {
          await client.query(
            `INSERT INTO ticket_attachments (ticket_id, stored_name, original_name, mime, size_bytes)
             VALUES ($1, $2, $3, $4, $5)`,
            [ticketId, `tickets/${f.filename}`, f.originalname || f.filename, f.mimetype || null, f.size ?? null]
          );
        }
        if (toWhom === 'User' && userEmails.length > 1) {
          for (const email of userEmails) {
            await client.query(
              `INSERT INTO ticket_recipients (ticket_id, user_email) VALUES ($1, $2)
               ON CONFLICT (ticket_id, user_email) DO NOTHING`,
              [ticketId, email]
            );
          }
        }
        await client.query('COMMIT');
      } catch (e) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {}
        await cleanupTicketDiskFiles(files);
        if (e.code === '42P01') {
          return res.status(503).json({ error: 'ticket_attachments table missing; run db migration' });
        }
        throw e;
      } finally {
        client.release();
      }

      if (toWhom === 'User' && userEmails.length > 1) {
        for (const recipientEmail of userEmails) {
          if (looksLikeUserEmail(recipientEmail)) {
            await createInAppNotification(
              recipientEmail.trim(),
              'New incident assigned to you',
              `You have a new request: "${subject}" (#${created.id}).`,
              { ticketId: created.id }
            );
          }
        }
      } else if (looksLikeUserEmail(assignedTo)) {
        await createInAppNotification(
          assignedTo.trim(),
          'New incident assigned to you',
          `You have a new request: "${subject}" (#${created.id}).`,
          { ticketId: created.id }
        );
      }

      res.status(201).json(created);
    } catch (err) {
      console.error('Create ticket error:', err);
      await cleanupTicketDiskFiles(files);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Timeline entries for ticket
router.get('/:id/timeline', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const row = await fetchTicketRow(id);
    if (!row) return res.status(404).json({ error: 'Ticket not found' });
    if (!canAccessTicket(req, row)) return res.status(403).json({ error: 'Forbidden' });

    const entries = await pool.query(
      `SELECT te.id, te.author_email as "authorEmail", te.body, te.created_at as "createdAt",
        COALESCE(
          NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''),
          te.author_email
        ) as "authorName"
       FROM ticket_timeline_entries te
       LEFT JOIN users u ON LOWER(u.email) = LOWER(te.author_email)
       WHERE te.ticket_id = $1
       ORDER BY te.created_at ASC, te.id ASC`,
      [id]
    );

    const mapped = entries.rows.map((e) => ({
      ...e,
      createdAt: e.createdAt ?? e.created_at ?? null,
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Get ticket timeline error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post(
  '/:id/timeline',
  authMiddleware,
  (req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (!ct.includes('multipart/form-data')) return next();
    return ticketUpload.array('files', 10)(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'File upload error' });
      next();
    });
  },
  async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const ct = req.headers['content-type'] || '';
    const rawBody = req.body?.body ?? req.body?.text ?? '';
    const body = typeof rawBody === 'string' ? rawBody.trim() : '';
    const files = ct.includes('multipart/form-data') ? req.files || [] : [];

    if (!body && !files.length) {
      await cleanupTicketDiskFiles(files);
      return res.status(400).json({ error: 'Body or file required' });
    }

    const row = await fetchTicketRow(id);
    if (!row) {
      await cleanupTicketDiskFiles(files);
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!canAccessTicket(req, row)) {
      await cleanupTicketDiskFiles(files);
      return res.status(403).json({ error: 'Forbidden' });
    }

    const origin = `${req.protocol}://${req.get('host') || ''}`;
    const linkLines = [];
    for (const f of files) {
      const safeName = String(f.originalname || f.filename || 'file').replace(/[[\]]/g, '');
      const path = `/uploads/tickets/${f.filename}`;
      const href = origin ? `${origin}${path}` : path;
      linkLines.push(`[${safeName}](${href})`);
    }
    let finalBody = body;
    if (linkLines.length) {
      const block = linkLines.join('\n');
      finalBody = body ? `${body}\n\n${block}` : block;
    }

    const client = await pool.connect();
    let ins;
    try {
      await client.query('BEGIN');
      ins = await client.query(
        `INSERT INTO ticket_timeline_entries (ticket_id, author_email, body)
         VALUES ($1, $2, $3)
         RETURNING id, author_email as "authorEmail", body, created_at as "createdAt"`,
        [id, req.user.email, finalBody]
      );
      for (const f of files) {
        await client.query(
          `INSERT INTO ticket_attachments (ticket_id, stored_name, original_name, mime, size_bytes)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, `tickets/${f.filename}`, f.originalname || f.filename, f.mimetype || null, f.size ?? null]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      await cleanupTicketDiskFiles(files);
      if (e.code === '42P01') {
        return res.status(503).json({ error: 'Timeline or attachments table missing; run db migration' });
      }
      throw e;
    } finally {
      client.release();
    }
    const created = ins.rows[0];
    const u = await pool.query(
      'SELECT first_name, last_name FROM users WHERE LOWER(email) = LOWER($1)',
      [req.user.email]
    );
    const urow = u.rows[0];
    const authorName =
      urow && (urow.first_name || urow.last_name)
        ? `${urow.first_name || ''} ${urow.last_name || ''}`.trim()
        : req.user.email;

    const author = (req.user.email || '').toLowerCase();
    const createdByLower = (row.createdBy || '').toLowerCase();
    const assignRaw = row.assignedTo;
    const recipients = new Set();
    if (row.createdBy && createdByLower !== author) recipients.add(row.createdBy);
    if (looksLikeUserEmail(assignRaw) && assignRaw.toLowerCase().trim() !== author) {
      recipients.add(assignRaw.trim());
    }
    const previewSource = body || (files.length ? `${files.length} file(s)` : '');
    const preview = previewSource.length > 140 ? `${previewSource.slice(0, 140)}…` : previewSource;
    for (const to of recipients) {
      await createInAppNotification(
        to,
        'New comment on incident',
        `Ticket #${id} "${row.title}": ${preview}`,
        { ticketId: id }
      );
    }

    res.status(201).json({
      ...created,
      createdAt: created.createdAt ?? created.created_at ?? null,
      authorName,
    });
  } catch (err) {
    console.error('Post ticket timeline error:', err);
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'Timeline table missing; run db migration' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Single ticket (same visibility as list)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const row = await fetchTicketRow(id);
    if (!row) return res.status(404).json({ error: 'Ticket not found' });
    if (!canAccessTicket(req, row)) return res.status(403).json({ error: 'Forbidden' });

    const attMap = await loadAttachmentsByTicketIds([id]);
    const rowWithAtt = { ...row, attachments: attMap[id] || [] };
    const { role } = req.user;
    if (role === 'Security Manager' || role === 'GSOC' || role === 'Admin') {
      try {
        const recResult = await pool.query(
          `SELECT user_email as "userEmail", acknowledged_at as "acknowledgedAt", reply_text as "replyText", created_at as "createdAt"
           FROM ticket_recipients WHERE ticket_id = $1 ORDER BY id`,
          [id]
        );
        rowWithAtt.recipients = recResult.rows;
      } catch (e) {
        if (e.code !== '42P01') throw e;
        rowWithAtt.recipients = [];
      }
    }
    res.json(mapTicketForClient(rowWithAtt, role));
  } catch (err) {
    console.error('Get ticket error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Structured answer for Security Announcement / Activity Verification
router.patch('/:id/structured-answer', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' });
    const row = await fetchTicketRow(id);
    if (!row) return res.status(404).json({ error: 'Ticket not found' });

    const { role, email } = req.user;
    const { answerType, comment } = req.body || {};
    const ticketType = row.type;

    if (ticketType === 'Security Announcement') {
      // Multi-recipient: check ticket_recipients
      let isRecipient = false;
      try {
        const recCheck = await pool.query(
          'SELECT id FROM ticket_recipients WHERE ticket_id = $1 AND user_email = $2',
          [id, email]
        );
        isRecipient = recCheck.rows.length > 0;
      } catch (e) {
        if (e.code !== '42P01') throw e;
      }

      if (isRecipient) {
        await pool.query(
          `UPDATE ticket_recipients SET acknowledged_at = COALESCE(acknowledged_at, CURRENT_TIMESTAMP),
             reply_text = COALESCE($3, reply_text)
           WHERE ticket_id = $1 AND user_email = $2`,
          [id, email, comment || null]
        );
        // Check if all recipients acknowledged -> auto-resolve
        const stats = await pool.query(
          `SELECT COUNT(*)::int as total, COUNT(acknowledged_at)::int as acked FROM ticket_recipients WHERE ticket_id = $1`,
          [id]
        );
        const { total, acked } = stats.rows[0];
        if (total > 0 && acked >= total && row.status !== 'Resolved') {
          await pool.query("UPDATE tickets SET status = 'Resolved' WHERE id = $1", [id]);
        }
        const creator = row.createdBy;
        if (creator && creator.toLowerCase() !== email.toLowerCase()) {
          await createInAppNotification(
            creator, 'Announcement acknowledged',
            `"${row.title}" (#${id}): acknowledged by ${email}`,
            { ticketId: id }
          );
        }
        return res.json({ success: true, acknowledged: true });
      }

      // Single-recipient announcement
      if (!canAccessTicket(req, row)) return res.status(403).json({ error: 'Forbidden' });
      await pool.query(
        `UPDATE tickets SET answer_type = 'Acknowledged', answer_comment = COALESCE($2, answer_comment), status = 'Resolved'
         WHERE id = $1`,
        [id, comment || null]
      );
      const creator = row.createdBy;
      if (creator && creator.toLowerCase() !== email.toLowerCase()) {
        await createInAppNotification(
          creator, 'Announcement acknowledged',
          `"${row.title}" (#${id}): acknowledged by ${email}`,
          { ticketId: id }
        );
      }
      return res.json({ success: true, acknowledged: true });
    }

    if (ticketType === 'Activity Verification') {
      if (!canAccessTicket(req, row)) return res.status(403).json({ error: 'Forbidden' });
      const allowed = ['Aware', 'Not Aware', 'Description is not clear'];
      if (!answerType || !allowed.includes(answerType)) {
        return res.status(400).json({ error: `answerType must be one of: ${allowed.join(', ')}` });
      }
      await pool.query(
        `UPDATE tickets SET answer_type = $2, answer_comment = $3, answer = $2, status = 'Resolved'
         WHERE id = $1`,
        [id, answerType, comment || null]
      );
      const creator = row.createdBy;
      if (creator && creator.toLowerCase() !== email.toLowerCase()) {
        const preview = answerType + (comment ? `: ${comment.slice(0, 100)}` : '');
        const isUnclear = answerType === 'Description is not clear';
        await createInAppNotification(
          creator,
          isUnclear ? 'Clarification needed (ticket)' : 'Verification response received',
          isUnclear
            ? `Employee responded "Description is not clear" on "${row.title}" (#${id}). Follow up or rephrase the request.`
            : `"${row.title}" (#${id}): ${preview}`,
          { ticketId: id }
        );
        if (isUnclear) {
          try {
            const emailService = require('../services/emailService');
            await emailService.sendTicketDescriptionUnclearEmail(
              creator, row.title, id, email, comment || ''
            );
          } catch (_) { /* SMTP optional */ }
          try {
            const mgrRes = await pool.query(
              'SELECT manager_email FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))',
              [creator]
            );
            const mgr = mgrRes.rows[0]?.manager_email;
            const mgrTrim = mgr && String(mgr).trim();
            if (mgrTrim && mgrTrim.toLowerCase() !== creator.toLowerCase()) {
              await createInAppNotification(
                mgrTrim,
                'Clarification needed (ticket)',
                `GSOC ticket "${row.title}" (#${id}): employee ${email} — description not clear.`,
                { ticketId: id }
              );
              try {
                const emailService = require('../services/emailService');
                await emailService.sendTicketDescriptionUnclearEmail(
                  mgrTrim, row.title, id, email, comment || ''
                );
              } catch (_) { /* SMTP optional */ }
            }
          } catch (e) {
            if (e.code !== '42703') console.error('Manager notify ticket unclear:', e.message);
          }
        }
      }
      return res.json({ success: true, answerType });
    }

    return res.status(400).json({ error: 'Structured answer not supported for this ticket type' });
  } catch (err) {
    console.error('Structured answer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update ticket answer - End-User or team when assigned to them
router.patch('/:id/answer', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;
    const { role, email } = req.user;

    if (!answer) {
      return res.status(400).json({ error: 'Answer required' });
    }

    const ticket = await pool.query(
      'SELECT id, title, assigned_to, created_by FROM tickets WHERE id = $1',
      [id]
    );
    if (ticket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const trow = ticket.rows[0];
    const assignedTo = trow.assigned_to;
    const canAnswer =
      assignedTo === email ||
      (TEAM_ROLES.includes(role) && assignedTo === ROLE_TO_TEAM[role]);
    if (!canAnswer) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await pool.query(
      `UPDATE tickets SET answer = $1, status = 'Resolved'
       WHERE id = $2
       RETURNING id, title, text, status, priority, created_by as "fromUser", type, answer,
                 siem_alert_id as "siemAlertId"`,
      [answer, id]
    );

    const creator = trow.created_by;
    if (creator && creator.toLowerCase() !== email.toLowerCase()) {
      const ans = String(answer);
      const ansPreview = ans.length > 120 ? `${ans.slice(0, 120)}…` : ans;
      await createInAppNotification(
        creator,
        'Incident marked resolved',
        `"${trow.title}" (#${id}): ${ansPreview}`,
        { ticketId: Number(id) }
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update ticket answer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
