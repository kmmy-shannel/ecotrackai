// ============================================================
// FILE LOCATION: backend/src/services/product.service.js
// LAYER: Service (ViewModel) — business logic ONLY, no HTTP/no DB
// ============================================================

const ProductModel = require('../models/product.model');

const VALID_SORT_FIELDS = ['product_name', 'product_type', 'shelf_life_days', 'created_at'];

const ProductService = {

  // Get all products for a business with search + sort logic
  async getAllProducts(businessId, query = {}) {
    const { search, sortBy, sortOrder } = query;

    // Validate + sanitize sort options
    const sortField = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at';
    const order     = sortOrder === 'asc' ? 'ASC' : 'DESC';

    console.log('Fetching products for businessId:', businessId);
    const products = await ProductModel.findAllByBusiness(businessId, search || null, sortField, order);
    console.log('Found products:', products.length);

    return { count: products.length, products };
  },

  // Get single product — throws if not found
  async getProductById(productId, businessId) {
    const product = await ProductModel.findByIdAndBusiness(productId, businessId);

    if (!product) {
      throw { status: 404, message: 'Product not found' };
    }

    return { product };
  },

  // Create a new product — validates required fields
  async createProduct(businessId, body, imageUrl) {
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
    } = body;

    // Validate required fields
    if (!productName || !productType || !storageCategory || !shelfLifeDays) {
      throw { status: 400, message: 'Please provide all required fields' };
    }

    console.log('Creating product for businessId:', businessId);

    const newProduct = await ProductModel.create(businessId, {
      productName,
      productType,
      storageCategory,
      shelfLifeDays,
      optimalTempMin,
      optimalTempMax,
      optimalHumidityMin,
      optimalHumidityMax,
      unitOfMeasure
    }, imageUrl);

    console.log('Product created with ID:', newProduct.product_id);
    return { product: newProduct };
  },

  // Update product — verifies ownership first
  async updateProduct(productId, businessId, body) {
    // Verify product belongs to this business
    const owned = await ProductModel.findOwnership(productId, businessId);
    if (!owned) {
      throw { status: 404, message: 'Product not found or access denied' };
    }

    const updated = await ProductModel.update(productId, body);
    return { product: updated };
  },

  // Delete product — checks inventory + ownership
  async deleteProduct(productId, businessId) {
    // Check if product has inventory records first
    const inventoryCount = await ProductModel.countInventory(productId);
    if (inventoryCount > 0) {
      throw { status: 400, message: 'Cannot delete product with existing inventory records' };
    }

    // Verify ownership
    const owned = await ProductModel.findOwnership(productId, businessId);
    if (!owned) {
      throw { status: 404, message: 'Product not found or access denied' };
    }

    await ProductModel.delete(productId);
  }

};

module.exports = ProductService;