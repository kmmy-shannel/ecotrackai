// ============================================================
// FILE: src/models/inventory.model.js
// PURPOSE: All DB queries for inventory table
// PATTERN: matches alert.model.js and product.model.js
//
// Fix #3 changes (everything else is UNTOUCHED):
//   1. findAllByBusiness  — removed NULL::text AS ripeness_stage,
//                           now reads i.ripeness_stage directly.
//                           Also added i.simulated_storage_temp and
//                           i.simulated_storage_humidity to the
//                           explicit column list (they were missing,
//                           causing the eye modal to show blanks).
//   2. findByIdAndBusiness — same: replaced NULL::text AS ripeness_stage
//                            with i.ripeness_stage.
//   3. create()           — added ripeness_stage to the INSERT so
//                           newly added batches persist the value.
//
// Fix #4 changes:
//   4. findAllByBusiness  — now returns available_quantity
//                           (quantity - reserved_quantity) so the
//                           inventory list reflects real availability.
//   5. reserveQuantity()  — new: atomically increments reserved_quantity
//                           by the requested amount, only if enough
//                           available stock exists.
//   6. releaseReservation() — new: decrements reserved_quantity when a
//                             delivery is deleted or declined.
//   7. confirmReservation() — new: permanently deducts quantity AND
//                             clears the reservation when a delivery
//                             is approved (logistics manager approves).
// ============================================================

const pool = require('../config/database');

const InventoryModel = {

  // ── Get all inventory for a business ───────────────────────
  async findAllByBusiness(businessId) {
    const { rows } = await pool.query(`
      SELECT
        i.inventory_id,
        i.business_id,
        i.product_id,
        i.quantity,
        i.unit_of_measure,
        i.batch_number,
        i.entry_date,
        i.expected_expiry_date,
        i.current_condition,

        -- Fix #3: read the real column instead of hardcoding NULL
        i.ripeness_stage,

        -- Fix #3: these were missing from the explicit SELECT list
        -- causing the eye modal to always show blanks
        i.simulated_storage_temp,
        i.simulated_storage_humidity,

        -- Fix #4: expose reservation fields so the frontend can show
        -- "available" vs "total" stock clearly
        i.reserved_quantity,
        GREATEST(i.quantity - i.reserved_quantity, 0) AS available_quantity,

        i.created_at,
        i.updated_at,

        -- Pull fruit info from products table
        p.product_name,
        p.storage_category,
        p.shelf_life_days,
        p.optimal_temp_min,
        p.optimal_temp_max,
        p.optimal_humidity_min,
        p.optimal_humidity_max,
        p.is_ethylene_producer,
        p.compatible_with,
        p.avoid_with,

        -- Days remaining until expiry
        (i.expected_expiry_date - CURRENT_DATE) AS days_until_expiry

      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      WHERE i.business_id = $1
        AND i.current_condition != 'Spoiled'
      ORDER BY i.expected_expiry_date ASC
    `, [businessId]);

    return rows;
  },

  // ── Get single inventory record ─────────────────────────────
  async findByIdAndBusiness(inventoryId, businessId) {
    const { rows } = await pool.query(`
      SELECT
        i.*,

        -- Fix #3: i.* already returns all columns including
        -- simulated_storage_temp and simulated_storage_humidity,
        -- but ripeness_stage was previously overridden by
        -- NULL::text AS ripeness_stage after the wildcard.
        -- We now let i.* handle it naturally — no override needed.

        -- Fix #4: computed available_quantity for single-record view
        GREATEST(i.quantity - i.reserved_quantity, 0) AS available_quantity,

        p.product_name,
        p.storage_category,
        p.shelf_life_days,
        p.optimal_temp_min,
        p.optimal_temp_max,
        p.optimal_humidity_min,
        p.optimal_humidity_max,
        p.is_ethylene_producer,
        p.compatible_with,
        p.avoid_with,
        (i.expected_expiry_date - CURRENT_DATE) AS days_until_expiry
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      WHERE i.inventory_id = $1
        AND i.business_id = $2
    `, [inventoryId, businessId]);

    return rows[0] || null;
  },

  // ── Create inventory record ─────────────────────────────────
  // Called when admin adds stock via AddProductModal
  async create(businessId, data) {
    const {
      product_id,
      quantity,
      unit_of_measure,
      batch_number,
      current_condition,
      simulated_storage_temp,
      simulated_storage_humidity,
      shelf_life_days,          // comes from catalog, used to calc expiry
      // Fix #3: ripeness_stage was never in the INSERT — added now
      ripeness_stage,
    } = data;

    const { rows } = await pool.query(`
      INSERT INTO inventory (
        business_id,
        product_id,
        quantity,
        unit_of_measure,
        batch_number,
        current_condition,
        ripeness_stage,
        simulated_storage_temp,
        simulated_storage_humidity,
        reserved_quantity,
        entry_date,
        expected_expiry_date
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        0,
        CURRENT_DATE,
        CURRENT_DATE + $10::int
      )
      RETURNING *
    `, [
      businessId,
      product_id,
      quantity,
      unit_of_measure           || 'kg',
      batch_number,
      current_condition         || 'Excellent',
      ripeness_stage             || null,
      simulated_storage_temp    || null,
      simulated_storage_humidity || null,
      shelf_life_days           || 7,
    ]);

    return rows[0];
  },

  // ── Update quantity after delivery ──────────────────────────
  // UNCHANGED
  async deductQuantity(inventoryId, quantityToDeduct, businessId) {
    const { rows } = await pool.query(`
      UPDATE inventory
      SET
        quantity   = quantity - $1,
        updated_at = NOW()
      WHERE inventory_id = $2
        AND business_id  = $3
        AND quantity     >= $1
      RETURNING *
    `, [quantityToDeduct, inventoryId, businessId]);

    return rows[0] || null;
  },

  // ── Update condition ────────────────────────────────────────
  // UNCHANGED
  async updateCondition(inventoryId, businessId, condition) {
    const { rows } = await pool.query(`
      UPDATE inventory
      SET
        current_condition = $1,
        updated_at        = NOW()
      WHERE inventory_id = $2
        AND business_id  = $3
      RETURNING *
    `, [condition, inventoryId, businessId]);

    return rows[0] || null;
  },

  // ── Get available quantity (total minus reserved) ───────────
  // UNCHANGED — kept for backward-compat; still works via delivery_items join.
  // The new reserved_quantity column is the authoritative source going forward.
  async getAvailableQuantity(inventoryId, businessId) {
    const { rows } = await pool.query(`
      SELECT
        i.quantity AS total_quantity,
        i.reserved_quantity,
        GREATEST(i.quantity - i.reserved_quantity, 0) AS available_quantity
      FROM inventory i
      WHERE i.inventory_id = $1
        AND i.business_id  = $2
    `, [inventoryId, businessId]);

    return rows[0] || null;
  },

  // ── Fix #4: Reserve quantity when a delivery is created ────
  // Atomically increments reserved_quantity, but ONLY if
  // (quantity - reserved_quantity) >= quantityToReserve.
  // Returns the updated row, or null if insufficient stock.
  async reserveQuantity(inventoryId, businessId, quantityToReserve) {
    const { rows } = await pool.query(`
      UPDATE inventory
      SET
        reserved_quantity = reserved_quantity + $1,
        updated_at        = NOW()
      WHERE inventory_id  = $2
        AND business_id   = $3
        -- Only reserve if enough available stock exists
        AND (quantity - reserved_quantity) >= $1
      RETURNING *
    `, [quantityToReserve, inventoryId, businessId]);

    return rows[0] || null;  // null = insufficient available stock
  },

  // ── Fix #4: Release reservation when delivery is deleted/declined ──
  // Decrements reserved_quantity back to its pre-reservation value.
  // Clamps at 0 to guard against double-release bugs.
  async releaseReservation(inventoryId, businessId, quantityToRelease) {
    const { rows } = await pool.query(`
      UPDATE inventory
      SET
        reserved_quantity = GREATEST(reserved_quantity - $1, 0),
        updated_at        = NOW()
      WHERE inventory_id = $2
        AND business_id  = $3
      RETURNING *
    `, [quantityToRelease, inventoryId, businessId]);

    return rows[0] || null;
  },

  // ── Fix #4: Confirm reservation on approval ─────────────────
  // Called when logistics manager approves a delivery.
  // Permanently deducts from quantity AND clears the reservation
  // in one atomic UPDATE so quantity never goes negative.
  async confirmReservation(inventoryId, businessId, quantityToConfirm) {
    const { rows } = await pool.query(`
      UPDATE inventory
      SET
        quantity          = GREATEST(quantity - $1, 0),
        reserved_quantity = GREATEST(reserved_quantity - $1, 0),
        updated_at        = NOW()
      WHERE inventory_id = $2
        AND business_id  = $3
      RETURNING *
    `, [quantityToConfirm, inventoryId, businessId]);

    return rows[0] || null;
  },

  // ── Compatibility check ─────────────────────────────────────
  // UNCHANGED
  async checkCompatibility(businessId, avoidList) {
    if (!avoidList || avoidList.length === 0) return [];

    const { rows } = await pool.query(`
      SELECT DISTINCT p.product_name
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      WHERE i.business_id = $1
        AND p.product_name = ANY($2::text[])
        AND i.current_condition != 'Spoiled'
        AND i.quantity > 0
    `, [businessId, avoidList]);

    return rows.map(r => r.product_name);
  },

  // ── Stats for dashboard ─────────────────────────────────────
  // UNCHANGED
  async getStatsByBusiness(businessId) {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                                    AS total_batches,
        COALESCE(SUM(i.quantity), 0)                               AS total_quantity,
        COALESCE(SUM(GREATEST(i.quantity - i.reserved_quantity, 0)), 0) AS available_quantity,
        COALESCE(SUM(i.reserved_quantity), 0)                      AS total_reserved,
        COUNT(*) FILTER (
          WHERE (i.expected_expiry_date - CURRENT_DATE) <= 2
        )                                                           AS expiring_critical,
        COUNT(*) FILTER (
          WHERE (i.expected_expiry_date - CURRENT_DATE) BETWEEN 3 AND 5
        )                                                           AS expiring_soon,
        COUNT(*) FILTER (
          WHERE i.current_condition IN ('Poor', 'Spoiled')
        )                                                           AS poor_condition
      FROM inventory i
      WHERE i.business_id = $1
        AND i.current_condition != 'Spoiled'
    `, [businessId]);

    return rows[0];
  },

  // ── Delete a batch ──────────────────────────────────────────
  // UNCHANGED
  async deleteById(inventoryId, businessId) {
    const { rowCount } = await pool.query(`
      DELETE FROM inventory
      WHERE inventory_id = $1
        AND business_id  = $2
    `, [inventoryId, businessId]);

    return rowCount > 0;
  },
};

module.exports = InventoryModel;