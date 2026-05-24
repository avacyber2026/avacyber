/**
 * Syslog listener — UDP port 514, TCP port 514
 * Receives raw syslog messages, parses them, inserts into siem_events.
 * Runs as a background service alongside the main Express server.
 */
const dgram = require('dgram');
const net = require('net');
const pool = require('../db/pool');
const { normalizeSyslog } = require('./logParser');

const UDP_PORT = process.env.SYSLOG_UDP_PORT || 514;
const TCP_PORT = process.env.SYSLOG_TCP_PORT || 514;

// ── UDP listener ──────────────────────────────────────────────────────────────

function startUDP() {
  const server = dgram.createSocket('udp4');

  server.on('message', (msg, rinfo) => {
    const raw = msg.toString('utf8').trim();
    handleRawSyslog(raw, rinfo.address).catch(console.error);
  });

  server.on('error', (err) => {
    console.error('Syslog UDP error:', err.message);
  });

  server.bind(UDP_PORT, () => {
    console.log(`Syslog UDP listener on port ${UDP_PORT}`);
  });

  return server;
}

// ── TCP listener ──────────────────────────────────────────────────────────────

function startTCP() {
  const server = net.createServer((socket) => {
    const remoteIp = socket.remoteAddress;
    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete last line
      for (const line of lines) {
        const raw = line.trim();
        if (raw) handleRawSyslog(raw, remoteIp).catch(console.error);
      }
    });

    socket.on('end', () => {
      if (buffer.trim()) handleRawSyslog(buffer.trim(), remoteIp).catch(console.error);
    });

    socket.on('error', () => {});
  });

  server.listen(TCP_PORT, () => {
    console.log(`Syslog TCP listener on port ${TCP_PORT}`);
  });

  return server;
}

// ── Core handler ──────────────────────────────────────────────────────────────

async function handleRawSyslog(raw, sourceIp) {
  const event = normalizeSyslog(raw, sourceIp);

  await pool.query(
    `INSERT INTO siem_events
       (source_name, event_type, severity, source_ip, username, hostname, raw_log, normalized, tags, client_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      event.source_name,
      event.event_type,
      event.severity,
      event.source_ip || sourceIp,
      event.username,
      event.hostname,
      raw,
      JSON.stringify(event.normalized),
      event.tags,
      event.client_name || null,
    ]
  );
}

function start() {
  try {
    startUDP();
    startTCP();
  } catch (err) {
    console.warn('Syslog listener could not start (may need root for port 514):', err.message);
    console.warn('Set SYSLOG_UDP_PORT=5514 SYSLOG_TCP_PORT=5514 to use unprivileged ports.');
  }
}

module.exports = { start };
