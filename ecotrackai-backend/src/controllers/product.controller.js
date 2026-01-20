const pool = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response.utils');

// Get all products for current business
const getProducts = async (req, res) => {
  try {
    console.log('========================================');
    console.log('🔥 GET PRODUCTS ENDPOINT HIT!');
    console.log('User:', req.user);
    console.log('Query params:', req.query);
    console.log('========================================');

    if (!req.user) {
      console.log('❌ No user found in request');
      return sendError(res, 401, 'Not authenticated');
    }

    const { search, sortBy, sortOrder } = req.query;

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

    const params = [req.user.businessId];

    // Add search filter
    if (search) {
      query += ` AND p.product_name ILIKE $2`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY p.product_id`;

    // Add sorting
    const validSortFields = ['product_name', 'product_type', 'shelf_life_days', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY p.${sortField} ${order}`;

    console.log('📊 Executing query for businessId:', req.user.businessId);
    const { rows } = await pool.query(query, params);
    console.log('✅ Found products:', rows.length);

    sendSuccess(res, 200, 'Products retrieved successfully', {
      count: rows.length,
      products: rows
    });

  } catch (error) {
    console.error('========================================');
    console.error('GET PRODUCTS ERROR');
    console.error('Error:', error);
    console.error('========================================');
    sendError(res, 500, 'Failed to retrieve products', error.message);
  }
};
// Get single product by ID
const getProductById = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const { productId } = req.params;

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

    const { rows } = await pool.query(query, [productId, req.user.businessId]);

    if (rows.length === 0) {
      return sendError(res, 404, 'Product not found');
    }

    sendSuccess(res, 200, 'Product retrieved successfully', {
      product: rows[0]
    });

  } catch (error) {
    console.error('Get product error:', error);
    sendError(res, 500, 'Failed to retrieve product', error.message);
  }
};

// Create new product
const createProduct = async (req, res) => {
  const imageUrl = req.file ? req.file.path : null;
  try {
    console.log('========================================');
    console.log('CREATING PRODUCT');
    console.log('Request by user:', req.user.userId);
    console.log('Request data:', req.body);
    console.log('========================================');

    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const {
      productName,
      productType,
      storageCategory,
      shelfLifeDays,
      optimalTempMin,
      optimalTempMax,
      optimalHumidityMin,
      optimalHumidityMax,
      unitOfMeasure
    } = req.body;

    // Validate required fields
    if (!productName || !productType || !storageCategory || !shelfLifeDays) {
      console.log('Missing required fields');
      return sendError(res, 400, 'Please provide all required fields');
    }

    // Create product
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)
      RETURNING *
    `;
     

  const result = await pool.query(query, [
  req.user.businessId,       // $1
  productName,               // $2
  productType,               // $3
  storageCategory,           // $4
  imageUrl,                  // $5 CLOUDINARY URL
  shelfLifeDays,             // $6
  optimalTempMin || null,    // $7
  optimalTempMax || null,    // $8
  optimalHumidityMin || null,// $9
  optimalHumidityMax || null,// $10
  unitOfMeasure || 'units'   // $11
]);
    const newProduct = result.rows[0];
    console.log('✅ Product created with ID:', newProduct.product_id);

    sendSuccess(res, 201, 'Product created successfully', {
      product: newProduct
    });

  } catch (error) {
    console.error('========================================');
    console.error('❌ CREATE PRODUCT ERROR');
    console.error('Error:', error);
    console.error('========================================');
    sendError(res, 500, 'Failed to create product', error.message);
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const { productId } = req.params;
    const {
      productName,
      productType,
      storageCategory,
      shelfLifeDays,
      optimalTempMin,
      optimalTempMax,
      optimalHumidityMin,
      optimalHumidityMax,
      unitOfMeasure
    } = req.body;

    // Check if product belongs to user's business
    const checkQuery = `
      SELECT product_id FROM products 
      WHERE product_id = $1 AND business_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [productId, req.user.businessId]);

    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Product not found or access denied');
    }

    // Update product
    const updateQuery = `
      UPDATE products 
      SET 
        product_name = COALESCE($1, product_name),
        product_type = COALESCE($2, product_type),
        storage_category = COALESCE($3, storage_category),
        shelf_life_days = COALESCE($4, shelf_life_days),
        optimal_temp_min = COALESCE($5, optimal_temp_min),
        optimal_temp_max = COALESCE($6, optimal_temp_max),
        optimal_humidity_min = COALESCE($7, optimal_humidity_min),
        optimal_humidity_max = COALESCE($8, optimal_humidity_max),
        unit_of_measure = COALESCE($9, unit_of_measure)
      WHERE product_id = $10
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      productName,
      productType,
      storageCategory,
      shelfLifeDays,
      optimalTempMin,
      optimalTempMax,
      optimalHumidityMin,
      optimalHumidityMax,
      unitOfMeasure,
      productId
    ]);

    sendSuccess(res, 200, 'Product updated successfully', {
      product: result.rows[0]
    });

  } catch (error) {
    console.error('Update product error:', error);
    sendError(res, 500, 'Failed to update product', error.message);
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const { productId } = req.params;

    // Check if product has inventory
    const inventoryCheck = await pool.query(
      'SELECT COUNT(*) as count FROM inventory WHERE product_id = $1',
      [productId]
    );

    if (inventoryCheck.rows[0].count > 0) {
      return sendError(res, 400, 'Cannot delete product with existing inventory records');
    }

    // Check if product belongs to user's business
    const checkQuery = `
      SELECT product_id FROM products 
      WHERE product_id = $1 AND business_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [productId, req.user.businessId]);

    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Product not found or access denied');
    }

    // Delete product
    await pool.query('DELETE FROM products WHERE product_id = $1', [productId]);

    sendSuccess(res, 200, 'Product deleted successfully');

  } catch (error) {
    console.error('Delete product error:', error);
    sendError(res, 500, 'Failed to delete product', error.message);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};