const WebSocket = require('ws');

/** @type {Map<string, Set<import('ws')>>} */
const clientsByEmail = new Map();

function addChatClient(email, ws) {
  if (!email) return;
  if (!clientsByEmail.has(email)) clientsByEmail.set(email, new Set());
  clientsByEmail.get(email).add(ws);
}

function removeChatClient(email, ws) {
  const set = clientsByEmail.get(email);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) clientsByEmail.delete(email);
}

async function broadcastToChannel(pool, channelId, payload) {
  let members;
  try {
    const { rows } = await pool.query(
      'SELECT user_email FROM chat_members WHERE channel_id = $1',
      [channelId]
    );
    members = rows;
  } catch {
    return;
  }
  const msg = JSON.stringify(payload);
  for (const { user_email } of members) {
    const sockets = clientsByEmail.get(user_email);
    if (!sockets) continue;
    for (const ws of sockets) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
      } catch (_) {}
    }
  }
}

module.exports = { addChatClient, removeChatClient, broadcastToChannel };
