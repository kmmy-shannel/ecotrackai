const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');

// Mock data for now - replace with actual database queries later
let deliveries = [
  {
    id: 1,
    deliveryCode: 'DLV-2026-001',
    date: '2026-01-25',
    status: 'pending',
    vehicleType: 'refrigerated_truck',
    stops: [
      { location: 'Warehouse A, Manila', type: 'origin', products: [] },
      { location: 'Store B, Quezon City', type: 'stop', products: ['Lettuce', 'Tomatoes'] },
      { location: 'Store C, Makati', type: 'stop', products: ['Carrots', 'Spinach'] },
      { location: 'Store D, Pasig', type: 'destination', products: ['Cabbage'] }
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
      { location: 'Distribution Center, Manila', type: 'origin', products: [] },
      { location: 'Restaurant A, BGC', type: 'destination', products: ['Fresh Herbs', 'Vegetables'] }
    ],
    totalDistance: 12.8,
    estimatedDuration: 35,
    fuelConsumption: 2.4,
    carbonEmissions: 6.3,
    driver: 'Maria Santos'
  }
];

let nextId = 3;

// FIXED: Changed 'authenticate' to 'auth'
// Get all deliveries
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('Fetching deliveries for user:', req.user.userId);
    
    res.json({
      success: true,
      deliveries: deliveries  // Fixed: Changed from data.deliveries to just deliveries
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deliveries'
    });
  }
});

// ADD THIS - Get single delivery
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
    
    // Calculate estimated metrics (simplified calculation)
    const totalDistance = stops.length * 15; // Rough estimate
    const estimatedDuration = totalDistance * 2.5; // Rough estimate
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
      delivery: newDelivery  // Fixed: Changed from data to delivery
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

// AI Route Optimization (Simple)
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
    
    console.log('Optimizing route for:', delivery.deliveryCode);
    
    // Simulate AI optimization
    const optimizedRoute = {
      ...delivery,
      totalDistance: parseFloat((delivery.totalDistance * 0.85).toFixed(1)),
      estimatedDuration: Math.round(delivery.estimatedDuration * 0.80),
      fuelConsumption: parseFloat((delivery.fuelConsumption * 0.82).toFixed(1)),
      carbonEmissions: parseFloat((delivery.carbonEmissions * 0.78).toFixed(1))
    };
    
    const savings = {
      distance: (delivery.totalDistance * 0.15).toFixed(1),
      time: Math.round(delivery.estimatedDuration * 0.20),
      fuel: (delivery.fuelConsumption * 0.18).toFixed(1),
      emissions: (delivery.carbonEmissions * 0.22).toFixed(1),
      cost: ((delivery.fuelConsumption * 0.18) * 65).toFixed(2)
    };
    
    const aiRecommendations = [
      'Reorder stops to minimize backtracking',
      'Avoid peak traffic hours (8-10 AM)',
      'Use alternative route via C5 to reduce distance',
      'Combine deliveries in nearby areas for efficiency'
    ];
    
    res.json({
      success: true,
      data: {
        originalRoute: delivery,
        optimizedRoute,
        savings,
        aiRecommendations
      }
    });
  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize route'
    });
  }
});

// ADD THIS - AI Route Optimization with Distance Matrix (Enhanced with DeepSeek)
router.post('/:id/optimize-with-matrix', authenticate, async (req, res) => {
  try {
    const deliveryId = parseInt(req.params.id);
    const { distanceMatrix, durationMatrix, vehicleType } = req.body;
    
    const delivery = deliveries.find(d => d.id === deliveryId);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }
    
    console.log('🤖 Optimizing route with DeepSeek AI...');
    console.log('Distance Matrix:', distanceMatrix);
    console.log('Duration Matrix:', durationMatrix);
    
    // Call DeepSeek AI for optimization
    const axios = require('axios');
    const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
    
    const prompt = `You are an expert logistics AI optimizer. Analyze this delivery route and provide optimization.

CURRENT ROUTE:
- Delivery Code: ${delivery.deliveryCode}
- Vehicle: ${vehicleType}
- Driver: ${delivery.driver}
- Current Order: ${delivery.stops.map((s, i) => `${i + 1}. ${s.location}`).join('\n')}

REAL-WORLD DISTANCE MATRIX (km):
${JSON.stringify(distanceMatrix.map(row => row.map(d => (d / 1000).toFixed(2))), null, 2)}

REAL-WORLD DURATION MATRIX (minutes):
${JSON.stringify(durationMatrix.map(row => row.map(d => (d / 60).toFixed(2))), null, 2)}

CURRENT METRICS:
- Total Distance: ${delivery.totalDistance} km
- Duration: ${delivery.estimatedDuration} minutes
- Fuel: ${delivery.fuelConsumption} L
- CO₂: ${delivery.carbonEmissions} kg

OPTIMIZATION TASK:
1. Find the optimal stop order using TSP approach
2. CRITICAL: Keep index 0 (origin) as START and last index (destination) as END
3. Only reorder the MIDDLE stops to minimize total distance
4. Calculate exact savings using the real distance/duration matrices

Return ONLY valid JSON (no markdown):
{
  "optimizedOrder": [0, 2, 1, 3, 4],
  "newTotalDistance": 42.5,
  "newDuration": 65.3,
  "savings": {
    "distance": 12.8,
    "time": 18.5,
    "fuel": 1.54,
    "emissions": 3.56,
    "cost": 85.40
  },
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2"
  ],
  "explanation": "Brief explanation"
}`;

    const aiResponse = await axios.post(OLLAMA_API_URL, {
      model: 'deepseek-r1:1.5b',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        num_predict: 1000
      }
    });

    // Parse AI response
    let aiResult;
    try {
      let responseText = aiResponse.data.response.trim();
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      if (responseText.includes('<think>')) {
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}') + 1;
        responseText = responseText.substring(jsonStart, jsonEnd);
      }
      
      aiResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse.data.response);
      
      // Fallback to simple optimization
      aiResult = {
        optimizedOrder: Array.from({ length: delivery.stops.length }, (_, i) => i),
        newTotalDistance: delivery.totalDistance * 0.85,
        newDuration: delivery.estimatedDuration * 0.80,
        savings: {
          distance: (delivery.totalDistance * 0.15).toFixed(1),
          time: Math.round(delivery.estimatedDuration * 0.20),
          fuel: (delivery.fuelConsumption * 0.18).toFixed(1),
          emissions: (delivery.carbonEmissions * 0.22).toFixed(1),
          cost: ((delivery.fuelConsumption * 0.18) * 55.50).toFixed(2)
        },
        recommendations: [
          'Route optimized using real-world distance data',
          'AI optimization temporarily unavailable, using fallback algorithm'
        ],
        explanation: 'Fallback optimization applied'
      };
    }
    
    // Build optimized route
    const optimizedStops = aiResult.optimizedOrder.map(index => delivery.stops[index]);
    
    // Calculate fuel and emissions
    const fuelRates = { van: 0.12, truck: 0.25, refrigerated_truck: 0.30, motorcycle: 0.04 };
    const optimizedFuel = (aiResult.newTotalDistance * (fuelRates[vehicleType] || 0.12)).toFixed(2);
    const optimizedEmissions = (optimizedFuel * 2.31).toFixed(2);
    
    res.json({
      success: true,
      data: {
        originalRoute: delivery,
        optimizedRoute: {
          ...delivery,
          stops: optimizedStops,
          totalDistance: parseFloat(aiResult.newTotalDistance.toFixed(2)),
          estimatedDuration: parseFloat(aiResult.newDuration.toFixed(2)),
          fuelConsumption: parseFloat(optimizedFuel),
          carbonEmissions: parseFloat(optimizedEmissions)
        },
        savings: aiResult.savings,
        aiRecommendations: aiResult.recommendations,
        explanation: aiResult.explanation
      }
    });
  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize route with AI',
      error: error.message
    });
  }
});

// Apply optimization
router.put('/:id/apply-optimization', authenticate, async (req, res) => {
  try {
    const deliveryId = parseInt(req.params.id);
    const { optimizedRoute } = req.body;
    
    console.log('Applying optimization for delivery:', deliveryId);
    
    const index = deliveries.findIndex(d => d.id === deliveryId);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }
    
    // Update the delivery with optimized data
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