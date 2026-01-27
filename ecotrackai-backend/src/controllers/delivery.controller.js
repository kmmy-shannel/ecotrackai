const Delivery = require('../models/delivery.model');
const { optimizeRouteWithAI } = require('../services/ai.service');

// Get all deliveries
exports.getAllDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      deliveries
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deliveries',
      error: error.message
    });
  }
};

// Get single delivery
exports.getDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    res.json({
      success: true,
      data: delivery
    });
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery',
      error: error.message
    });
  }
};

// Create delivery
exports.createDelivery = async (req, res) => {
  try {
    const {
      deliveryDate,
      driver,
      vehicleType,
      estimatedLoad,
      stops,
      totalDistance,
      estimatedDuration,
      fuelConsumption,
      carbonEmissions,
      routeGeometry
    } = req.body;

    // Generate delivery code
    const deliveryCount = await Delivery.countDocuments();
    const deliveryCode = `DEL-${String(deliveryCount + 1).padStart(5, '0')}`;

    // If no distance provided, estimate it
    const distance = totalDistance || (stops.length * 5); // Rough estimate
    const duration = estimatedDuration || (stops.length * 15); // Rough estimate
    const fuel = fuelConsumption || (distance * 0.12); // Rough estimate
    const emissions = carbonEmissions || (fuel * 2.31); // Rough estimate

    const delivery = new Delivery({
      deliveryCode,
      date: deliveryDate,
      driver,
      vehicleType,
      estimatedLoad,
      stops,
      totalDistance: distance,
      estimatedDuration: duration,
      fuelConsumption: fuel,
      carbonEmissions: emissions,
      routeGeometry,
      status: 'pending',
      userId: req.user.id
    });

    await delivery.save();

    res.status(201).json({
      success: true,
      message: 'Delivery created successfully',
      delivery
    });
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery',
      error: error.message
    });
  }
};

// Optimize route (simple - without matrix)
exports.optimizeRoute = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Call AI service with basic optimization
    const optimization = await optimizeRouteWithAI(delivery, null, null, delivery.vehicleType);

    res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize route',
      error: error.message
    });
  }
};

// Optimize route with distance matrix
exports.optimizeRouteWithMatrix = async (req, res) => {
  try {
    const { id } = req.params;
    const { distanceMatrix, durationMatrix, vehicleType } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Call AI service with real-world data
    const optimization = await optimizeRouteWithAI(
      delivery,
      distanceMatrix,
      durationMatrix,
      vehicleType
    );

    res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize route',
      error: error.message
    });
  }
};

// Apply optimization
exports.applyOptimization = async (req, res) => {
  try {
    const { id } = req.params;
    const { optimizedRoute } = req.body;

    const delivery = await Delivery.findByIdAndUpdate(
      id,
      {
        stops: optimizedRoute.stops,
        totalDistance: optimizedRoute.totalDistance,
        estimatedDuration: optimizedRoute.estimatedDuration,
        fuelConsumption: optimizedRoute.fuelConsumption,
        carbonEmissions: optimizedRoute.carbonEmissions
      },
      { new: true }
    );

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    res.json({
      success: true,
      message: 'Optimization applied successfully',
      delivery
    });
  } catch (error) {
    console.error('Apply optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply optimization',
      error: error.message
    });
  }
};

// Delete delivery
exports.deleteDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findByIdAndDelete(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    res.json({
      success: true,
      message: 'Delivery deleted successfully'
    });
  } catch (error) {
    console.error('Delete delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete delivery',
      error: error.message
    });
  }
};