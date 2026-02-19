const axios = require('axios');

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:7b';

class AIService {
  /**
   * Generate AI insights for alert spoilage
   */
  async generateAlertInsights(alertData) {
    try {
      const prompt = `IMPORTANT: Respond with ONLY valid JSON. No thinking process, no markdown, no explanations.

You are an expert supply chain analyst. Analyze this spoilage alert and provide recommendations.

ALERT:
- Product: ${alertData.product_name}
- Risk: ${alertData.risk_level}
- Days Left: ${alertData.days_left}
- Temp: ${alertData.temperature}°C
- Humidity: ${alertData.humidity}%
- Location: ${alertData.location}
- Quantity: ${alertData.quantity}
- Value: ₱${alertData.value}

Context: Perishable food in Philippines, tropical climate.

Provide:
1. 3-5 specific actionable recommendations
2. 3 priority actions with timeframes
3. Cost savings estimate (number only)

Respond ONLY with this JSON (no other text):
{
  "recommendations": ["rec 1", "rec 2", "rec 3"],
  "priority_actions": ["Immediate: action", "Short-term: action", "Medium: action"],
  "cost_impact": "3200.00"
}`;

      console.log('Calling Ollama for alert insights...');
      
      const response = await axios.post(OLLAMA_API_URL, {
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 800
        }
      }, {
        timeout: 60000
      });

      console.log('Raw Ollama response:', response.data.response?.substring(0, 200));
      
      return this.parseOllamaResponse(response.data.response, () => this.getFallbackAlertInsights(alertData));
      
    } catch (error) {
      console.error('Ollama AI Service Error:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.warn('Ollama not running. Using fallback.');
      }
      
      return this.getFallbackAlertInsights(alertData);
    }
  }

  /**
   * Generate AI insights for dashboard
   */
  async generateDashboardInsights(stats) {
    try {
      const prompt = `IMPORTANT: Respond with ONLY valid JSON. No thinking, no markdown, no extra text.

You are a business analyst. Analyze these metrics and provide urgent recommendations.

METRICS:
- Products: ${stats.totalProducts}
- Deliveries: ${stats.totalDeliveries}
- Alerts: ${stats.totalAlerts}
- Eco Score: ${stats.ecoScore}/100
- Profit: ₱${stats.profit}

Provide:
1. 2-3 urgent recommendations (priority: HIGH/MEDIUM/LOW, type: SPOILAGE/ROUTE/ENERGY/FINANCIAL)
2. Today's overview with key metrics, opportunities, warnings

Respond ONLY with this JSON:
{
  "urgentRecommendations": [
    {
      "priority": "HIGH",
      "type": "SPOILAGE",
      "title": "Brief title",
      "description": "Issue description",
      "estimatedImpact": {
        "financial": "₱15,000",
        "timeframe": "24 hours"
      },
      "actionRequired": "Specific action"
    }
  ],
  "todayOverview": {
    "keyMetrics": ["metric 1", "metric 2"],
    "opportunities": ["opp 1"],
    "warnings": ["warning 1"]
  }
}`;

      console.log('🤖 Calling Ollama for dashboard insights...');
      
      const response = await axios.post(OLLAMA_API_URL, {
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 1200
        }
      }, {
        timeout: 60000
      });

      console.log('📝 Raw dashboard response:', response.data.response?.substring(0, 200));
      
      return this.parseOllamaResponse(response.data.response, () => this.getFallbackDashboardInsights(stats));
      
    } catch (error) {
      console.error('🤖 Dashboard AI Error:', error.message);
      return this.getFallbackDashboardInsights(stats);
    }
  }

  /**
   * Optimize delivery route with AI - IMPROVED PROMPT
   */
  async optimizeDeliveryRoute(delivery) {
    try {
      // Format stops for the prompt
      const stopsList = delivery.stops?.map((stop, index) => {
        return `${index + 1}. ${stop.location} (${stop.type}) - Lat: ${stop.lat}, Lng: ${stop.lng}`;
      }).join('\n');

      const prompt = `IMPORTANT: Respond with ONLY valid JSON. No thinking process, no markdown, no explanations.

You are a logistics optimization expert specializing in route planning. Analyze this delivery route and provide optimized metrics.

DELIVERY DETAILS:
- Delivery Code: ${delivery.deliveryCode || 'N/A'}
- Vehicle Type: ${delivery.vehicleType || 'van'}
- Current Total Distance: ${delivery.totalDistance || 50} km
- Current Estimated Duration: ${delivery.estimatedDuration || 120} minutes
- Current Fuel Consumption: ${delivery.fuelConsumption || 10} liters
- Current CO₂ Emissions: ${delivery.carbonEmissions || 25} kg

STOPS (in current order):
${stopsList || '1. Origin (origin)\n2. Destination (destination)'}

TASK:
Based on logistics optimization principles (avoiding backtracking, considering traffic patterns, optimizing stop order while keeping origin first and destination last), calculate:

1. OPTIMIZED DISTANCE: A realistic reduced distance (8-20% reduction)
2. OPTIMIZED DURATION: A realistic reduced time (10-25% reduction)
3. OPTIMIZED FUEL: A realistic reduced fuel consumption (8-18% reduction)
4. OPTIMIZED EMISSIONS: A realistic reduced CO₂ (10-20% reduction)
5. SAVINGS: Calculate the differences
6. RECOMMENDATIONS: 4-5 specific, actionable recommendations for this route

Respond ONLY with this JSON format:
{
  "optimizedDistance": 42.5,
  "optimizedDuration": 95,
  "optimizedFuel": 8.2,
  "optimizedEmissions": 21.3,
  "savings": {
    "distance": "7.5",
    "time": "25",
    "fuel": "1.8",
    "emissions": "3.7",
    "cost": "99.90"
  },
  "aiRecommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2",
    "Specific recommendation 3",
    "Specific recommendation 4"
  ]
}`;

      console.log('🚚 Calling Ollama for route optimization with DeepSeek...');
      
      const response = await axios.post(OLLAMA_API_URL, {
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3, // Lower temperature for more consistent results
          top_p: 0.9,
          num_predict: 1000
        }
      }, {
        timeout: 60000 // 60 second timeout
      });

      console.log('✅ Raw route optimization response received');
      
      // Try to parse the response
      try {
        const parsedResponse = this.parseOllamaResponse(response.data.response, () => null);
        if (parsedResponse) {
          console.log('✅ Successfully parsed AI response');
          return parsedResponse;
        }
      } catch (parseError) {
        console.error('❌ Failed to parse AI response:', parseError.message);
      }
      
      // If parsing fails, use fallback
      console.log('⚠️ Using fallback route optimization');
      return this.getFallbackRouteOptimization(delivery);
      
    } catch (error) {
      console.error('❌ Route Optimization AI Error:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.warn('⚠️ Ollama not running. Make sure Ollama is installed and running with: ollama run deepseek-r1:7b');
      }
      
      return this.getFallbackRouteOptimization(delivery);
    }
  }

  /**
   * Parse Ollama response - handles DeepSeek thinking tags
   */
  parseOllamaResponse(responseText, fallbackFn) {
    try {
      if (!responseText) {
        console.warn('Empty response from Ollama');
        return fallbackFn();
      }

      let cleanText = responseText.trim();
      
      // Remove markdown code blocks
      cleanText = cleanText.replace(/```json\n?/gi, '').replace(/```\n?/g, '');
      
      // Remove DeepSeek thinking process (between  and )
      const thinkRegex = /[\s\S]*?<\/think>/g;
      cleanText = cleanText.replace(thinkRegex, '');
      
      // Also remove any "Thinking..." text
      cleanText = cleanText.replace(/Thinking.*?\n/g, '');
      
      // Find JSON object (between first { and last })
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanText = cleanText.substring(jsonStart, jsonEnd);
      }
      
      // Try to parse
      const parsed = JSON.parse(cleanText);
      console.log('✅ Ollama response parsed successfully');
      return parsed;
      
    } catch (parseError) {
      console.error('❌ Failed to parse Ollama response');
      console.error('Response preview:', responseText?.substring(0, 300));
      console.error('Parse error:', parseError.message);
      return fallbackFn();
    }
  }

  /**
   * Fallback insights for alerts (rule-based)
   */
  getFallbackAlertInsights(alertData) {
    console.log('Using fallback alert insights');
    
    const daysLeft = alertData.days_left || 0;
    const riskLevel = alertData.risk_level;
    const value = parseFloat(alertData.value || 0);
    
    let recommendations = [];
    let priorityActions = [];
    let costImpact = 0;
    
    if (riskLevel === 'HIGH') {
      recommendations = [
        `Immediate delivery recommended - only ${daysLeft} days remaining before expiry`,
        'Consider promotional pricing (20-30% discount) to accelerate sales',
        'Prioritize this product for next delivery batch to key buyers',
        `Monitor temperature (${alertData.temperature}°C) - verify cooling is optimal`,
        'Alert top 3 customers about limited-time bulk order availability'
      ];
      priorityActions = [
        'Immediate: Schedule delivery within 24-48 hours to prevent spoilage',
        'Short-term: Contact key buyers for emergency bulk orders with discount',
        'Medium-term: Review supplier lead times to reduce storage duration'
      ];
      costImpact = (value * 0.80).toFixed(2);
    } else if (riskLevel === 'MEDIUM') {
      recommendations = [
        `Product has ${daysLeft} days remaining - schedule delivery within next week`,
        'Monitor storage conditions daily to ensure optimal preservation',
        'Consider bundling with faster-moving products to accelerate turnover',
        `Current humidity ${alertData.humidity}% - ensure within optimal range`
      ];
      priorityActions = [
        'Short-term: Plan delivery route to include this product within 5-7 days',
        'Medium-term: Optimize storage conditions if suboptimal',
        'Long-term: Adjust ordering quantities based on demand patterns'
      ];
      costImpact = (value * 0.50).toFixed(2);
    } else {
      recommendations = [
        'Product condition is stable - continue regular monitoring',
        'Maintain current storage conditions to preserve quality',
        `Shelf life of ${daysLeft} days allows standard distribution`,
        'No immediate action required - product within safe parameters'
      ];
      priorityActions = [
        'Regular: Continue standard monitoring procedures',
        'Medium-term: Track shelf life patterns for optimization',
        'Long-term: Analyze demand cycles for better procurement'
      ];
      costImpact = (value * 0.10).toFixed(2);
    }

    return {
      recommendations,
      priority_actions: priorityActions,
      cost_impact: costImpact
    };
  }

  /**
   * Fallback insights for dashboard (rule-based)
   */
  getFallbackDashboardInsights(stats) {
    console.log('Using fallback dashboard insights');
    
    const urgentRecommendations = [];
    
    if (stats.totalAlerts > 5) {
      urgentRecommendations.push({
        priority: 'HIGH',
        type: 'SPOILAGE',
        title: 'Multiple Active Alerts Require Attention',
        description: `You have ${stats.totalAlerts} active alerts. High-risk products need immediate action.`,
        estimatedImpact: {
          financial: `₱${(stats.totalAlerts * 5000).toLocaleString()}`,
          timeframe: 'Within 48 hours'
        },
        actionRequired: 'Review all HIGH priority alerts and schedule immediate deliveries'
      });
    }

    if (stats.ecoScore < 70) {
      urgentRecommendations.push({
        priority: 'MEDIUM',
        type: 'ENERGY',
        title: 'Eco Score Below Target',
        description: `Current eco score is ${stats.ecoScore}/100. Improving efficiency reduces costs.`,
        estimatedImpact: {
          financial: '₱8,500 monthly savings',
          timeframe: 'This week'
        },
        actionRequired: 'Review energy usage and optimize delivery routes'
      });
    }

    if (stats.totalDeliveries > 0) {
      urgentRecommendations.push({
        priority: 'LOW',
        type: 'ROUTE',
        title: 'Route Optimization Opportunity',
        description: `With ${stats.totalDeliveries} active deliveries, consolidation could improve efficiency.`,
        estimatedImpact: {
          financial: '₱5,200 fuel savings',
          timeframe: 'Next delivery cycle'
        },
        actionRequired: 'Use AI route optimization for upcoming deliveries'
      });
    }

    return {
      urgentRecommendations,
      todayOverview: {
        keyMetrics: [
          `Managing ${stats.totalProducts} products across inventory`,
          `${stats.totalDeliveries} deliveries in progress`,
          `Eco score at ${stats.ecoScore}/100`
        ],
        opportunities: [
          'Consolidate deliveries to reduce fuel costs',
          'Monitor high-risk alerts for early intervention'
        ],
        warnings: stats.totalAlerts > 3 ? [
          `${stats.totalAlerts} active alerts require monitoring`
        ] : []
      }
    };
  }

  /**
   * Fallback route optimization (rule-based) - KEEP THIS AS BACKUP
   */
  getFallbackRouteOptimization(delivery) {
    console.log('Using fallback route optimization');
    
    // Simple 15-20% improvement estimate
    const improvementFactor = 0.15 + (Math.random() * 0.05); // 15-20% random improvement
    
    // Ensure we have valid numbers to work with
    const totalDistance = parseFloat(delivery.totalDistance) || 50;
    const estimatedDuration = parseInt(delivery.estimatedDuration) || 120;
    const fuelConsumption = parseFloat(delivery.fuelConsumption) || 10;
    const carbonEmissions = parseFloat(delivery.carbonEmissions) || 25;
    
    const optimizedDistance = parseFloat((totalDistance * (1 - improvementFactor)).toFixed(2));
    const optimizedDuration = Math.round(estimatedDuration * (1 - improvementFactor));
    const optimizedFuel = parseFloat((fuelConsumption * (1 - improvementFactor * 0.9)).toFixed(2));
    const optimizedEmissions = parseFloat((carbonEmissions * (1 - improvementFactor * 0.85)).toFixed(2));
    
    return {
      optimizedDistance,
      optimizedDuration,
      optimizedFuel,
      optimizedEmissions,
      savings: {
        distance: (totalDistance * improvementFactor).toFixed(1),
        time: Math.round(estimatedDuration * improvementFactor).toString(),
        fuel: (fuelConsumption * improvementFactor * 0.9).toFixed(1),
        emissions: (carbonEmissions * improvementFactor * 0.85).toFixed(1),
        cost: ((fuelConsumption * improvementFactor * 0.9) * 55.50).toFixed(2)
      },
      aiRecommendations: [
        'Reorder stops to minimize backtracking and total distance',
        'Avoid peak traffic hours (8-10 AM) to reduce fuel consumption',
        'Use alternative routes via less congested roads',
        'Consolidate nearby deliveries for better efficiency'
      ]
    };
  }
}

module.exports = new AIService();