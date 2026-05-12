const WebSocket = require('ws');

/** @type {Map<string, Set<import('ws')>>} */
const clientsByEmail = new Map();

/**
 * @param {string} email
 * @param {import('ws')} ws
 */
function addClient(email, ws) {
  if (!email) return;
  if (!clientsByEmail.has(email)) clientsByEmail.set(email, new Set());
  clientsByEmail.get(email).add(ws);
}

/**
 * @param {string} email
 * @param {import('ws')} ws
 */
function removeClient(email, ws) {
  const set = clientsByEmail.get(email);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) clientsByEmail.delete(email);
}

/**
 * Push a new in-app notification row to all sockets for that user.
 * @param {string} email
 * @param {{ id: number, title: string, body: string, createdAt?: string, ticketId?: number|null, reportId?: string|null }} row
 */
function notifyUser(email, row) {
  const set = clientsByEmail.get(email);
  if (!set || set.size === 0) return;
  const payload = JSON.stringify({
    type: 'notification',
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt,
    ticketId: row.ticketId ?? row.ticket_id ?? null,
    reportId: row.reportId ?? row.report_id ?? null,
  });
  for (const ws of set) {
    try {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    } catch (_) {
      /* ignore */
    }
  }
}

module.exports = { addClient, removeClient, notifyUser };
