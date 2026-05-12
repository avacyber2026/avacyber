const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { createInAppNotification } = require('../lib/inAppNotification');
const { decodeMultipartUtf8Filename } = require('../lib/multipartFilename');

const router = express.Router();

const UPLOADS_ROOT = path.join(__dirname, '../uploads');
const REPORTS_DIR = path.join(UPLOADS_ROOT, 'reports');

const reportUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
      cb(null, REPORTS_DIR);
    },
    filename: (req, file, cb) => {
      file.originalname = decodeMultipartUtf8Filename(file.originalname);
      const ext = path.extname(file.originalname || '').slice(0, 24).toLowerCase();
      const safe = ext.replace(/[^a-z0-9.]/g, '') || '.bin';
      cb(null, `rep-${crypto.randomBytes(16).toString('hex')}${safe}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 20 },
});

function generateReportId() {
  return 'r' + crypto.randomBytes(3).toString('hex');
}

function multipartReportsUpload(req, res, next) {
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('multipart/form-data')) return next();
  return reportUpload.array('files', 20)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'File upload error' });
    next();
  });
}

const SLA_HOURS = { Critical: 1, High: 2, Medium: 3, Low: 4 };
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

function computeSlaDeadline(priority, createdAt) {
  const hours = SLA_HOURS[priority] || 4;
  const d = new Date(createdAt || Date.now());
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

const PIPELINE_FIELDS = `
  r.pipeline_status as "pipelineStatus",
  r.sla_ack_deadline as "slaAckDeadline",
  r.sla_ack_at as "slaAckAt",
  r.sla_breached as "slaBreached",
  r.siem_incident_id as "siemIncidentId",
  r.siem_incident_url as "siemIncidentUrl",
  r.siem_assignee as "siemAssignee",
  r.ai_result as "aiResult",
  r.ai_category as "aiCategory",
  r.ai_is_sufficient as "aiIsSufficient",
  r.reporter_email as "reporterEmail",
  r.hostname as "hostname",
  r.incident_at as "incidentAt",
  r.resolved_at as "resolvedAt"
`;

function stripInternalFields(row, role) {
  if (role === 'End-User') {
    const { aiResult, siemIncidentId, siemIncidentUrl, siemAssignee, aiCategory, aiIsSufficient, ...safe } = row;
    if (safe.pipelineStatus === 'awaiting_user_info' && aiResult && typeof aiResult === 'object') {
      const mf = aiResult.missing_fields;
      if (Array.isArray(mf)) safe.supplementHints = mf;
    }
    return safe;
  }
  return row;
}

async function loadAttachmentsForReports(rows) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  try {
    const att = await pool.query(
      `SELECT id, report_id as "reportId", original_name as "originalName", stored_name as "storedName"
       FROM report_attachments WHERE report_id = ANY($1::varchar[]) ORDER BY id`,
      [ids]
    );
    const byReport = {};
    for (const a of att.rows) {
      if (!byReport[a.reportId]) byReport[a.reportId] = [];
      byReport[a.reportId].push({ id: a.id, originalName: a.originalName, url: `/uploads/${a.storedName}` });
    }
    return rows.map((r) => ({ ...r, attachments: byReport[r.id] || [] }));
  } catch (e) {
    if (e.code === '42P01') return rows.map((r) => ({ ...r, attachments: [] }));
    throw e;
  }
}

// GET reports
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { role, email } = req.user;
    const baseCols = `r.id, r.subject, r.description, r.from_user as "fromUser",
                r.status, r.answer_user as "answerUser", r.priority, r.comment,
                r.created_at as "createdAt", r.updated_at as "updatedAt",
                ${PIPELINE_FIELDS},
                COALESCE(TRIM(u.first_name || ' ' || CASE WHEN u.last_name IS NOT NULL AND u.last_name != '' THEN LEFT(u.last_name, 1) || '.' ELSE '' END), r.from_user) as "reporterDisplay"`;

    let result;
    if (role === 'End-User') {
      result = await pool.query(
        `SELECT ${baseCols}
         FROM reports r LEFT JOIN users u ON u.email = r.from_user
         WHERE r.from_user = $1 ORDER BY r.created_at DESC`,
        [email]
      );
    } else {
      result = await pool.query(
        `SELECT ${baseCols}
         FROM reports r LEFT JOIN users u ON u.email = r.from_user
         ORDER BY r.created_at DESC`,
        []
      );
    }

    const withAtt = await loadAttachmentsForReports(result.rows);
    res.json(withAtt.map((r) => stripInternalFields(r, role)));
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST report
router.post('/', authMiddleware, multipartReportsUpload, async (req, res) => {
  const files = req.files || [];
  try {
    const { email } = req.user;
    const subject = String(req.body.subject ?? '').trim();
    const description = String(req.body.description ?? '').trim();
    const { priority } = req.body;
    const reporterEmail = req.body.reporter_email ? String(req.body.reporter_email).trim() : null;
    const hostname = req.body.hostname ? String(req.body.hostname).trim() : null;
    let incidentAt = null;
    if (req.body.incident_at != null && String(req.body.incident_at).trim() !== '') {
      const d = new Date(String(req.body.incident_at).trim());
      incidentAt = Number.isNaN(d.getTime()) ? null : d.toISOString();
    }

    if (!subject || !description) {
      for (const f of files) { try { if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch (_) {} }
      return res.status(400).json({ error: 'Subject and description required' });
    }

    const id = generateReportId();
    const prio = VALID_PRIORITIES.includes(priority) ? priority : 'Medium';
    const now = new Date();
    const slaDeadline = computeSlaDeadline(prio, now);

    const result = await pool.query(
      `INSERT INTO reports (id, subject, description, from_user, status, answer_user, priority, reporter_email, hostname, incident_at, pipeline_status, sla_ack_deadline)
       VALUES ($1, $2, $3, $4, false, '', $5, $6, $7, $8, 'new', $9)
       RETURNING id, subject, description, from_user as "fromUser", status, answer_user as "answerUser", priority, comment,
                 created_at as "createdAt", updated_at as "updatedAt", pipeline_status as "pipelineStatus",
                 sla_ack_deadline as "slaAckDeadline", reporter_email as "reporterEmail", hostname,
                 incident_at as "incidentAt"`,
      [id, subject, description, email, prio, reporterEmail, hostname, incidentAt, slaDeadline]
    );
    const row = result.rows[0];

    for (const f of files) {
      try {
        await pool.query(
          `INSERT INTO report_attachments (report_id, stored_name, original_name, mime, size_bytes)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, `reports/${f.filename}`, f.originalname || f.filename, f.mimetype || null, f.size ?? null]
        );
      } catch (attErr) {
        console.error('Report attachment insert error:', attErr);
        for (const ff of files) { try { if (ff.path && fs.existsSync(ff.path)) fs.unlinkSync(ff.path); } catch (_) {} }
        await pool.query('DELETE FROM reports WHERE id = $1', [id]);
        return res.status(500).json({ error: 'Could not save attachments' });
      }
    }

    const userRow = await pool.query('SELECT first_name, last_name FROM users WHERE email = $1', [email]);
    const u = userRow.rows[0];
    const reporterDisplay = u && u.first_name && u.last_name ? `${u.first_name} ${u.last_name[0]}.` : email;
    const withAtt = await loadAttachmentsForReports([{ ...row }]);

    // Pipeline processing will be triggered by reportPipeline (phases 4-5)
    // For now we leave it as 'new' / 'ready_gsoc' depending on feature availability
    try {
      const reportPipeline = require('../services/reportPipeline');
      await reportPipeline.process(id);
    } catch (e) {
      // Pipeline not yet available — mark ready for GSOC manually
      await pool.query("UPDATE reports SET pipeline_status = 'ready_gsoc' WHERE id = $1", [id]);
    }

    res.status(201).json({ ...withAtt[0], reporterDisplay });
  } catch (err) {
    console.error('Create report error:', err);
    for (const f of files) { try { if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch (_) {} }
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH resolve report
router.patch('/:id/resolve', authMiddleware, requireRole('Security Manager', 'GSOC'), async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.user;
    const { comment } = req.body || {};

    const result = await pool.query(
      `UPDATE reports SET status = true, answer_user = $1, updated_at = CURRENT_TIMESTAMP,
              comment = COALESCE($3, comment), pipeline_status = 'resolved',
              resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP)
       WHERE id = $2
       RETURNING id, subject, description, from_user as "fromUser", status, answer_user as "answerUser", priority, comment,
                 created_at as "createdAt", updated_at as "updatedAt", pipeline_status as "pipelineStatus",
                 resolved_at as "resolvedAt"`,
      [email, id, comment != null ? String(comment) : null]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    const row = result.rows[0];
    await createInAppNotification(
      row.fromUser, 'Report resolved',
      `Your report "${row.subject}" has been resolved.`,
      { reportId: row.id }
    );
    try {
      const emailService = require('../services/emailService');
      await emailService.sendReportResolvedEmail(row.fromUser, row.subject, row.id, comment || '');
    } catch (_) { /* email service not available */ }
    const userRow = await pool.query('SELECT first_name, last_name FROM users WHERE email = $1', [row.fromUser]);
    const u = userRow.rows[0];
    const reporterDisplay = u && u.first_name && u.last_name ? `${u.first_name} ${u.last_name[0]}.` : row.fromUser;
    const withAtt = await loadAttachmentsForReports([row]);
    res.json({ ...withAtt[0], reporterDisplay });
  } catch (err) {
    console.error('Resolve report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH update pipeline status (GSOC/Manager)
router.patch('/:id/status', authMiddleware, requireRole('Security Manager', 'GSOC'), async (req, res) => {
  try {
    const { id } = req.params;
    const { pipelineStatus } = req.body || {};
    const allowed = ['ready_gsoc', 'in_progress', 'resolved'];
    if (!pipelineStatus || !allowed.includes(pipelineStatus)) {
      return res.status(400).json({ error: `pipelineStatus must be one of: ${allowed.join(', ')}` });
    }

    const current = await pool.query('SELECT pipeline_status, sla_ack_at FROM reports WHERE id = $1', [id]);
    if (!current.rows.length) return res.status(404).json({ error: 'Report not found' });

    const updates = ['pipeline_status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [id, pipelineStatus];

    // SLA ack: when moving to in_progress for the first time
    if (pipelineStatus === 'in_progress' && !current.rows[0].sla_ack_at) {
      updates.push('sla_ack_at = CURRENT_TIMESTAMP');
    }
    if (pipelineStatus === 'resolved') {
      updates.push('status = true');
      updates.push(`answer_user = $${params.length + 1}`);
      params.push(req.user.email);
      updates.push('resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP)');
    }

    const result = await pool.query(
      `UPDATE reports SET ${updates.join(', ')} WHERE id = $1
       RETURNING id, pipeline_status as "pipelineStatus", sla_ack_at as "slaAckAt", resolved_at as "resolvedAt"`,
      params
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update report status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH supplement report (user adds missing info)
router.patch('/:id/supplement', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.user;

    const current = await pool.query('SELECT from_user, pipeline_status FROM reports WHERE id = $1', [id]);
    if (!current.rows.length) return res.status(404).json({ error: 'Report not found' });
    if (current.rows[0].from_user !== email) return res.status(403).json({ error: 'Only report author can supplement' });
    if (current.rows[0].pipeline_status !== 'awaiting_user_info') {
      return res.status(400).json({ error: 'Report is not awaiting supplemental info' });
    }

    const { description, reporter_email, hostname, incident_at } = req.body || {};
    const hasDesc = description && String(description).trim();
    const hasEmail = reporter_email && String(reporter_email).trim();
    const hasHost = hostname && String(hostname).trim();
    const hasIncident =
      incident_at !== undefined && incident_at !== null && String(incident_at).trim() !== '';
    if (!hasDesc && !hasEmail && !hasHost && !hasIncident) {
      return res.status(400).json({ error: 'Provide at least one field to update' });
    }

    const updates = ["pipeline_status = 'pending_siem'", 'updated_at = CURRENT_TIMESTAMP'];
    const params = [id];
    let idx = 2;

    if (description) { updates.push(`description = description || E'\\n---\\n' || $${idx}`); params.push(String(description).trim()); idx++; }
    if (reporter_email) { updates.push(`reporter_email = $${idx}`); params.push(String(reporter_email).trim()); idx++; }
    if (hostname) { updates.push(`hostname = $${idx}`); params.push(String(hostname).trim()); idx++; }
    if (incident_at !== undefined && incident_at !== null && String(incident_at).trim() !== '') {
      const d = new Date(String(incident_at).trim());
      if (!Number.isNaN(d.getTime())) {
        updates.push(`incident_at = $${idx}`);
        params.push(d.toISOString());
        idx++;
      }
    }

    const result = await pool.query(
      `UPDATE reports SET ${updates.join(', ')} WHERE id = $1
       RETURNING id, pipeline_status as "pipelineStatus"`,
      params
    );

    // Re-trigger pipeline (AI step)
    try {
      const reportPipeline = require('../services/reportPipeline');
      await reportPipeline.process(id);
    } catch (_) {
      await pool.query("UPDATE reports SET pipeline_status = 'ready_gsoc' WHERE id = $1", [id]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Supplement report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
