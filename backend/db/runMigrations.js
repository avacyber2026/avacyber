require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const dbName = process.env.DB_NAME || 'secureconnect';
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: dbName,
};

async function ensureDatabase() {
  const adminPool = new Pool({ ...poolConfig, database: 'postgres' });
  try {
    const r = await adminPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (r.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created.`);
    }
  } catch (e) {
    if (e.code === '3D000' || e.message.includes('does not exist')) {
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created.`);
    } else throw e;
  } finally {
    await adminPool.end();
  }
}

const pool = new Pool(poolConfig);
const migrations = ['init.sql', 'migrate_approve.sql', 'admin_credentials.sql', 'migrate_profile_notifications.sql', 'migrate_app_settings.sql', 'migrate_approve_new_users.sql', 'migrate_123_gsoc.sql', 'migrate_report_attachments.sql', 'migrate_user_holiday.sql', 'migrate_guide_articles.sql', 'migrate_notifications_entities.sql', 'migrate_siem_alert_id.sql', 'migrate_ticket_attachments.sql', 'migrate_reports_pipeline.sql', 'migrate_ticket_recipients.sql', 'migrate_structured_answers.sql', 'migrate_audit_log.sql', 'migrate_ai_prompt_log.sql', 'migrate_report_incident_time_manager.sql'];

async function run() {
  await ensureDatabase();
  for (const file of migrations) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`Skip ${file} (not found)`);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`OK: ${file}`);
  }
  console.log('All migrations completed.');
  await pool.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
