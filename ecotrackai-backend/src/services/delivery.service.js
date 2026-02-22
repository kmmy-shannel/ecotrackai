const DeliveryModel  = require('../models/delivery.model');
const aiService      = require('./ai.service');

const CO2_PER_LITER  = 2.31;

const DeliveryService = {

  // Get all deliveries for a business
  async getAllDeliveries(businessId) {
    console.log('Fetching deliveries for businessId:', businessId);
    const deliveries = await DeliveryModel.findAllByBusiness(businessId);
    return { deliveries };
  },

  // Get single delivery — throws if not found
  async getDelivery(routeId) {
    const delivery = await DeliveryModel.findById(routeId);
    if (!delivery) {
      throw { status: 404, message: 'Delivery not found' };
    }
    return { data: delivery };
  },

  // Create delivery with estimated metrics + generated delivery code
  async createDelivery(businessId, body) {
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
    } = body;

    const count        = await DeliveryModel.countByBusiness(businessId);
    const deliveryCode = `DLV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const distance  = totalDistance      || (stops && stops.length ? (stops.length * 15) : 15);
    const duration  = estimatedDuration  || Math.round(distance * 2.5);
    const fuel      = fuelConsumption    || parseFloat((distance * 0.2).toFixed(1));
    const emissions = carbonEmissions    || parseFloat((fuel * CO2_PER_LITER).toFixed(1));

    console.log('Creating delivery:', deliveryCode, 'for businessId:', businessId);

    const newDelivery = await DeliveryModel.create(businessId, {
      deliveryCode,
      deliveryDate,
      driver,
      vehicleType,
      estimatedLoad,
      stops: stops || [
        { location: 'Origin', type: 'origin' },
        { location: 'Destination', type: 'destination' }
      ],
      totalDistance:     parseFloat(distance),
      estimatedDuration: parseInt(duration),
      fuelConsumption:   parseFloat(fuel),
      carbonEmissions:   parseFloat(emissions),
      routeGeometry
    });

    return { delivery: newDelivery };
  },

  // Optimize route using AI service
  async optimizeRoute(routeId) {
    const delivery = await DeliveryModel.findById(routeId);
    if (!delivery) {
      throw { status: 404, message: 'Delivery not found' };
    }

    console.log('Optimizing route with AI service for:', delivery.delivery_code || delivery.id);

    const aiOptimization = await aiService.optimizeDeliveryRoute(delivery);
    console.log('AI Optimization result:', aiOptimization);

    // Normalize raw DB row (snake_case) to camelCase
    const originalRoute = {
      id: delivery.id,
      deliveryCode: delivery.delivery_code,
      stops: delivery.stops || [],
      totalDistance: parseFloat(delivery.total_distance) || 0,
      estimatedDuration: parseInt(delivery.estimated_duration) || 0,
      fuelConsumption: parseFloat(delivery.fuel_consumption) || 0,
      carbonEmissions: parseFloat(delivery.carbon_emissions) || 0,
      routeGeometry: delivery.route_geometry || null,
    };

    const optimizedRoute = {
      id: delivery.id,
      deliveryCode: delivery.delivery_code,
      stops: delivery.stops || [],
      totalDistance: aiOptimization.optimizedDistance || originalRoute.totalDistance,
      estimatedDuration: aiOptimization.optimizedDuration || originalRoute.estimatedDuration,
      fuelConsumption: aiOptimization.optimizedFuel || originalRoute.fuelConsumption,
      carbonEmissions: aiOptimization.optimizedEmissions || originalRoute.carbonEmissions,
    };

    const savings = aiOptimization.savings || {
  distance: (originalRoute.totalDistance - optimizedRoute.totalDistance).toFixed(1),
  time: (originalRoute.estimatedDuration - optimizedRoute.estimatedDuration).toString(),
  fuel: (originalRoute.fuelConsumption - optimizedRoute.fuelConsumption).toFixed(1),
  emissions: (originalRoute.carbonEmissions - optimizedRoute.carbonEmissions).toFixed(1)
};

    return {
      data: {
        originalRoute,
        optimizedRoute,
        savings,
        aiRecommendations: aiOptimization.aiRecommendations || [
          'Reorder stops to minimize backtracking and total distance',
          'Avoid peak traffic hours (8-10 AM) to reduce fuel consumption',
          'Use alternative routes via less congested roads',
          'Consolidate nearby deliveries for better efficiency'
        ]
      }
    };
  },

  // Apply optimization to a delivery
  async applyOptimization(routeId, optimizedRoute) {
    const updated = await DeliveryModel.applyOptimization(routeId, optimizedRoute);
    if (!updated) {
      throw { status: 404, message: 'Delivery not found' };
    }
    return { delivery: updated };
  },

  // Delete delivery — throws if not found
  async deleteDelivery(routeId) {
    const delivery = await DeliveryModel.findById(routeId);
    if (!delivery) {
      throw { status: 404, message: 'Delivery not found' };
    }
    await DeliveryModel.delete(routeId);
  }

};

module.exports = DeliveryService;