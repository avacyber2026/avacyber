/**
 * Insert one reported activity for an account (for local testing).
 * Usage: node db/seedOneReport.js [email]
 * Default email: bossharcho@gmail.com
 */
require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const fromUser = (process.argv[2] || 'bossharcho@gmail.com').trim().toLowerCase();
const id = 'r' + crypto.randomBytes(3).toString('hex');

async function main() {
  await pool.query(
    `INSERT INTO reports (id, subject, description, from_user, status, answer_user, priority)
     VALUES ($1, $2, $3, $4, false, '', $5)`,
    [
      id,
      'Nothing works',
      'Why doesn\'t it work?',
      fromUser,
      'High',
    ]
  );
  await pool.end();
  console.log('Report added for', fromUser, '— id:', id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
