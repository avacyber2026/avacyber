/**
 * Report Activity Pipeline Orchestrator.
 * Called after POST /reports and PATCH /reports/:id/supplement.
 * Flow: SIEM lookup -> (no match) AI triage -> GSOC queue.
 */

const pool = require('../db/pool');
const { findOpenIncidents } = require('./siemAdapter');
const { createInAppNotification } = require('../lib/inAppNotification');
const { evaluateMinReportData, buildMinDataNotificationBody } = require('./reportMinData');

async function process(reportId) {
  const reportRes = await pool.query(
    `SELECT id, subject, description, from_user, priority, pipeline_status,
            reporter_email, hostname, incident_at
     FROM reports WHERE id = $1`,
    [reportId]
  );
  if (!reportRes.rows.length) return;
  const report = reportRes.rows[0];

  const email = report.reporter_email || report.from_user;
  const hostname = report.hostname;

  // Минимальные поля до SIEM/GSOC: hostname + время инцидента (поле или в описании)
  const minEval = evaluateMinReportData({
    hostname,
    incident_at: report.incident_at,
    description: report.description,
  });
  if (!minEval.ok) {
    const missingFieldsDisplay = minEval.missing.map((code) =>
      code === 'incident_time' ? 'incident time (when it occurred)' : 'hostname'
    );
    await pool.query(
      `UPDATE reports SET pipeline_status = 'awaiting_user_info',
         ai_is_sufficient = false,
         ai_result = $2::jsonb
       WHERE id = $1`,
      [
        reportId,
        JSON.stringify({
          min_data_gate: true,
          missing_fields: missingFieldsDisplay,
        }),
      ]
    );
    const { title, body } = buildMinDataNotificationBody(minEval);
    await createInAppNotification(report.from_user, title, body, { reportId });
    try {
      const emailService = require('./emailService');
      await emailService.sendReportMinDataRequiredEmail(email, report.subject, reportId, minEval);
    } catch (_) { /* SMTP optional */ }
    return;
  }

  // Step 1: SIEM lookup
  if (report.pipeline_status === 'new' || report.pipeline_status === 'pending_siem') {
    await pool.query("UPDATE reports SET pipeline_status = 'pending_siem' WHERE id = $1", [reportId]);

    try {
      const siemResult = await findOpenIncidents({ email, hostname });

      if (siemResult.found && siemResult.incidents.length > 0) {
        const incident = siemResult.incidents[0];
        await pool.query(
          `UPDATE reports SET pipeline_status = 'siem_linked',
             siem_incident_id = $2, siem_incident_url = $3, siem_assignee = $4
           WHERE id = $1`,
          [reportId, incident.id, incident.url, incident.assignee]
        );

        // Auto-message to user (in-app + email)
        await createInAppNotification(
          report.from_user,
          'Report linked to SIEM incident',
          `Your report "${report.subject}" has been linked to an existing security incident (${incident.id}). Our team is already investigating.`,
          { reportId }
        );
        try {
          const emailService = require('./emailService');
          await emailService.sendSiemMatchedEmail(report.from_user, report.subject, reportId, incident.id);
        } catch (_) { /* email service not available */ }

        // Move to GSOC queue
        await pool.query("UPDATE reports SET pipeline_status = 'ready_gsoc' WHERE id = $1", [reportId]);
        await notifyGsocTeam(reportId, report.subject, 'SIEM match found');
        return;
      }
    } catch (err) {
      console.error('SIEM lookup error for report', reportId, ':', err.message);
    }
  }

  // Step 2: AI triage (only if no SIEM match)
  if (report.pipeline_status === 'new' || report.pipeline_status === 'pending_siem' || report.pipeline_status === 'ai_pending') {
    await pool.query("UPDATE reports SET pipeline_status = 'ai_pending' WHERE id = $1", [reportId]);

    try {
      const reportTriage = require('./reportTriage');
      const aiResult = await reportTriage.triage({
        description: report.description,
        subject: report.subject,
        email,
        hostname,
      });

      await pool.query(
        `UPDATE reports SET ai_result = $2, ai_category = $3, ai_is_sufficient = $4 WHERE id = $1`,
        [reportId, JSON.stringify(aiResult), aiResult.inferred_category || null, aiResult.is_sufficient]
      );

      if (!aiResult.is_sufficient) {
        await pool.query("UPDATE reports SET pipeline_status = 'awaiting_user_info' WHERE id = $1", [reportId]);

        // Notify user about missing fields
        const missingStr = (aiResult.missing_fields || []).join(', ');
        await createInAppNotification(
          report.from_user,
          'Additional information needed',
          `Your report "${report.subject}" needs more details: ${missingStr}. Please update your report.`,
          { reportId }
        );

        // Send email if available
        try {
          const emailService = require('./emailService');
          await emailService.sendMissingFieldsEmail(email, report.subject, reportId, aiResult.missing_fields || []);
        } catch (_) { /* email service not yet available */ }

        return;
      }

      // Sufficient — move to GSOC
      await pool.query("UPDATE reports SET pipeline_status = 'ready_gsoc' WHERE id = $1", [reportId]);
      await notifyGsocTeam(reportId, report.subject, `AI category: ${aiResult.inferred_category || 'unknown'}`);
      return;

    } catch (err) {
      console.error('AI triage error for report', reportId, ':', err.message);
      // Fallback: send to GSOC as-is
      await pool.query(
        `UPDATE reports SET pipeline_status = 'ready_gsoc',
           ai_result = $2
         WHERE id = $1`,
        [reportId, JSON.stringify({ fallback: true, error: err.message })]
      );
      await notifyGsocTeam(reportId, report.subject, 'AI unavailable — manual review needed');
      return;
    }
  }

  // If we get here and status is still 'new', mark ready for GSOC
  if (report.pipeline_status === 'new') {
    await pool.query("UPDATE reports SET pipeline_status = 'ready_gsoc' WHERE id = $1", [reportId]);
    await notifyGsocTeam(reportId, report.subject, 'New report');
  }
}

async function notifyGsocTeam(reportId, subject, detail) {
  try {
    const users = await pool.query(
      "SELECT email FROM users WHERE role IN ('GSOC', 'Security Manager') AND approved = true"
    );
    for (const u of users.rows) {
      await createInAppNotification(
        u.email,
        'New report ready for review',
        `Report "${subject}" (${reportId}): ${detail}`,
        { reportId }
      );
    }
  } catch (err) {
    console.error('Notify GSOC team error:', err.message);
  }
}

module.exports = { process };
