const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const aiService = require('../services/ai.service');

// Mock data with COORDINATES for map rendering
let deliveries = [
  {
    id: 1,
    deliveryCode: 'DLV-2026-001',
    date: '2026-01-25',
    status: 'pending',
    vehicleType: 'refrigerated_truck',
    stops: [
      { 
        location: 'Warehouse A, Manila', 
        type: 'origin', 
        products: [],
        lat: 14.5995,
        lng: 120.9842
      },
      { 
        location: 'Store B, Quezon City', 
        type: 'stop', 
        products: ['Lettuce', 'Tomatoes'],
        lat: 14.6760,
        lng: 121.0437
      },
      { 
        location: 'Store C, Makati', 
        type: 'stop', 
        products: ['Carrots', 'Spinach'],
        lat: 14.5547,
        lng: 121.0244
      },
      { 
        location: 'Store D, Pasig', 
        type: 'destination', 
        products: ['Cabbage'],
        lat: 14.5764,
        lng: 121.0851
      }
    ],
    totalDistance: 45.2,
    estimatedDuration: 120,
    fuelConsumption: 8.5,
    carbonEmissions: 22.4,
    driver: 'Juan Dela Cruz'
  },
  {
    id: 2,
    deliveryCode: 'DLV-2026-002',
    date: '2026-01-25',
    status: 'in_progress',
    vehicleType: 'van',
    stops: [
      { 
        location: 'Distribution Center, Manila', 
        type: 'origin', 
        products: [],
        lat: 14.5995,
        lng: 120.9842
      },
      { 
        location: 'Restaurant A, BGC', 
        type: 'destination', 
        products: ['Fresh Herbs', 'Vegetables'],
        lat: 14.5505,
        lng: 121.0477
      }
    ],
    totalDistance: 12.8,
    estimatedDuration: 35,
    fuelConsumption: 2.4,
    carbonEmissions: 6.3,
    driver: 'Maria Santos'
  }
];

let nextId = 3;

// Get all deliveries
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('Fetching deliveries for user:', req.user.userId);
    
    res.json({
      success: true,
      deliveries: deliveries
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deliveries'
    });
  }
});

// Get single delivery
router.get('/:id', authenticate, async (req, res) => {
  try {
    const deliveryId = parseInt(req.params.id);
    const delivery = deliveries.find(d => d.id === deliveryId);
    
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
      message: 'Failed to fetch delivery'
    });
  }
});

// Create new delivery
router.post('/', authenticate, async (req, res) => {
  try {
    const { deliveryDate, driver, vehicleType, estimatedLoad, stops } = req.body;
    
    console.log('Creating new delivery:', { deliveryDate, driver, vehicleType });
    
    // Calculate estimated metrics
    const totalDistance = stops.length * 15;
    const estimatedDuration = totalDistance * 2.5;
    const fuelConsumption = (totalDistance * 0.2).toFixed(1);
    const carbonEmissions = (parseFloat(fuelConsumption) * 2.6).toFixed(1);
    
    const newDelivery = {
      id: nextId++,
      deliveryCode: `DLV-2026-${String(nextId - 1).padStart(3, '0')}`,
      date: deliveryDate,
      status: 'pending',
      vehicleType,
      driver,
      estimatedLoad,
      stops,
      totalDistance,
      estimatedDuration,
      fuelConsumption: parseFloat(fuelConsumption),
      carbonEmissions: parseFloat(carbonEmissions)
    };
    
    deliveries.push(newDelivery);
    
    res.status(201).json({
      success: true,
      message: 'Delivery created successfully',
      delivery: newDelivery
    });
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery'
    });
  }
});

// Delete delivery
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const deliveryId = parseInt(req.params.id);
    
    console.log('Deleting delivery:', deliveryId);
    
    const index = deliveries.findIndex(d => d.id === deliveryId);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }
    
    deliveries.splice(index, 1);
    
    res.json({
      success: true,
      message: 'Delivery deleted successfully'
    });
  } catch (error) {
    console.error('Delete delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete delivery'
    });
  }
});

// AI Route Optimization - USING CENTRALIZED AI SERVICE
router.post('/:id/optimize', authenticate, async (req, res) => {
  try {
    const deliveryId = parseInt(req.params.id);
    const delivery = deliveries.find(d => d.id === deliveryId);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }
    
    console.log('Optimizing route with AI service for:', delivery.deliveryCode);
    
    // Use the centralized AI service (same as alerts and dashboard)
    const aiOptimization = await aiService.optimizeDeliveryRoute(delivery);
    
    // Build optimized route with AI suggestions
    const optimizedRoute = {
      ...delivery,
      stops: delivery.stops, // Keep same stops order for now (AI can suggest reordering)
      totalDistance: aiOptimization.optimizedDistance,
      estimatedDuration: aiOptimization.optimizedDuration,
      fuelConsumption: aiOptimization.optimizedFuel,
      carbonEmissions: aiOptimization.optimizedEmissions
    };
    
    res.json({
      success: true,
      data: {
        originalRoute: delivery,
        optimizedRoute,
        savings: aiOptimization.savings,
        aiRecommendations: aiOptimization.aiRecommendations
      }
    });
  } catch (error) {
    console.error('❌ Route optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize route',
      error: error.message
    });
  }
});

// Apply optimization
router.put('/:id/apply-optimization', authenticate, async (req, res) => {
  try {
    const deliveryId = parseInt(req.params.id);
    const { optimizedRoute } = req.body;
    
    console.log('💾 Applying optimization for delivery:', deliveryId);
    
    const index = deliveries.findIndex(d => d.id === deliveryId);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }
    
    // Update delivery with optimized data
    deliveries[index] = {
      ...deliveries[index],
      stops: optimizedRoute.stops,
      totalDistance: parseFloat(optimizedRoute.totalDistance),
      estimatedDuration: parseInt(optimizedRoute.estimatedDuration),
      fuelConsumption: parseFloat(optimizedRoute.fuelConsumption),
      carbonEmissions: parseFloat(optimizedRoute.carbonEmissions)
    };
    
    res.json({
      success: true,
      message: 'Optimization applied successfully',
      delivery: deliveries[index]
    });
  } catch (error) {
    console.error('Apply optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply optimization'
    });
  }
});

module.exports = router;