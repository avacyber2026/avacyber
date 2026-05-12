/**
 * Удаляет все тикеты в БД и загружает данные из secureconnect/tickets/*.txt
 * Usage: node db/seedTicketsFromFiles.js
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const TICKETS_DIR = path.join(__dirname, '../../tickets');
const DEFAULT_END_USER = (process.env.SEED_END_USER_EMAIL || 'alinagaif99@gmail.com').trim().toLowerCase();
const DEFAULT_GSOC_INBOX = (process.env.SEED_GSOC_INBOX_EMAIL || 'security.analyst@secops.com').trim().toLowerCase();

/** Извлекает объекты вида { id: ..., title: ... } из текста (ключи без кавычек, как в .txt). */
function extractObjects(src) {
  const out = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        const slice = src.slice(start, i + 1);
        try {
          // eslint-disable-next-line no-eval
          const obj = eval(`(${slice})`);
          if (obj && typeof obj === 'object' && obj.title != null && obj.text != null) {
            out.push(obj);
          }
        } catch {
          /* пропускаем невалидные блоки */
        }
        start = -1;
      }
    }
  }
  return out;
}

function mergePentestingRows(rows) {
  const byId = new Map();
  for (const r of rows) {
    const id = r.id;
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(r);
  }
  const merged = [];
  for (const [, group] of byId) {
    group.sort((a, b) => {
      if (a.status === 'New' && b.status !== 'New') return -1;
      if (a.status !== 'New' && b.status === 'New') return 1;
      return 0;
    });
    const first = group[0];
    const response = group.find((x) => x.type === 'Investigation Response' || x.status === 'Updated');
    merged.push({
      id: first.id,
      title: first.title,
      text: first.text,
      status: response ? response.status : first.status,
      priority: first.priority,
      fromUser: first.fromUser,
      type: first.type,
      answer: response ? response.text : (first.answer || ''),
    });
  }
  return merged;
}

function dedupeByIdLastWins(rows) {
  const m = new Map();
  for (const r of rows) {
    m.set(r.id, r);
  }
  return [...m.values()];
}

function mapRow(base, createdBy, assignedTo) {
  return {
    id: base.id,
    title: String(base.title).slice(0, 500),
    text: String(base.text),
    status: base.status || 'New',
    priority: base.priority || 'Medium',
    created_by: createdBy,
    assigned_to: assignedTo,
    type: String(base.type || 'Communication Channel').slice(0, 100),
    answer: base.answer != null ? String(base.answer) : '',
  };
}

async function main() {
  const files = fs
    .readdirSync(TICKETS_DIR)
    .filter((f) => f.endsWith('.txt'))
    .sort();

  if (files.length === 0) {
    console.error('Нет .txt в', TICKETS_DIR);
    process.exit(1);
  }

  const toInsert = [];

  for (const file of files) {
    const full = path.join(TICKETS_DIR, file);
    const raw = fs.readFileSync(full, 'utf8');
    let rows = extractObjects(raw);

    if (file === 'SOC to Pentesting.txt') {
      rows = mergePentestingRows(rows);
    } else if (file === 'SOC to User.txt') {
      rows = dedupeByIdLastWins(rows);
    }

    for (const r of rows) {
      const fromUser = (r.fromUser || '').trim();

      if (file === 'User to SOC.txt') {
        toInsert.push(mapRow(r, fromUser || 'employee.user@company.com', DEFAULT_GSOC_INBOX));
      } else if (file === 'SOC to Vulnerability Mngmnt.txt') {
        toInsert.push(mapRow(r, fromUser || 'soc.analyst@secops.com', 'IAM'));
      } else if (file === 'SOC to User.txt') {
        toInsert.push(mapRow(r, fromUser || 'security.analyst@secops.com', DEFAULT_END_USER));
      } else if (file === 'SOC to Pentesting.txt') {
        toInsert.push(mapRow(r, fromUser || 'soc.analyst@secops.com', 'Pentesting'));
      } else if (file === 'GRC to SOC.txt') {
        const isFromGrc = fromUser.toLowerCase().includes('grc');
        if (isFromGrc) {
          toInsert.push(mapRow(r, fromUser, DEFAULT_GSOC_INBOX));
        } else {
          toInsert.push(mapRow(r, fromUser || 'soc.analyst@secops.com', 'GRC'));
        }
      } else {
        console.warn('Неизвестный файл, пропуск правил:', file);
        toInsert.push(mapRow(r, fromUser, DEFAULT_END_USER));
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM tickets');
    for (const t of toInsert) {
      await client.query(
        `INSERT INTO tickets (id, title, text, status, priority, created_by, assigned_to, type, answer)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [t.id, t.title, t.text, t.status, t.priority, t.created_by, t.assigned_to, t.type, t.answer]
      );
    }
    await client.query(
      `SELECT setval(pg_get_serial_sequence('tickets', 'id'), COALESCE((SELECT MAX(id) FROM tickets), 1))`
    );
    await client.query('COMMIT');
    console.log(`Готово: удалены старые тикеты, загружено ${toInsert.length} записей из ${files.length} файлов.`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
