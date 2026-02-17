const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: isProduction
    ? process.env.DATABASE_URL   // ✅ Used on Render (Neon)
    : undefined,                  // ✅ Not used locally
  host: !isProduction ? process.env.DB_HOST : undefined,
  port: !isProduction ? parseInt(process.env.DB_PORT || '5432') : undefined,
  database: !isProduction ? process.env.DB_NAME : undefined,
  user: !isProduction ? process.env.DB_USER : undefined,
  password: !isProduction ? process.env.DB_PASSWORD : undefined,
  ssl: isProduction
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

module.exports = pool;