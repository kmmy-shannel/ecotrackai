// ============================================================
// FILE LOCATION: backend/src/controllers/product.controller.js
// LAYER: Controller (View) — HTTP handling ONLY
// No DB queries. No business logic. Only req/res.
// ============================================================

const ProductService = require('../services/product.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

// GET /api/products
const getProducts = async (req, res) => {
  try {
    console.log('GET PRODUCTS ENDPOINT HIT!');
    console.log('User:', req.user);
    console.log('Query params:', req.query);

    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const result = await ProductService.getAllProducts(req.user.businessId, req.query);
    sendSuccess(res, 200, 'Products retrieved successfully', result);

  } catch (error) {
    console.error('GET PRODUCTS ERROR:', error);
    sendError(res, error.status || 500, error.message || 'Failed to retrieve products');
  }
};

// GET /api/products/:productId
const getProductById = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const result = await ProductService.getProductById(
      req.params.productId,
      req.user.businessId
    );
    sendSuccess(res, 200, 'Product retrieved successfully', result);

  } catch (error) {
    console.error('GET PRODUCT BY ID ERROR:', error);
    sendError(res, error.status || 500, error.message || 'Failed to retrieve product');
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  try {
    console.log('CREATING PRODUCT');
    console.log('Request by user:', req.user.userId);
    console.log('Request data:', req.body);

    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    // imageUrl comes from multer/cloudinary middleware
    const imageUrl = req.file ? req.file.path : null;

    const result = await ProductService.createProduct(
      req.user.businessId,
      req.body,
      imageUrl
    );
    sendSuccess(res, 201, 'Product created successfully', result);

  } catch (error) {
    console.error('CREATE PRODUCT ERROR:', error);
    sendError(res, error.status || 500, error.message || 'Failed to create product');
  }
};

// PUT /api/products/:productId
const updateProduct = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const result = await ProductService.updateProduct(
      req.params.productId,
      req.user.businessId,
      req.body
    );
    sendSuccess(res, 200, 'Product updated successfully', result);

  } catch (error) {
    console.error('UPDATE PRODUCT ERROR:', error);
    sendError(res, error.status || 500, error.message || 'Failed to update product');
  }
};

// DELETE /api/products/:productId
const deleteProduct = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    await ProductService.deleteProduct(
      req.params.productId,
      req.user.businessId
    );
    sendSuccess(res, 200, 'Product deleted successfully');

  } catch (error) {
    console.error('DELETE PRODUCT ERROR:', error);
    sendError(res, error.status || 500, error.message || 'Failed to delete product');
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};