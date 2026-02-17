// ============================================================
// FILE LOCATION: backend/src/models/product.model.js
// LAYER: Model — DB queries ONLY, no business logic
// ============================================================

const pool = require('../config/database');

const ProductModel = {

  // Get all products for a business (with optional search + sort)
  async findAllByBusiness(businessId, search = null, sortField = 'created_at', sortOrder = 'DESC') {
    let query = `
      SELECT 
        p.product_id,
        p.product_name,
        p.product_type,
        p.storage_category,
        p.shelf_life_days,
        p.optimal_temp_min,
        p.optimal_temp_max,
        p.optimal_humidity_min,
        p.optimal_humidity_max,
        p.unit_of_measure,
        p.created_at,
        COALESCE(SUM(i.quantity), 0) as total_quantity,
        COUNT(DISTINCT i.inventory_id) as inventory_count
      FROM products p
      LEFT JOIN inventory i ON p.product_id = i.product_id AND i.current_condition != 'spoiled'
      WHERE p.business_id = $1
    `;

    const params = [businessId];

    if (search) {
      query += ` AND p.product_name ILIKE $2`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY p.product_id`;
    query += ` ORDER BY p.${sortField} ${sortOrder}`;

    const { rows } = await pool.query(query, params);
    return rows;
  },

  // Get single product by ID and business (ownership check included)
  async findByIdAndBusiness(productId, businessId) {
    const query = `
      SELECT 
        p.*,
        COALESCE(SUM(i.quantity), 0) as total_quantity,
        COUNT(DISTINCT i.inventory_id) as inventory_count
      FROM products p
      LEFT JOIN inventory i ON p.product_id = i.product_id
      WHERE p.product_id = $1 AND p.business_id = $2
      GROUP BY p.product_id
    `;
    const { rows } = await pool.query(query, [productId, businessId]);
    return rows[0] || null;
  },

  // Check ownership only (lightweight — no joins)
  async findOwnership(productId, businessId) {
    const query = `
      SELECT product_id FROM products 
      WHERE product_id = $1 AND business_id = $2
    `;
    const { rows } = await pool.query(query, [productId, businessId]);
    return rows[0] || null;
  },

  // Check if product has existing inventory records
  async countInventory(productId) {
    const query = `SELECT COUNT(*) as count FROM inventory WHERE product_id = $1`;
    const { rows } = await pool.query(query, [productId]);
    return parseInt(rows[0].count);
  },

  // Insert new product
  async create(businessId, productData, imageUrl) {
    const query = `
      INSERT INTO products (
        business_id,
        product_name,
        product_type,
        storage_category,
        image_url,
        shelf_life_days,
        optimal_temp_min,
        optimal_temp_max,
        optimal_humidity_min,
        optimal_humidity_max,
        unit_of_measure
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const { rows } = await pool.query(query, [
      businessId,
      productData.productName,
      productData.productType,
      productData.storageCategory,
      imageUrl,
      productData.shelfLifeDays,
      productData.optimalTempMin    || null,
      productData.optimalTempMax    || null,
      productData.optimalHumidityMin || null,
      productData.optimalHumidityMax || null,
      productData.unitOfMeasure     || 'units'
    ]);

    return rows[0];
  },

  // Update existing product fields (COALESCE keeps old values if not provided)
  async update(productId, productData) {
    const query = `
      UPDATE products 
      SET 
        product_name         = COALESCE($1, product_name),
        product_type         = COALESCE($2, product_type),
        storage_category     = COALESCE($3, storage_category),
        shelf_life_days      = COALESCE($4, shelf_life_days),
        optimal_temp_min     = COALESCE($5, optimal_temp_min),
        optimal_temp_max     = COALESCE($6, optimal_temp_max),
        optimal_humidity_min = COALESCE($7, optimal_humidity_min),
        optimal_humidity_max = COALESCE($8, optimal_humidity_max),
        unit_of_measure      = COALESCE($9, unit_of_measure)
      WHERE product_id = $10
      RETURNING *
    `;

    const { rows } = await pool.query(query, [
      productData.productName,
      productData.productType,
      productData.storageCategory,
      productData.shelfLifeDays,
      productData.optimalTempMin,
      productData.optimalTempMax,
      productData.optimalHumidityMin,
      productData.optimalHumidityMax,
      productData.unitOfMeasure,
      productId
    ]);

    return rows[0];
  },

  // Hard delete product
  async delete(productId) {
    await pool.query('DELETE FROM products WHERE product_id = $1', [productId]);
  }

};

module.exports = ProductModel;