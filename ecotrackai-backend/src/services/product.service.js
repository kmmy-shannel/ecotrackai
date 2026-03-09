const ProductModel = require('../models/product.model');
const CatalogModel = require('../models/catalog.model');

const VALID_SORT_FIELDS = ['product_name', 'product_type', 'shelf_life_days', 'created_at'];
const ALLOWED_ROLES = new Set(['admin', 'inventory_manager']);

const ProductService = {
  _ok(data = null) {
    return { success: true, data };
  },

  _fail(error) {
    return { success: false, error };
  },

  _isNil(value) {
    return value === null || value === undefined;
  },

  _resolveContext(userOrBusinessId) {
    if (userOrBusinessId && typeof userOrBusinessId === 'object') {
      const userId = userOrBusinessId.userId || userOrBusinessId.user_id || null;
      const businessId = userOrBusinessId.businessId || userOrBusinessId.business_id;
      const role = userOrBusinessId.role;

      if (this._isNil(businessId) || this._isNil(role)) {
        return this._fail('Invalid user context');
      }
      if (!ALLOWED_ROLES.has(role)) {
        return this._fail('Not authorized to access inventory module');
      }
      return this._ok({ userId, businessId, role });
    }

    if (!this._isNil(userOrBusinessId)) {
      return this._ok({ userId: null, businessId: userOrBusinessId, role: 'admin', legacy: true });
    }

    return this._fail('businessId is required');
  },

  async getAllProducts(userOrBusinessId, query = {}) {
    try {
      const ctxResult = this._resolveContext(userOrBusinessId);
      if (!ctxResult.success) return ctxResult;
      const { businessId } = ctxResult.data;

      const { search, sortBy, sortOrder } = query;
      const sortField = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at';
      const order = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      const productsResult = await ProductModel.findAllByBusiness(
        businessId,
        search || null,
        sortField,
        order
      );
      if (!productsResult.success) return productsResult;

      const products = productsResult.data || [];
      return this._ok({ count: products.length, products });
    } catch (error) {
      console.error('[ProductService.getAllProducts]', error);
      return this._fail('Failed to retrieve products');
    }
  },

  async getProductById(productId, userOrBusinessId) {
    try {
      if (this._isNil(productId)) {
        return this._fail('productId is required');
      }

      const ctxResult = this._resolveContext(userOrBusinessId);
      if (!ctxResult.success) return ctxResult;
      const { businessId } = ctxResult.data;

      const productResult = await ProductModel.findByIdAndBusiness(productId, businessId);
      if (!productResult.success) return productResult;

      return this._ok({ product: productResult.data });
    } catch (error) {
      console.error('[ProductService.getProductById]', error);
      return this._fail('Failed to retrieve product');
    }
  },

  async createProduct(userOrBusinessId, body, imageUrl) {
    try {
      const ctxResult = this._resolveContext(userOrBusinessId);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;
  
      if (!['admin', 'inventory_manager'].includes(ctx.role)) {
        return this._fail('Not authorized to create products');
      }
  
      if (!body || typeof body !== 'object') {
        return this._fail('Request body is required');
      }
  
      const {
        productName, productType, storageCategory, shelfLifeDays,
        optimalTempMin, optimalTempMax, optimalHumidityMin, optimalHumidityMax,
        unitOfMeasure, quantity
      } = body;
  
      if (!productName || !productType || !storageCategory || !shelfLifeDays) {
        return this._fail('Please provide all required fields');
      }
  
      const catalogFruit = await CatalogModel.findByName(productName);
      if (!catalogFruit.success) return this._fail('Global fruit catalog is unavailable');
      if (!catalogFruit.data)    return this._fail('Selected fruit must exist in global fruit catalog');
  
      // Reuse existing product row if same fruit already exists for this business
      const pool = require('../config/database');
      const { rows: existing } = await pool.query(
        `SELECT product_id FROM products
         WHERE business_id = $1 AND LOWER(product_name) = LOWER($2)
         LIMIT 1`,
        [ctx.businessId, productName]
      );
  
      let productId;
  
      if (existing.length > 0) {
        productId = existing[0].product_id;
      } else {
        const newProductResult = await ProductModel.create(ctx.businessId, {
          productName, productType, storageCategory, shelfLifeDays,
          optimalTempMin, optimalTempMax, optimalHumidityMin, optimalHumidityMax,
          unitOfMeasure, quantity
        }, imageUrl);
        if (!newProductResult.success) return newProductResult;
        productId = newProductResult.data.product_id;
      }
  
      const parsedQuantity = parseFloat(quantity) || 0;
      if (parsedQuantity <= 0) {
        return this._fail('Quantity must be greater than 0');
      }
  
      // Unique batch number per addition
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const uniqueSuffix = Date.now().toString().slice(-6); // last 6 digits of timestamp
const batchNumber = `${productName.toUpperCase().replace(/\s+/g, '')}-${datePart}-${uniqueSuffix}`;
  
      // Expiry based on THIS batch's shelf life input
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(shelfLifeDays, 10));
      const expiryStr = expiryDate.toISOString().split('T')[0];
  
      const inventoryResult = await ProductModel.createInventoryEntry(
        productId,
        ctx.businessId,
        parsedQuantity,
        unitOfMeasure || 'kg',
        batchNumber,
        expiryStr
      );
      if (!inventoryResult.success) return inventoryResult;
  
      return this._ok({
        product: { product_id: productId, product_name: productName },
        batch: inventoryResult.data
      });
    } catch (error) {
      console.error('[ProductService.createProduct]', error);
      return this._fail('Failed to create product');
    }
  },

  async updateProduct(productId, userOrBusinessId, body) {
    try {
      if (this._isNil(productId)) {
        return this._fail('productId is required');
      }

      const ctxResult = this._resolveContext(userOrBusinessId);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (!['admin', 'inventory_manager'].includes(ctx.role)) {
        return this._fail('Not authorized to update products');
      }

      if (!this._isNil(body?.productName) && String(body.productName).trim() !== '') {
        const catalogFruit = await CatalogModel.findByName(body.productName);
        if (!catalogFruit.success) {
          return this._fail('Global fruit catalog is unavailable');
        }
        if (!catalogFruit.data) {
          return this._fail('Selected fruit must exist in global fruit catalog');
        }
      }

      const ownershipResult = await ProductModel.findOwnership(productId, ctx.businessId);
      if (!ownershipResult.success) return ownershipResult;

      const updatedResult = await ProductModel.update(productId, ctx.businessId, body || {});
      if (!updatedResult.success) return updatedResult;

      return this._ok({ product: updatedResult.data });
    } catch (error) {
      console.error('[ProductService.updateProduct]', error);
      return this._fail('Failed to update product');
    }
  },

  async deleteProduct(productId, userOrBusinessId) {
    try {
      if (this._isNil(productId)) {
        return this._fail('productId is required');
      }

      const ctxResult = this._resolveContext(userOrBusinessId);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (ctx.role !== 'admin') {
        return this._fail('Only admins can delete products');
      }

      const ownershipResult = await ProductModel.findOwnership(productId, ctx.businessId);
      if (!ownershipResult.success) return ownershipResult;

      const deleteInventoryResult = await ProductModel.deleteInventoryByProduct(productId, ctx.businessId);
      if (!deleteInventoryResult.success && deleteInventoryResult.error !== 'Not found or unauthorized') {
        return deleteInventoryResult;
      }

      const deleteProductResult = await ProductModel.delete(productId, ctx.businessId);
      if (!deleteProductResult.success) return deleteProductResult;

      return this._ok({ deleted: true });
    } catch (error) {
      console.error('[ProductService.deleteProduct]', error);
      return this._fail('Failed to delete product');
    }
  }
};

module.exports = ProductService;
