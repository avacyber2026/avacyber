const pool = require('../db/pool');
const { notifyUser } = require('../ws/notificationHub');

/**
 * @param {string} userEmail
 * @param {string} title
 * @param {string} body
 * @param {{ ticketId?: number | null, reportId?: string | null }} [meta]
 * @returns {Promise<object|null>}
 */
async function createInAppNotification(userEmail, title, body, meta = {}) {
  if (!userEmail || !String(userEmail).trim()) return null;
  const ticketId = meta.ticketId != null && Number.isFinite(Number(meta.ticketId)) ? Number(meta.ticketId) : null;
  const reportId = meta.reportId != null && String(meta.reportId).trim() !== '' ? String(meta.reportId).trim() : null;
  try {
    const ins = await pool.query(
      `INSERT INTO notifications (user_email, title, body, ticket_id, report_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, body, created_at as "createdAt",
                 ticket_id as "ticketId", report_id as "reportId"`,
      [String(userEmail).trim(), title, body, ticketId, reportId]
    );
    const row = ins.rows[0];
    if (row) notifyUser(String(userEmail).trim(), row);
    return row ?? null;
  } catch (err) {
    console.error('createInAppNotification error:', err.message);
    return null;
  }
}

function looksLikeUserEmail(s) {
  return typeof s === 'string' && s.includes('@') && !/\s/.test(s.trim());
}

module.exports = { createInAppNotification, looksLikeUserEmail };
