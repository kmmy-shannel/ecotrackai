const { Router } = require('express');
const { upload } = require('../config/cloudinary.config');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/product.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation.middleware');

const router = Router();

// Validation rules
const createProductValidation = [
  body('productName').notEmpty().withMessage('Product name is required'),
  body('productType').notEmpty().withMessage('Product type is required'),
  body('storageCategory')
    .notEmpty().withMessage('Storage category is required')
    .isIn(['refrigerated', 'frozen', 'ambient', 'controlled_atmosphere'])
    .withMessage('Invalid storage category'),
  body('shelfLifeDays')
    .notEmpty().withMessage('Shelf life is required')
    .isInt({ min: 1 }).withMessage('Shelf life must be at least 1 day')
];

// All routes require authentication
router.use(authenticate);

// Product CRUD routes
router.get('/', getProducts);
router.get('/:productId', getProductById);
//handles image uploads
router.post(
  '/',
  upload.single('productImage'),
  createProductValidation,
  validateRequest,
  createProduct
);
router.put('/:productId', updateProduct);
router.delete('/:productId', deleteProduct);

module.exports = router;