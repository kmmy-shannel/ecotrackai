const axios = require('axios');

const OLLAMA_API_URL = 'http://localhost:11434/api/generate';

exports.optimizeRouteWithAI = async (delivery, distanceMatrix, durationMatrix, vehicleType) => {
  try {
    const prompt = `You are an expert logistics AI optimizer. Analyze this delivery route and provide optimization.

CURRENT ROUTE:
- Delivery Code: ${delivery.deliveryCode}
- Vehicle: ${vehicleType}
- Driver: ${delivery.driver}
- Current Order: ${delivery.stops.map((s, i) => `${i + 1}. ${s.location}`).join('\n')}

REAL-WORLD DISTANCE MATRIX (km):
Row/Column represents stops in order. Each cell shows distance between stops.
${JSON.stringify(distanceMatrix.map(row => row.map(d => (d / 1000).toFixed(2))), null, 2)}

REAL-WORLD DURATION MATRIX (minutes):
${JSON.stringify(durationMatrix.map(row => row.map(d => (d / 60).toFixed(2))), null, 2)}

CURRENT METRICS:
- Total Distance: ${delivery.totalDistance} km
- Duration: ${delivery.estimatedDuration} minutes
- Fuel: ${delivery.fuelConsumption} L
- CO₂: ${delivery.carbonEmissions} kg

OPTIMIZATION TASK:
1. Find the optimal stop order using the Traveling Salesman Problem (TSP) approach
2. CRITICAL: Keep index 0 (origin) as START and last index (destination) as END - NEVER change these!
3. Only reorder the MIDDLE stops (indices 1 to n-2) to minimize total distance
4. Use the distance matrix to calculate exact total distance for any route order
5. Calculate savings by comparing old vs new route distances
6. Consider traffic patterns, delivery time windows, and vehicle efficiency

CALCULATION EXAMPLE:
If current order is [0,1,2,3,4] (5 stops):
- Total distance = matrix[0][1] + matrix[1][2] + matrix[2][3] + matrix[3][4]
If you suggest [0,2,1,3,4]:
- New distance = matrix[0][2] + matrix[2][1] + matrix[1][3] + matrix[3][4]

FUEL CONSUMPTION RATES (L/km):
- van: 0.12
- truck: 0.25
- refrigerated_truck: 0.30
- motorcycle: 0.04

CO₂ EMISSIONS: 2.31 kg per liter of fuel

Return ONLY valid JSON (no markdown, no code blocks, no explanations outside JSON):
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
    "Route now follows traffic flow patterns reducing congestion delays",
    "Stop 2 moved earlier to avoid morning rush hour at that location",
    "Consolidated deliveries in northern area before heading south"
  ],
  "explanation": "Applied nearest neighbor algorithm with 2-opt optimization. Reordered middle stops to minimize backtracking while respecting origin/destination constraints."
}`;

    console.log('Calling DeepSeek for route optimization...');
    
    const response = await axios.post(OLLAMA_API_URL, {
      model: 'deepseek-r1:1.5b',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,  // Lower temperature for more consistent/logical outputs
        top_p: 0.9,
        num_predict: 1000
      }
    });

    let aiResponse;
    try {
      // DeepSeek might wrap response in markdown, so clean it
      let responseText = response.data.response.trim();
      
      // Remove markdown code blocks if present
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Remove any thinking process text (DeepSeek-R1 specific)
      if (responseText.includes('<think>')) {
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}') + 1;
        responseText = responseText.substring(jsonStart, jsonEnd);
      }
      
      aiResponse = JSON.parse(responseText);
      console.log('DeepSeek optimization parsed successfully:', aiResponse);
    } catch (parseError) {
      console.error('Failed to parse DeepSeek response:', response.data.response);
      throw new Error('AI returned invalid JSON format');
    }

    // Validate the optimized order
    if (!aiResponse.optimizedOrder || aiResponse.optimizedOrder.length !== delivery.stops.length) {
      throw new Error('Invalid optimized order from AI');
    }

    // Verify origin and destination are preserved
    if (aiResponse.optimizedOrder[0] !== 0 || 
        aiResponse.optimizedOrder[aiResponse.optimizedOrder.length - 1] !== delivery.stops.length - 1) {
      console.warn('AI tried to change origin/destination, fixing...');
      aiResponse.optimizedOrder[0] = 0;
      aiResponse.optimizedOrder[aiResponse.optimizedOrder.length - 1] = delivery.stops.length - 1;
    }

    // Build optimized route with real coordinates
    const optimizedStops = aiResponse.optimizedOrder.map(index => delivery.stops[index]);

    // Recalculate actual metrics using the distance matrix
    let actualDistance = 0;
    let actualDuration = 0;
    
    for (let i = 0; i < aiResponse.optimizedOrder.length - 1; i++) {
      const fromIndex = aiResponse.optimizedOrder[i];
      const toIndex = aiResponse.optimizedOrder[i + 1];
      actualDistance += distanceMatrix[fromIndex][toIndex] / 1000; // Convert to km
      actualDuration += durationMatrix[fromIndex][toIndex] / 60;   // Convert to minutes
    }

    // Calculate fuel and emissions for optimized route
    const fuelRates = {
      'van': 0.12,
      'truck': 0.25,
      'refrigerated_truck': 0.30,
      'motorcycle': 0.04
    };
    
    const optimizedFuel = (actualDistance * (fuelRates[vehicleType] || 0.12)).toFixed(2);
    const optimizedEmissions = (optimizedFuel * 2.31).toFixed(2);

    // Calculate actual savings
    const actualSavings = {
      distance: (delivery.totalDistance - actualDistance).toFixed(2),
      time: (delivery.estimatedDuration - actualDuration).toFixed(2),
      fuel: (delivery.fuelConsumption - optimizedFuel).toFixed(2),
      emissions: (delivery.carbonEmissions - optimizedEmissions).toFixed(2),
      cost: ((delivery.fuelConsumption - optimizedFuel) * 55.50).toFixed(2) // ₱55.50 per liter diesel
    };

    console.log('Optimization complete:', {
      originalDistance: delivery.totalDistance,
      optimizedDistance: actualDistance,
      savings: actualSavings
    });

    return {
      originalRoute: {
        id: delivery._id,
        deliveryCode: delivery.deliveryCode,
        stops: delivery.stops,
        totalDistance: delivery.totalDistance,
        estimatedDuration: delivery.estimatedDuration,
        fuelConsumption: delivery.fuelConsumption,
        carbonEmissions: delivery.carbonEmissions,
        routeGeometry: delivery.routeGeometry
      },
      optimizedRoute: {
        stops: optimizedStops,
        totalDistance: parseFloat(actualDistance.toFixed(2)),
        estimatedDuration: parseFloat(actualDuration.toFixed(2)),
        fuelConsumption: parseFloat(optimizedFuel),
        carbonEmissions: parseFloat(optimizedEmissions),
        order: aiResponse.optimizedOrder
      },
      savings: actualSavings,
      aiRecommendations: aiResponse.recommendations || [
        'Route optimized using real-world distance data',
        'Reduced total travel distance and fuel consumption',
        'Maintained origin and destination as fixed points'
      ],
      explanation: aiResponse.explanation || 'Route optimized using TSP algorithm with real distance matrix'
    };
  } catch (error) {
    console.error('DeepSeek optimization error:', error);
    
    // Provide fallback if AI fails
    if (error.code === 'ECONNREFUSED') {
      throw new Error('DeepSeek Ollama is not running. Please start it with: ollama run deepseek-r1:1.5b');
    }
    
    throw error;
  }
};
