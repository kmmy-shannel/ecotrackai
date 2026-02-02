const Alert = require('../models/alert.model');

exports.getAllAlerts = async (req, res) => {
  try {
    const alerts = await Alert.getAll();
    
    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
};

exports.getAlertsByRiskLevel = async (req, res) => {
  try {
    const { riskLevel } = req.params;
    
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(riskLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid risk level'
      });
    }
    
    const alerts = await Alert.getByRiskLevel(riskLevel);
    
    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length
      }
    });
  } catch (error) {
    console.error('Get alerts by risk level error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
};

exports.createAlert = async (req, res) => {
  try {
    const alertData = req.body;
    
    const alertId = await Alert.create(alertData);
    
    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: { id: alertId }
    });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create alert',
      error: error.message
    });
  }
};

exports.updateAlertStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await Alert.updateStatus(id, status);
    
    res.json({
      success: true,
      message: 'Alert status updated successfully'
    });
  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert',
      error: error.message
    });
  }
};

exports.deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    
    await Alert.delete(id);
    
    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete alert',
      error: error.message
    });
  }
};

exports.getAlertStats = async (req, res) => {
  try {
    const stats = await Alert.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert statistics',
      error: error.message
    });
  }
};