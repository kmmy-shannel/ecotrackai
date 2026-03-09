// ============================================================
// FILE: src/models/inventory.model.js
// PURPOSE: All DB queries for inventory table
// PATTERN: matches alert.model.js and product.model.js
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
        NULL::text AS ripeness_stage,
        i.simulated_storage_temp,
        i.simulated_storage_humidity,
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
        NULL::text AS ripeness_stage,
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
      shelf_life_days,         // comes from catalog, used to calc expiry
    } = data;

    const { rows } = await pool.query(`
      INSERT INTO inventory (
        business_id,
        product_id,
        quantity,
        unit_of_measure,
        batch_number,
        current_condition,
        simulated_storage_temp,
        simulated_storage_humidity,
        entry_date,
        expected_expiry_date
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        CURRENT_DATE,
        CURRENT_DATE + $9::int
      )
      RETURNING *
    `, [
      businessId,
      product_id,
      quantity,
      unit_of_measure   || 'kg',
      batch_number,
      current_condition || 'Excellent',
      simulated_storage_temp    || null,
      simulated_storage_humidity || null,
      shelf_life_days   || 7,
    ]);

    return rows[0];
  },

  // ── Update quantity after delivery ──────────────────────────
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
  // "Reserved" means assigned to an active delivery not yet completed
  async getAvailableQuantity(inventoryId, businessId) {
    const { rows } = await pool.query(`
      SELECT
        i.quantity AS total_quantity,
        COALESCE((
          SELECT SUM(di.quantity_to_deliver)
          FROM delivery_items di
          JOIN delivery_routes dr ON di.route_id = dr.route_id
          WHERE di.inventory_id = $1
            AND dr.status NOT IN ('completed', 'cancelled', 'declined')
        ), 0) AS reserved_quantity,

        i.quantity - COALESCE((
          SELECT SUM(di.quantity_to_deliver)
          FROM delivery_items di
          JOIN delivery_routes dr ON di.route_id = dr.route_id
          WHERE di.inventory_id = $1
            AND dr.status NOT IN ('completed', 'cancelled', 'declined')
        ), 0) AS available_quantity

      FROM inventory i
      WHERE i.inventory_id = $1
        AND i.business_id  = $2
    `, [inventoryId, businessId]);

    return rows[0] || null;
  },

  // ── Compatibility check ─────────────────────────────────────
  // Checks if any fruit in avoid_with list is already stored
  // by this business — used for warning in AddProductModal
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
  async getStatsByBusiness(businessId) {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                                    AS total_batches,
        COALESCE(SUM(i.quantity), 0)                               AS total_quantity,
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
