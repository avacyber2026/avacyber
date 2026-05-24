/**
 * Simplified SPL → PostgreSQL translator.
 *
 * Supported syntax:
 *   [search] [field=value] [field!=value] [field=*wildcard*] ["free text"]
 *            [earliest=-5m | -1h | -24h | -7d]
 *   | stats count by field1, field2
 *   | stats count as alias by field1
 *   | where field > N  (or count > N after stats)
 *   | sort field  /  sort -field
 *   | head N
 *   | table field1 field2
 *   | dedup field
 */

const ALLOWED_FIELDS = new Set([
  'id', 'source_name', 'source_ip', 'destination_ip',
  'username', 'hostname', 'event_type', 'severity',
  'raw_log', 'client_name', 'ingested_at', 'tags',
]);

const SEVERITY_MAP = {
  critical: 'critical', crit: 'critical',
  high: 'high', error: 'high', err: 'high',
  medium: 'medium', warning: 'medium', warn: 'medium',
  low: 'low', notice: 'low',
  info: 'info', informational: 'info', debug: 'info',
};

// ── Tokenizer ─────────────────────────────────────────────────────────────────

function tokenize(str) {
  const tokens = [];
  let cur = '';
  let inQuote = false;

  for (const ch of str) {
    if (ch === '"') {
      if (inQuote) { tokens.push('"' + cur + '"'); cur = ''; inQuote = false; }
      else inQuote = true;
    } else if (ch === ' ' && !inQuote) {
      if (cur) { tokens.push(cur); cur = ''; }
    } else {
      cur += ch;
    }
  }
  if (cur) tokens.push(inQuote ? '"' + cur : cur);
  return tokens.filter(Boolean);
}

// ── Value escaping ────────────────────────────────────────────────────────────

function esc(val) {
  return String(val).replace(/'/g, "''");
}

// ── Time parsing ──────────────────────────────────────────────────────────────

function parseEarliest(token) {
  const m = token.match(/^earliest=(-?\d+)(m|h|d|w)$/i);
  if (!m) return null;
  const n = Math.abs(parseInt(m[1]));
  const u = { m: 'minutes', h: 'hours', d: 'days', w: 'weeks' }[m[2].toLowerCase()];
  return `ingested_at > NOW() - INTERVAL '${n} ${u}'`;
}

// ── Search token parser ───────────────────────────────────────────────────────

function parseSearch(tokens) {
  const conds = [];
  let timeExpr = null;

  for (const tok of tokens) {
    if (tok.toLowerCase() === 'search' || tok === 'AND') continue;

    if (tok.startsWith('earliest=')) {
      const t = parseEarliest(tok);
      if (t) timeExpr = t;
      continue;
    }

    // NOT prefix
    let negate = false;
    let t = tok;
    if (t.toUpperCase().startsWith('NOT ')) { negate = true; t = t.slice(4).trim(); }

    // field=value or field!=value
    const opMatch = t.match(/^(\w+)(!=|=)(.+)$/);
    if (opMatch) {
      const [, field, op, val] = opMatch;
      if (!ALLOWED_FIELDS.has(field)) continue;

      // severity: map keyword to our stored values
      const resolvedVal = field === 'severity' ? (SEVERITY_MAP[val.toLowerCase()] || val) : val;

      if (resolvedVal.includes('*')) {
        const like = resolvedVal.replace(/\*/g, '%');
        const likeOp = (op === '!=' || negate) ? 'NOT ILIKE' : 'ILIKE';
        conds.push(`${field} ${likeOp} '${esc(like)}'`);
      } else {
        const sqlOp = (op === '!=' || negate) ? '!=' : '=';
        conds.push(`${field} ${sqlOp} '${esc(resolvedVal)}'`);
      }
      continue;
    }

    // Quoted string — search raw_log
    if (tok.startsWith('"') && tok.endsWith('"')) {
      const val = tok.slice(1, -1);
      conds.push(`raw_log ILIKE '%${esc(val)}%'`);
      continue;
    }

    // Bare word — search raw_log (skip common keywords)
    const skip = new Set(['OR', 'NOT', 'AND', 'search', 'index=*']);
    if (!skip.has(tok) && /^[\w.\-:@/]+$/.test(tok)) {
      conds.push(`(raw_log ILIKE '%${esc(tok)}%' OR source_ip ILIKE '%${esc(tok)}%' OR username ILIKE '%${esc(tok)}%' OR hostname ILIKE '%${esc(tok)}%')`);
    }
  }

  return { conds, timeExpr };
}

// ── Main parser ───────────────────────────────────────────────────────────────

function parseSPL(spl, tenantId = null) {
  const stages = spl.split('|').map(s => s.trim()).filter(Boolean);
  let searchTokens = tokenize(stages[0]);
  if (searchTokens[0]?.toLowerCase() === 'search') searchTokens = searchTokens.slice(1);

  const { conds, timeExpr } = parseSearch(searchTokens);

  // Pipeline state
  let statsCmd = null;
  let havingExpr = null;
  let sortClause = 'ORDER BY ingested_at DESC';
  let limitN = 200;
  let selectFields = null;
  let dedupField = null;

  for (let i = 1; i < stages.length; i++) {
    const stage = stages[i];
    const spaceIdx = stage.indexOf(' ');
    const cmd = (spaceIdx === -1 ? stage : stage.slice(0, spaceIdx)).toLowerCase();
    const args = spaceIdx === -1 ? '' : stage.slice(spaceIdx + 1).trim();

    if (cmd === 'stats') {
      // stats count by field1, field2
      // stats count as alias by field1
      const asBy = args.match(/^count\s+as\s+(\w+)\s+by\s+(.+)$/i);
      const by   = args.match(/^count\s+by\s+(.+)$/i);
      if (asBy) {
        const fields = asBy[2].split(',').map(f => f.trim()).filter(f => ALLOWED_FIELDS.has(f));
        statsCmd = { alias: asBy[1], groupBy: fields };
      } else if (by) {
        const fields = by[1].split(',').map(f => f.trim()).filter(f => ALLOWED_FIELDS.has(f));
        statsCmd = { alias: 'count', groupBy: fields };
      }

    } else if (cmd === 'where') {
      // where count > N  or  where field = value  (used after stats)
      const m = args.match(/^(\w+)\s*(>=|<=|!=|>|<|=)\s*(.+)$/);
      if (m) {
        const [, field, op, val] = m;
        if (statsCmd && (field === 'count' || field === statsCmd?.alias)) {
          havingExpr = `COUNT(*) ${op} ${parseInt(val)}`;
        } else if (ALLOWED_FIELDS.has(field)) {
          conds.push(`${field} ${op} '${esc(val.trim())}'`);
        }
      }

    } else if (cmd === 'sort') {
      const arg = args.trim();
      if (arg.startsWith('-')) {
        const f = arg.slice(1);
        const col = f === 'count' ? 'COUNT(*)' : (ALLOWED_FIELDS.has(f) ? f : 'ingested_at');
        sortClause = `ORDER BY ${col} DESC`;
      } else {
        const col = arg === 'count' ? 'COUNT(*)' : (ALLOWED_FIELDS.has(arg) ? arg : 'ingested_at');
        sortClause = `ORDER BY ${col} ASC`;
      }

    } else if (cmd === 'head') {
      limitN = Math.min(parseInt(args) || 100, 2000);

    } else if (cmd === 'table') {
      selectFields = args.split(/\s+/).filter(f => ALLOWED_FIELDS.has(f) || f === 'count');

    } else if (cmd === 'dedup') {
      const f = args.trim();
      if (ALLOWED_FIELDS.has(f)) dedupField = f;
    }
  }

  // ── Build SQL ──────────────────────────────────────────────────────────────

  if (timeExpr) conds.push(timeExpr);
  if (tenantId) conds.push(`client_name = '${esc(tenantId)}'`);
  const whereSQL = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  let sql;

  if (statsCmd && statsCmd.groupBy.length > 0) {
    const groupCols = statsCmd.groupBy.join(', ');
    const having = havingExpr ? `HAVING ${havingExpr}` : '';
    const order = sortClause.includes('ingested_at') ? `ORDER BY COUNT(*) DESC` : sortClause;
    sql = `SELECT ${groupCols}, COUNT(*) AS ${statsCmd.alias} FROM siem_events ${whereSQL} GROUP BY ${groupCols} ${having} ${order} LIMIT ${limitN}`;
  } else {
    const defaultCols = 'id, source_name, event_type, severity, source_ip, destination_ip, username, hostname, raw_log, client_name, ingested_at';
    const cols = selectFields?.length ? selectFields.join(', ') : defaultCols;
    const distinct = dedupField ? `DISTINCT ON (${dedupField})` : '';
    sql = `SELECT ${distinct} ${cols} FROM siem_events ${whereSQL} ${sortClause} LIMIT ${limitN}`;
  }

  return { sql: sql.replace(/\s+/g, ' ').trim() };
}

module.exports = { parseSPL };
