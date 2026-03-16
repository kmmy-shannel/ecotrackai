// Ensures the inventory table has a reserved_quantity column and sane defaults.
// Runs at server startup; idempotent and safe on existing deployments.
const pool = require('../config/database');

async function ensureInventoryReservedColumn() {
  try {
    await pool.query(`
      ALTER TABLE inventory
      ADD COLUMN IF NOT EXISTS reserved_quantity NUMERIC(14,3) NOT NULL DEFAULT 0
    `);
  } catch (err) {
    console.warn('[ensureInventoryReservedColumn] alter add skipped:', err.message);
  }

  try {
    await pool.query(`
      UPDATE inventory
      SET reserved_quantity = 0
      WHERE reserved_quantity IS NULL
    `);
  } catch (err) {
    console.warn('[ensureInventoryReservedColumn] backfill skipped:', err.message);
  }

  try {
    await pool.query(`
      ALTER TABLE inventory
      ALTER COLUMN reserved_quantity SET DEFAULT 0
    `);
  } catch (err) {
    console.warn('[ensureInventoryReservedColumn] default set skipped:', err.message);
  }
}

module.exports = { ensureInventoryReservedColumn };
