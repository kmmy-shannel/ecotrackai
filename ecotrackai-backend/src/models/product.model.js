const pool = require('../config/database');

const ALLOWED_SORT_FIELDS = new Set([
  'product_name',
  'product_type',
  'shelf_life_days',
  'created_at'
]);

const ProductModel = {
  _isNil(value) {
    return value === null || value === undefined;
  },

  _handleDbError(method, error) {
    console.error(`[ProductModel.${method}]`, error);
    if (error && error.code === '23503') {
      return 'Foreign key constraint violation';
    }
    return 'Database operation failed';
  },

  async findAllByBusiness(businessId, search = null, sortField = 'created_at', sortOrder = 'DESC') {
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }
  
    try {
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
          p.image_url,
          i.inventory_id,
          i.batch_number,
          i.quantity,
          i.unit_of_measure,
          i.current_condition,
          i.entry_date,
          i.expected_expiry_date,
          i.created_at,
          (i.expected_expiry_date - CURRENT_DATE)::int AS days_left
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
        WHERE i.business_id = $1
          AND COALESCE(i.quantity, 0) > 0
          AND LOWER(COALESCE(i.current_condition, 'good')) <> 'spoiled'
      `;
      const params = [businessId];
  
      if (search) {
        query += ` AND p.product_name ILIKE $${params.length + 1}`;
        params.push(`%${search}%`);
      }
  
      query += ` ORDER BY i.created_at DESC`;
  
      const { rows } = await pool.query(query, params);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: this._handleDbError('findAllByBusiness', error) };
    }
  },

  async findByIdAndBusiness(productId, businessId) {
    if (this._isNil(productId)) {
      return { success: false, error: 'productId is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const query = `
        SELECT
          p.*,
          COALESCE(SUM(i.quantity), 0) AS total_quantity,
          COUNT(DISTINCT i.inventory_id) AS inventory_count
        FROM products p
        LEFT JOIN inventory i
          ON p.product_id = i.product_id
         AND i.business_id = $2
         AND LOWER(COALESCE(i.current_condition, 'good')) <> 'spoiled'
        WHERE p.product_id = $1
          AND (
            p.business_id = $2
            OR p.business_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM inventory ix
              WHERE ix.product_id = p.product_id
                AND ix.business_id = $2
            )
          )
        GROUP BY p.product_id
      `;

      const { rows } = await pool.query(query, [productId, businessId]);
      if (rows.length === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('findByIdAndBusiness', error) };
    }
  },

  async findOwnership(productId, businessId) {
    if (this._isNil(productId)) {
      return { success: false, error: 'productId is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const query = `
        SELECT product_id
        FROM products
        WHERE product_id = $1
          AND business_id = $2
      `;

      const { rows } = await pool.query(query, [productId, businessId]);
      if (rows.length === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('findOwnership', error) };
    }
  },

  async countInventory(productId, businessId) {
    if (this._isNil(productId)) {
      return { success: false, error: 'productId is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const query = `
        SELECT COUNT(*) AS count
        FROM inventory
        WHERE product_id = $1
          AND business_id = $2
      `;

      const { rows } = await pool.query(query, [productId, businessId]);
      return { success: true, data: parseInt(rows[0].count, 10) || 0 };
    } catch (error) {
      return { success: false, error: this._handleDbError('countInventory', error) };
    }
  },

  async create(businessId, productData, imageUrl) {
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }
    if (!productData || typeof productData !== 'object') {
      return { success: false, error: 'productData is required' };
    }

    try {
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

      const values = [
        businessId,
        productData.productName,
        productData.productType,
        productData.storageCategory,
        imageUrl,
        productData.shelfLifeDays,
        productData.optimalTempMin || null,
        productData.optimalTempMax || null,
        productData.optimalHumidityMin || null,
        productData.optimalHumidityMax || null,
        productData.unitOfMeasure || 'units'
      ];

      const { rows } = await pool.query(query, values);
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('create', error) };
    }
  },

  async update(productId, businessId, productData) {
    if (this._isNil(productId)) {
      return { success: false, error: 'productId is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }
    if (!productData || typeof productData !== 'object') {
      return { success: false, error: 'productData is required' };
    }

    try {
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
          AND business_id = $11
        RETURNING *
      `;

      const values = [
        productData.productName,
        productData.productType,
        productData.storageCategory,
        productData.shelfLifeDays,
        productData.optimalTempMin,
        productData.optimalTempMax,
        productData.optimalHumidityMin,
        productData.optimalHumidityMax,
        productData.unitOfMeasure,
        productId,
        businessId
      ];

      const { rows, rowCount } = await pool.query(query, values);
      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('update', error) };
    }
  },

  async createInventoryEntry(productId, businessId, quantity, unitOfMeasure, batchNumber, expiryDate) {
    if (this._isNil(productId) || this._isNil(businessId) || this._isNil(quantity)) {
      return { success: false, error: 'productId, businessId and quantity are required' };
    }
  
    try {
      const { rows } = await pool.query(`
        INSERT INTO inventory (
          product_id,
          business_id,
          quantity,
          unit_of_measure,
          batch_number,
          entry_date,
          expected_expiry_date,
          current_condition
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, 'good')
        RETURNING inventory_id, batch_number, expected_expiry_date
      `, [
        productId,
        businessId,
        quantity,
        unitOfMeasure || 'kg',
        batchNumber,
        expiryDate
      ]);
  
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('createInventoryEntry', error) };
    }
  },
  async delete(productId, businessId) {
    if (this._isNil(productId)) {
      return { success: false, error: 'productId is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const query = `
        DELETE FROM products
        WHERE product_id = $1
          AND business_id = $2
        RETURNING product_id
      `;

      const { rows, rowCount } = await pool.query(query, [productId, businessId]);
      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('delete', error) };
    }
  },

  async deleteInventoryByProduct(productId, businessId) {
    if (this._isNil(productId)) {
      return { success: false, error: 'productId is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const query = `
        DELETE FROM inventory
        WHERE product_id = $1
          AND business_id = $2
        RETURNING inventory_id
      `;

      const { rows, rowCount } = await pool.query(query, [productId, businessId]);
      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: this._handleDbError('deleteInventoryByProduct', error) };
    }
  }
};

module.exports = ProductModel;
