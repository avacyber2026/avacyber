const cron = require('node-cron');
const pool = require('../db/pool');
const { createInAppNotification } = require('../lib/inAppNotification');

async function checkSlaBreaches() {
  try {
    const result = await pool.query(
      `UPDATE reports
       SET sla_breached = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE sla_ack_deadline < NOW()
         AND sla_ack_at IS NULL
         AND sla_breached = FALSE
         AND pipeline_status = 'ready_gsoc'
       RETURNING id, subject, from_user, priority, sla_ack_deadline`
    );

    for (const report of result.rows) {
      const notified = new Set();
      const users = await pool.query(
        "SELECT email FROM users WHERE role IN ('GSOC', 'Security Manager') AND approved = true"
      );
      for (const u of users.rows) {
        const em = (u.email || '').trim().toLowerCase();
        if (notified.has(em)) continue;
        notified.add(em);
        await createInAppNotification(
          u.email,
          'SLA Breach',
          `Report "${report.subject}" (${report.id}) has breached its SLA deadline. Priority: ${report.priority}`,
          { reportId: report.id }
        );

        try {
          const emailService = require('./emailService');
          await emailService.sendSlaBreachEmail(
            u.email, report.subject, report.id, report.priority,
            report.sla_ack_deadline ? new Date(report.sla_ack_deadline).toISOString() : 'N/A'
          );
        } catch (_) { /* email service not available */ }
      }

      let managers;
      try {
        managers = await pool.query(
          `SELECT DISTINCT TRIM(manager_email) AS me
           FROM users
           WHERE role = 'GSOC' AND approved = true
             AND manager_email IS NOT NULL AND TRIM(manager_email) <> ''`
        );
      } catch (e) {
        if (e.code !== '42703') throw e;
        managers = { rows: [] };
      }
      for (const row of managers.rows || []) {
        const mgr = (row.me || '').trim();
        if (!mgr) continue;
        const key = mgr.toLowerCase();
        if (notified.has(key)) continue;
        notified.add(key);
        await createInAppNotification(
          mgr,
          'SLA Breach (team)',
          `Report "${report.subject}" (${report.id}) was not taken in progress by the deadline. Priority: ${report.priority}`,
          { reportId: report.id }
        );
        try {
          const emailService = require('./emailService');
          await emailService.sendSlaBreachEmail(
            mgr, report.subject, report.id, report.priority,
            report.sla_ack_deadline ? new Date(report.sla_ack_deadline).toISOString() : 'N/A'
          );
        } catch (_) { /* email optional */ }
      }
    }

    if (result.rows.length > 0) {
      console.log(`SLA check: ${result.rows.length} report(s) breached`);
    }
  } catch (err) {
    console.error('SLA cron error:', err);
  }
}

// Also clean up old AI prompt logs (>90 days)
async function cleanOldAiLogs() {
  try {
    await pool.query("DELETE FROM ai_prompt_log WHERE created_at < NOW() - INTERVAL '90 days'");
  } catch (err) {
    if (err.code !== '42P01') console.error('AI log cleanup error:', err);
  }
}

function start() {
  // Every 5 minutes
  cron.schedule('*/5 * * * *', checkSlaBreaches);
  // Daily at 3:00 AM — clean old AI logs
  cron.schedule('0 3 * * *', cleanOldAiLogs);
  console.log('SLA cron jobs started');
}

module.exports = { start, checkSlaBreaches };
