/**
 * Однократно создаёт ticket_timeline_entries на существующей БД (если таблицы ещё нет).
 * Usage: node db/runTimelineMigration.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const sql = `
CREATE TABLE IF NOT EXISTS ticket_timeline_entries (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_email VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ticket_timeline_ticket ON ticket_timeline_entries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_timeline_created ON ticket_timeline_entries(created_at);
`;

async function main() {
  await pool.query(sql);
  console.log('ticket_timeline_entries: OK');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
