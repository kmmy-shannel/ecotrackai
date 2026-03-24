// ============================================================
// FILE: src/controllers/logistics.controller.js
// ============================================================
const LogisticsService = require('../services/logistics.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

const getLogisticsDashboard = async (req, res) => {
  const result = await LogisticsService.getDashboard(req.user);
  result.success ? sendSuccess(res, 200, 'Dashboard retrieved', result.data)
                 : sendError(res, 400, result.error);
};

const getPendingRoutes = async (req, res) => {
  const result = await LogisticsService.getPendingRoutes(req.user);
  result.success ? sendSuccess(res, 200, 'Pending routes retrieved', result.data)
                 : sendError(res, 400, result.error);
};

const getRouteHistory = async (req, res) => {
  const result = await LogisticsService.getRouteHistory(req.user);
  result.success ? sendSuccess(res, 200, 'History retrieved', result.data)
                 : sendError(res, 400, result.error);
};

const approveRoute = async (req, res) => {
  const result = await LogisticsService.approveRoute(req.params.approvalId, req.user, req.body);
  result.success ? sendSuccess(res, 200, 'Route approved', result.data)
                 : sendError(res, 400, result.error);
};

const declineRoute = async (req, res) => {
  const result = await LogisticsService.declineRoute(req.params.approvalId, req.user, req.body);
  result.success ? sendSuccess(res, 200, 'Route declined', result.data)
                 : sendError(res, 400, result.error);
};

const getDriverMonitor = async (req, res) => {
  const result = await LogisticsService.getDriverMonitor(req.user);
  result.success ? sendSuccess(res, 200, 'Driver monitor data retrieved', result.data)
                 : sendError(res, 400, result.error);
};

const getLogisticsStats = async (req, res) => {
  const result = await LogisticsService.getStats(req.user);
  result.success ? sendSuccess(res, 200, 'Stats retrieved', result.data)
                 : sendError(res, 400, result.error);
};

module.exports = {
  getLogisticsDashboard,
  getPendingRoutes,
  getRouteHistory,
  approveRoute,
  declineRoute,
  getDriverMonitor,
  getLogisticsStats,
};
