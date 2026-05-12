/**
 * Insert one demo ticket assigned to an email (for local testing).
 * Usage: node db/seedOneTicket.js <email>
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const assignedTo = process.argv[2] || 'bossharcho@gmail.com';

async function main() {
  await pool.query(
    `INSERT INTO tickets (title, text, status, priority, created_by, assigned_to, type, answer)
     VALUES ($1, $2, $3, $4, $5, $6, $7, '')`,
    [
      'Security announcement',
      'Please acknowledge this security notice. If you have any questions, contact the security team.',
      'New',
      'Medium',
      'security@secureconnect.local',
      assignedTo.trim().toLowerCase(),
      'Security Announcement',
    ]
  );
  await pool.end();
  console.log('Ticket added for', assignedTo);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
