const { Router } = require('express');
const { body }   = require('express-validator');
const { authenticate, authorize }  = require('../middleware/auth.middleware');
const { validateRequest }          = require('../middleware/validation.middleware');
const {
  getCatalog,
  getCatalogWithDetails,
  getCatalogFruitById,
  createCatalogFruit,
  updateCatalogFruit,
  deleteCatalogFruit
} = require('../controllers/catalog.controller');

const router = Router();

// ── Validation schemas ────────────────────────────────────────────────────

const catalogValidation = [
  body('name').notEmpty().withMessage('name is required'),
  body('default_storage_type')
    .notEmpty().withMessage('default_storage_type is required')
    .isIn(['refrigerated', 'frozen', 'ambient', 'controlled_atmosphere'])
    .withMessage('Invalid default_storage_type'),
  body('temperature_range_min')
    .notEmpty().withMessage('temperature_range_min is required')
    .isFloat().withMessage('temperature_range_min must be numeric'),
  body('temperature_range_max')
    .notEmpty().withMessage('temperature_range_max is required')
    .isFloat().withMessage('temperature_range_max must be numeric'),
  body('humidity_range').notEmpty().withMessage('humidity_range is required'),
  body('default_shelf_life_days')
    .notEmpty().withMessage('default_shelf_life_days is required')
    .isInt({ min: 1 }).withMessage('default_shelf_life_days must be a positive integer')
];

const updateCatalogValidation = [
  body('name').optional().notEmpty().withMessage('name cannot be empty'),
  body('default_storage_type')
    .optional()
    .isIn(['refrigerated', 'frozen', 'ambient', 'controlled_atmosphere'])
    .withMessage('Invalid default_storage_type'),
  body('temperature_range_min').optional().isFloat().withMessage('temperature_range_min must be numeric'),
  body('temperature_range_max').optional().isFloat().withMessage('temperature_range_max must be numeric'),
  body('humidity_range').optional().notEmpty().withMessage('humidity_range cannot be empty'),
  body('default_shelf_life_days')
    .optional()
    .isInt({ min: 1 }).withMessage('default_shelf_life_days must be a positive integer')
];

// ── Routes ────────────────────────────────────────────────────────────────

router.use(authenticate);

// GET /api/catalog/details — full ripeness + compatibility data for AddProductModal
// NOTE: must be declared BEFORE /:fruitId to avoid "details" being treated as an ID
router.get('/details', authorize('super_admin', 'admin'), getCatalogWithDetails);

// GET /api/catalog — basic list
router.get('/', authorize('super_admin', 'admin'), getCatalog);

// GET /api/catalog/:fruitId — single fruit
router.get('/:fruitId', authorize('super_admin', 'admin'), getCatalogFruitById);

// POST /api/catalog — super admin creates fruit
router.post(
  '/',
  authorize('super_admin'),
  catalogValidation,
  validateRequest,
  createCatalogFruit
);

// PUT /api/catalog/:fruitId — super admin updates fruit
router.put(
  '/:fruitId',
  authorize('super_admin'),
  updateCatalogValidation,
  validateRequest,
  updateCatalogFruit
);

// DELETE /api/catalog/:fruitId — super admin deletes fruit
router.delete('/:fruitId', authorize('super_admin'), deleteCatalogFruit);

module.exports = router;