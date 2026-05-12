// Database configuration - add your credentials to .env file
// Example for PostgreSQL: npm install pg
// Example for MySQL: npm install mysql2
// Example for MongoDB: npm install mongodb

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
};

module.exports = config;
