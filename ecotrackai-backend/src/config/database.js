const { Pool } = require('pg');

// ✅ Always use DATABASE_URL if it exists (Neon)
// Otherwise fall back to individual vars (local)
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: String(process.env.DB_PASSWORD), // force string
        ssl: false
      }
);

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log(
      process.env.DATABASE_URL
        ? 'Connected to Neon PostgreSQL'
        : 'Connected to Local PostgreSQL'
    );
    release();
  }
});

module.exports = pool;