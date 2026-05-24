/**
 * Log parser — normalizes raw logs from any source into our siem_events schema.
 *
 * Supports:
 *   - Raw syslog (RFC 3164 + RFC 5424)
 *   - Cloudflare Logpush JSON
 *   - JumpCloud Directory Insights JSON
 *   - Generic JSON (best-effort field mapping)
 *   - Plain text fallback
 */

// ── Severity mapping ──────────────────────────────────────────────────────────

const SYSLOG_SEVERITY = {
  0: 'critical', // emergency
  1: 'critical', // alert
  2: 'critical', // critical
  3: 'high',     // error
  4: 'medium',   // warning
  5: 'low',      // notice
  6: 'info',     // informational
  7: 'info',     // debug
};

const SYSLOG_SEVERITY_KEYWORDS = {
  emerg: 'critical', emergency: 'critical',
  alert: 'critical',
  crit: 'critical', critical: 'critical',
  err: 'high', error: 'high',
  warn: 'medium', warning: 'medium',
  notice: 'low',
  info: 'info', informational: 'info',
  debug: 'info',
};

function mapSeverity(raw) {
  if (raw === undefined || raw === null) return 'info';
  if (typeof raw === 'number') return SYSLOG_SEVERITY[raw] || 'info';
  return SYSLOG_SEVERITY_KEYWORDS[String(raw).toLowerCase()] || 'info';
}

// ── Syslog parser (RFC 3164 + RFC 5424) ──────────────────────────────────────

const RFC3164 = /^<(\d+)>(\w{3}\s+\d+\s+[\d:]+)\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s*(.*)$/;
const RFC5424 = /^<(\d+)>(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*(.*)$/;

function normalizeSyslog(raw, sourceIp) {
  let priority, hostname, process_, message;

  const m5424 = raw.match(RFC5424);
  if (m5424) {
    priority = parseInt(m5424[1]);
    hostname = m5424[4] !== '-' ? m5424[4] : null;
    process_ = m5424[5] !== '-' ? m5424[5] : null;
    message = m5424[8] || '';
  } else {
    const m3164 = raw.match(RFC3164);
    if (m3164) {
      priority = parseInt(m3164[1]);
      hostname = m3164[3];
      process_ = m3164[4];
      message = m3164[6] || '';
    } else {
      return plainTextFallback(raw, sourceIp);
    }
  }

  const severityCode = priority % 8;
  const severity = SYSLOG_SEVERITY[severityCode] || 'info';
  const eventType = inferEventType(process_, message);
  const extracted = extractFields(message);

  return {
    source_name: hostname || sourceIp || 'syslog',
    event_type: eventType,
    severity,
    source_ip: extracted.source_ip || sourceIp,
    username: extracted.username || null,
    hostname: hostname || null,
    tags: ['syslog', ...(process_ ? [process_.toLowerCase()] : [])],
    normalized: { priority, process: process_, message, ...extracted },
    client_name: null,
  };
}

// ── Cloudflare Logpush ────────────────────────────────────────────────────────

function normalizeCloudflare(body) {
  const events = Array.isArray(body) ? body : [body];
  return events.map(e => ({
    source_name: 'cloudflare',
    event_type: inferCloudflarEventType(e),
    severity: mapCloudflareSeverity(e),
    source_ip: e.ClientIP || e.OriginIP || null,
    destination_ip: null,
    username: null,
    hostname: e.ClientRequestHost || e.ZoneName || null,
    tags: ['cloudflare', e.Source || e.Kind || 'http'].map(t => t.toLowerCase()),
    normalized: e,
    client_name: null,
  }));
}

function inferCloudflarEventType(e) {
  if (e.Source === 'firewall' || e.Kind === 'firewall') return 'firewall_event';
  if (e.Action === 'block' || e.Action === 'managed_block') return 'network_block';
  if (e.Action === 'drop') return 'ddos_drop';
  if (e.EdgeResponseStatus >= 500) return 'http_error';
  return 'http_request';
}

function mapCloudflareSeverity(e) {
  if (e.Action === 'block' || e.Action === 'drop' || e.Action === 'managed_block') return 'high';
  if (e.EdgeResponseStatus >= 500) return 'medium';
  if (e.Datetime && e.Matches > 0) return 'medium';
  return 'info';
}

// ── JumpCloud Directory Insights ──────────────────────────────────────────────

function normalizeJumpCloud(body) {
  const events = Array.isArray(body) ? body : [body];
  return events.map(e => ({
    source_name: 'jumpcloud',
    event_type: inferJumpCloudEventType(e),
    severity: inferJumpCloudSeverity(e),
    source_ip: e.client_ip || null,
    destination_ip: null,
    username: e.initiated_by?.email || e.username || null,
    hostname: e.system?.displayName || e.system?.hostname || null,
    tags: ['jumpcloud', e.service || 'directory'].map(t => t.toLowerCase()),
    normalized: e,
    client_name: null,
  }));
}

function inferJumpCloudEventType(e) {
  const type = (e.event_type || e.type || '').toLowerCase();
  if (type.includes('login') && (type.includes('fail') || e.success === false)) return 'auth_failure';
  if (type.includes('login') || type.includes('auth')) return 'auth_success';
  if (type.includes('user_create') || type.includes('user_new')) return 'user_created';
  if (type.includes('user_delete')) return 'user_deleted';
  if (type.includes('password')) return 'password_change';
  if (type.includes('mfa')) return 'mfa_event';
  if (type.includes('group')) return 'group_change';
  return 'directory_event';
}

function inferJumpCloudSeverity(e) {
  if (e.success === false) return 'high';
  const type = (e.event_type || '').toLowerCase();
  if (type.includes('user_create') || type.includes('user_delete')) return 'medium';
  if (type.includes('admin') || type.includes('privileged')) return 'high';
  return 'info';
}

// ── Generic JSON fallback ─────────────────────────────────────────────────────

const FIELD_ALIASES = {
  source_ip:   ['src_ip', 'srcip', 'src', 'client_ip', 'ClientIP', 'remote_addr', 'ip'],
  username:    ['user', 'user_name', 'actor', 'email', 'account'],
  hostname:    ['host', 'machine', 'device', 'node', 'server'],
  event_type:  ['type', 'event', 'action', 'category', 'kind'],
  severity:    ['level', 'sev', 'priority', 'log_level', 'loglevel'],
  message:     ['msg', 'message', 'description', 'text', 'log'],
};

function normalizeGenericJSON(body, sourceName) {
  const obj = typeof body === 'string' ? tryParse(body) : body;
  if (!obj || typeof obj !== 'object') return [plainTextFallback(String(body), null)];

  const events = Array.isArray(obj) ? obj : [obj];
  return events.map(e => {
    const get = (field) => {
      if (e[field] !== undefined) return e[field];
      for (const alias of (FIELD_ALIASES[field] || [])) {
        if (e[alias] !== undefined) return e[alias];
      }
      return null;
    };

    return {
      source_name: sourceName || e.source || e.source_name || 'unknown',
      event_type: get('event_type') || 'generic',
      severity: mapSeverity(get('severity')),
      source_ip: get('source_ip'),
      destination_ip: e.dst_ip || e.destination_ip || null,
      username: get('username'),
      hostname: get('hostname'),
      tags: Array.isArray(e.tags) ? e.tags : [],
      normalized: e,
      client_name: null,
    };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const IP_RE = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/g;
const USER_RE = /(?:for|user|by)\s+(\w[\w.-]+)/i;

function extractFields(message) {
  const ips = [...message.matchAll(IP_RE)].map(m => m[1]);
  const userMatch = message.match(USER_RE);
  return {
    source_ip: ips[0] || null,
    username: userMatch ? userMatch[1] : null,
  };
}

function inferEventType(process_, message) {
  const p = (process_ || '').toLowerCase();
  const m = (message || '').toLowerCase();
  if (p.includes('sshd') || m.includes('failed password') || m.includes('authentication failure')) return 'auth_failure';
  if (p.includes('sshd') && m.includes('accepted')) return 'auth_success';
  if (p.includes('sudo') || m.includes('sudo')) return 'privilege_escalation';
  if (p.includes('kernel') || p.includes('panic')) return 'system_error';
  if (p.includes('cron')) return 'scheduled_task';
  if (m.includes('oom') || m.includes('out of memory')) return 'resource_exhaustion';
  return 'system_event';
}

function plainTextFallback(raw, sourceIp) {
  return {
    source_name: sourceIp || 'unknown',
    event_type: 'generic',
    severity: 'info',
    source_ip: sourceIp,
    username: null,
    hostname: null,
    tags: ['raw'],
    normalized: { raw },
    client_name: null,
  };
}

function tryParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

module.exports = {
  normalizeSyslog,
  normalizeCloudflare,
  normalizeJumpCloud,
  normalizeGenericJSON,
  mapSeverity,
};
