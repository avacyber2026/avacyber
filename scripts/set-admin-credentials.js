#!/usr/bin/env node
/**
 * Set admin panel login and password.
 * 1. Edit ADMIN_USERNAME and ADMIN_PASSWORD below.
 * 2. Run from project root: node scripts/set-admin-credentials.js
 * 3. Use these credentials to log in at /admin
 */

const path = require('path');
const backendDir = path.join(__dirname, '..', 'backend');
require(path.join(backendDir, 'node_modules', 'dotenv')).config({ path: path.join(backendDir, '.env') });
const bcrypt = require(path.join(backendDir, 'node_modules', 'bcryptjs'));
const { Pool } = require(path.join(backendDir, 'node_modules', 'pg'));

// --- SET YOUR ADMIN CREDENTIALS HERE ---
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '81sRfxTr';
// ---------------------------------------

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function main() {
  const pool = new Pool(config);
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_credentials (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await pool.query(
      `INSERT INTO admin_credentials (username, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [ADMIN_USERNAME, password_hash]
    );
    console.log('Admin credentials set successfully.');
    console.log('Username:', ADMIN_USERNAME);
    console.log('You can now log in at /admin with these credentials.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
