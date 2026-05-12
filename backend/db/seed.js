const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function seed() {
  // Ensure constraint allows new roles (GSOC, GRC, IAM, Pentesting)
  await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
  await pool.query(`UPDATE users SET role = 'GSOC' WHERE role = 'Security Analyst'`);
  await pool.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
    role IN ('End-User', 'Security Manager', 'GSOC', 'GRC', 'IAM', 'Pentesting')
  )`);

  const passwordHash = await bcrypt.hash('password', 10);

  await pool.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'End-User'),
            ($3, $2, 'Security Manager'),
            ($4, $2, 'GSOC'),
            ($5, $2, 'GRC'),
            ($6, $2, 'IAM'),
            ($7, $2, 'Pentesting')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [
      'alinagaif99@gmail.com',
      passwordHash,
      'security.manager@secops.com',
      'security.analyst@secops.com',
      'grc@secops.com',
      'iam@secops.com',
      'pentesting@secops.com',
    ]
  );

  // Ensure 123@gmail.com has GSOC role (if this user exists)
  await pool.query("UPDATE users SET role = 'GSOC' WHERE email = '123@gmail.com'");

  console.log('Users seeded successfully');

  const ticketCount = await pool.query('SELECT COUNT(*) FROM tickets');
  if (Number(ticketCount.rows[0].count) === 0) {
    await pool.query(
      `INSERT INTO tickets (title, text, status, priority, created_by, assigned_to, type, answer)
       VALUES 
       ('Logon from suspicious location', $1, 'New', 'Medium', 'security.analyst@secops.com', 'alinagaif99@gmail.com', 'Activity Verification', ''),
       ('Computer infected with malware', $2, 'New', 'High', 'security.analyst@secops.com', 'alinagaif99@gmail.com', 'Activity Verification', ''),
       ('Powershell history log modification', $3, 'New', 'Medium', 'security.analyst@secops.com', 'alinagaif99@gmail.com', 'Activity Verification', ''),
       ('Invoice scam', $4, 'New', 'High', 'security.analyst@secops.com', 'alinagaif99@gmail.com', 'Security Announcement', '')`,
      [
        'Hello, Security Operations Center has detected suspicious activity...',
        'Hello, During regular operations activities Security Operations Center has detected unusual activity...',
        'Hello, Security Operations Center has detected suspicious activity related to PowerShell...',
        'Hello, We wish to bring to your attention that we have identified a security breach...',
      ]
    );
    console.log('Sample tickets seeded');
  }

  // Add team tickets (Pentesting, GRC, IAM) if none exist
  const teamTicketCount = await pool.query(
    "SELECT COUNT(*) FROM tickets WHERE assigned_to IN ('Pentesting', 'GRC', 'IAM')"
  );
  if (Number(teamTicketCount.rows[0].count) === 0) {
    await pool.query(
      `INSERT INTO tickets (title, text, status, priority, created_by, assigned_to, type, answer)
       VALUES 
       ('Penetration test request - Web app', $1, 'New', 'High', 'security.analyst@secops.com', 'Pentesting', 'Communication Channel', ''),
       ('Security audit - Infrastructure', $2, 'New', 'Medium', 'security.manager@secops.com', 'GRC', 'Security Notification', ''),
       ('IAM review - New role requested', $3, 'New', 'Medium', 'security.analyst@secops.com', 'IAM', 'Communication Channel', '')`,
      [
        'Please perform a penetration test on the new web application before production release.',
        'Scheduled security audit of infrastructure components. GRC team coordination required.',
        'User requested new IAM role. Please review and approve access permissions.',
      ]
    );
    console.log('Team tickets (Pentesting, GRC, IAM) seeded');
  }

  // Add sample notifications for main test users
  const usersToNotify = [
    'alinagaif99@gmail.com',
    'bossharcho@gmail.com',
    'security.manager@secops.com',
    'security.analyst@secops.com',
    'grc@secops.com',
    'iam@secops.com',
    'pentesting@secops.com',
  ];
  for (const email of usersToNotify) {
    const notifCount = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_email = $1',
      [email]
    );
    if (Number(notifCount.rows[0].count) === 0) {
      await pool.query(
        `INSERT INTO notifications (user_email, title, body, read_at)
         VALUES 
         ($1, 'Your incident has been resolved', 'Incident r965907 has been marked as resolved by the security team.', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
         ($1, 'New request assigned to you', 'A new activity verification request has been assigned to you. Please review it in Requests.', NULL)`,
        [email]
      );
    }
  }
  console.log('Sample notifications seeded');

  // 5 test incidents for 123@gmail.com (End-User)
  const count123 = await pool.query(
    "SELECT COUNT(*) FROM tickets WHERE assigned_to = '123@gmail.com'"
  );
  if (Number(count123.rows[0].count) === 0) {
    const now = new Date();
    const created = (daysAgo) => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString();
    };
    await pool.query(
      `INSERT INTO tickets (title, text, status, priority, created_by, assigned_to, type, answer, created_at)
       VALUES 
       ('Checkout Flow', 'Playwright scenario failed', 'Resolved', 'High', 'security.analyst@secops.com', '123@gmail.com', 'Activity Verification', 'Acknowledged', $1),
       ('Storefront', 'Status 405', 'Resolved', 'Medium', 'security.analyst@secops.com', '123@gmail.com', 'Activity Verification', 'Aware', $2),
       ('sora.com', 'DNS lookup failure', 'New', 'High', 'security.analyst@secops.com', '123@gmail.com', 'Security Announcement', '', $3),
       ('eCommerce DB Backup', 'PostgreSQL connection pool at 95% capacity', 'Resolved', 'Medium', 'security.manager@secops.com', '123@gmail.com', 'Activity Verification', 'Acknowledged', $4),
       ('Monitoring heartbeat', 'Missed heartbeat', 'New', 'Low', 'security.analyst@secops.com', '123@gmail.com', 'Activity Verification', '', $5)`,
      [created(1), created(3), created(7), created(7), created(14)]
    );
    console.log('5 test incidents for 123@gmail.com seeded');
  }

  const reportCount = await pool.query('SELECT COUNT(*) FROM reports');
  if (Number(reportCount.rows[0].count) === 0) {
    await pool.query(
      `INSERT INTO reports (id, subject, description, from_user, status, answer_user)
       VALUES 
       ('r965907', 'I have forgot my laptop', $1, 'alinagaif99@gmail.com', true, 'security.analyst@secops.com'),
       ('r404388', 'Can''t receive emails from a client', $2, 'alinagaif99@gmail.com', false, '')`,
      [
        "Hello, I have accidently forgot my work laptop somewhere in the airport...",
        "Hello, I have one client who is trying to send me emails, but I can't receive them...",
      ]
    );
    console.log('Sample reports seeded');
  }

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
