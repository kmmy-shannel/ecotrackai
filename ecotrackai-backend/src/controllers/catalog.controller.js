const CatalogService = require('../services/catalog.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

const getCatalog = async (req, res) => {
  try {
    const result = await CatalogService.getCatalog(req.user);
    if (!result.success) {
      return sendError(res, result.statusCode || 400, result.error || 'Failed to retrieve catalog');
    }
    return sendSuccess(res, 200, 'Global fruit catalog retrieved successfully', result.data);
  } catch (error) {
    console.error('[CatalogController.getCatalog]', error);
    return sendError(res, error.status || 500, error.message || 'Failed to retrieve catalog');
  }
};

const getCatalogWithDetails = async (req, res) => {
  try {
    const result = await CatalogService.getCatalogWithDetails(req.user);
    if (!result.success) {
      return sendError(res, result.statusCode || 400, result.error || 'Failed to retrieve catalog details');
    }
    return sendSuccess(res, 200, 'Global fruit catalog with details retrieved successfully', result.data);
  } catch (error) {
    console.error('[CatalogController.getCatalogWithDetails]', error);
    return sendError(res, error.status || 500, error.message || 'Failed to retrieve catalog details');
  }
};

const getCatalogFruitById = async (req, res) => {
  try {
    const result = await CatalogService.getCatalogFruitById(req.user, req.params.fruitId);
    if (!result.success) {
      return sendError(res, result.statusCode || 400, result.error || 'Failed to retrieve fruit');
    }
    return sendSuccess(res, 200, 'Global fruit catalog item retrieved successfully', result.data);
  } catch (error) {
    console.error('[CatalogController.getCatalogFruitById]', error);
    return sendError(res, error.status || 500, error.message || 'Failed to retrieve fruit');
  }
};

const createCatalogFruit = async (req, res) => {
  try {
    const result = await CatalogService.createCatalogFruit(req.user, req.body);
    if (!result.success) {
      return sendError(res, result.statusCode || 400, result.error || 'Failed to create fruit');
    }
    return sendSuccess(res, 201, 'Global fruit catalog item created successfully', result.data);
  } catch (error) {
    console.error('[CatalogController.createCatalogFruit]', error);
    return sendError(res, error.status || 500, error.message || 'Failed to create fruit');
  }
};

const updateCatalogFruit = async (req, res) => {
  try {
    const result = await CatalogService.updateCatalogFruit(req.user, req.params.fruitId, req.body);
    if (!result.success) {
      return sendError(res, result.statusCode || 400, result.error || 'Failed to update fruit');
    }
    return sendSuccess(res, 200, 'Global fruit catalog item updated successfully', result.data);
  } catch (error) {
    console.error('[CatalogController.updateCatalogFruit]', error);
    return sendError(res, error.status || 500, error.message || 'Failed to update fruit');
  }
};

const deleteCatalogFruit = async (req, res) => {
  try {
    const result = await CatalogService.deleteCatalogFruit(req.user, req.params.fruitId);
    if (!result.success) {
      return sendError(res, result.statusCode || 400, result.error || 'Failed to delete fruit');
    }
    return sendSuccess(res, 200, 'Global fruit catalog item deleted successfully', result.data);
  } catch (error) {
    console.error('[CatalogController.deleteCatalogFruit]', error);
    return sendError(res, error.status || 500, error.message || 'Failed to delete fruit');
  }
};

module.exports = {
  getCatalog,
  getCatalogWithDetails,
  getCatalogFruitById,
  createCatalogFruit,
  updateCatalogFruit,
  deleteCatalogFruit
};