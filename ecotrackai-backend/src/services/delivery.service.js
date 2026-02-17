// ============================================================
// FILE LOCATION: backend/src/services/delivery.service.js
// LAYER: Service (ViewModel) — business logic ONLY, no HTTP/no DB
// ============================================================

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

    // Generate delivery code based on business delivery count
    const count        = await DeliveryModel.countByBusiness(businessId);
    const deliveryCode = `DLV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    // Calculate estimated metrics if not provided (matches frontend logic)
    const distance  = totalDistance      || (stops.length * 15);
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
      stops,
      totalDistance:     parseFloat(distance),
      estimatedDuration: parseInt(duration),
      fuelConsumption:   parseFloat(fuel),
      carbonEmissions:   parseFloat(emissions),
      routeGeometry
    });

    return { delivery: newDelivery };
  },

  // Optimize route using AI service (simple — no matrix)
  async optimizeRoute(routeId) {
    const delivery = await DeliveryModel.findById(routeId);
    if (!delivery) {
      throw { status: 404, message: 'Delivery not found' };
    }

    console.log('Optimizing route with AI service for:', delivery.delivery_code);
    const aiOptimization = await aiService.optimizeDeliveryRoute(delivery);

    const optimizedRoute = {
      ...delivery,
      stops:             delivery.stops,
      totalDistance:     aiOptimization.optimizedDistance,
      estimatedDuration: aiOptimization.optimizedDuration,
      fuelConsumption:   aiOptimization.optimizedFuel,
      carbonEmissions:   aiOptimization.optimizedEmissions
    };

    return {
      data: {
        originalRoute:      delivery,
        optimizedRoute,
        savings:            aiOptimization.savings,
        aiRecommendations:  aiOptimization.aiRecommendations
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