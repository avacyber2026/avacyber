const express = require('express');
const ExcelJS = require('exceljs');
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /export/xlsx — Security Manager only
router.get('/xlsx', authMiddleware, requireRole('Security Manager'), async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (date_from) {
      conditions.push(`r.created_at >= $${idx}`);
      params.push(new Date(date_from));
      idx++;
    }
    if (date_to) {
      const to = new Date(date_to);
      to.setHours(23, 59, 59, 999);
      conditions.push(`r.created_at <= $${idx}`);
      params.push(to);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await pool.query(
      `SELECT
         r.created_at as "dateGenerated",
         r.id as "incidentId",
         COALESCE(r.siem_assignee, r.answer_user, '') as "assignee",
         COALESCE(r.siem_incident_id, '') as "siemField",
         COALESCE(r.ai_category, '') as "aiField",
         r.subject as "incidentSubject",
         r.sla_ack_at as "timeInProgress",
         CASE WHEN r.pipeline_status = 'resolved' THEN COALESCE(r.resolved_at, r.updated_at) ELSE NULL END as "timeResolved",
         r.priority,
         r.pipeline_status as "pipelineStatus",
         r.from_user as "fromUser",
         r.sla_breached as "slaBreached"
       FROM reports r ${where}
       ORDER BY r.created_at DESC`,
      params
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SecureConnect';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Incident Report');

    sheet.columns = [
      { header: 'Date of Incident Generation', key: 'dateGenerated', width: 22 },
      { header: 'Incident ID', key: 'incidentId', width: 14 },
      { header: 'Assignee', key: 'assignee', width: 22 },
      { header: 'SIEM Field', key: 'siemField', width: 20 },
      { header: 'AI Field', key: 'aiField', width: 20 },
      { header: 'Incident Subject', key: 'incidentSubject', width: 40 },
      { header: 'Time of Status In Progress', key: 'timeInProgress', width: 24 },
      { header: 'Time of Status Resolved', key: 'timeResolved', width: 24 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Pipeline Status', key: 'pipelineStatus', width: 16 },
      { header: 'Reporter', key: 'fromUser', width: 24 },
      { header: 'SLA Breached', key: 'slaBreached', width: 14 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, size: 11 };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6A5C' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

    for (const row of result.rows) {
      sheet.addRow({
        dateGenerated: row.dateGenerated ? new Date(row.dateGenerated) : null,
        incidentId: row.incidentId,
        assignee: row.assignee,
        siemField: row.siemField,
        aiField: row.aiField,
        incidentSubject: row.incidentSubject,
        timeInProgress: row.timeInProgress ? new Date(row.timeInProgress) : null,
        timeResolved: row.timeResolved ? new Date(row.timeResolved) : null,
        priority: row.priority,
        pipelineStatus: row.pipelineStatus,
        fromUser: row.fromUser,
        slaBreached: row.slaBreached ? 'Yes' : 'No',
      });
    }

    // Format date columns
    ['A', 'G', 'H'].forEach((col) => {
      sheet.getColumn(col).numFmt = 'yyyy-mm-dd hh:mm';
    });

    // Audit log
    try {
      await pool.query(
        `INSERT INTO export_audit_log (user_email, export_type, date_from, date_to, row_count)
         VALUES ($1, 'xlsx', $2, $3, $4)`,
        [req.user.email, date_from || null, date_to || null, result.rows.length]
      );
    } catch (e) {
      if (e.code !== '42P01') console.error('Export audit log error:', e.message);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="incident-report-${new Date().toISOString().slice(0, 10)}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export XLSX error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;
