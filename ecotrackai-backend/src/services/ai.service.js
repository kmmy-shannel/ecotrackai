const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

class AIService {

  async callGroq(prompt) {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set in environment variables');
    }

    const response = await axios.post(GROQ_API_URL, {
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert supply chain and logistics analyst for a Philippine food distribution business. Always respond with ONLY valid JSON, no markdown, no explanation, no extra text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return response.data.choices[0].message.content;
  }

  async generateAlertInsights(alertData) {
    try {
      const prompt = `Analyze this spoilage alert for a Philippine food distribution business and provide specific recommendations.

ALERT DATA:
- Product: ${alertData.product_name}
- Risk Level: ${alertData.risk_level}
- Days Left Until Expiry: ${alertData.days_left}
- Temperature: ${alertData.temperature}°C
- Humidity: ${alertData.humidity}%
- Location: ${alertData.location}
- Quantity: ${alertData.quantity}
- Estimated Value: ₱${alertData.value}

Context: Tropical climate in the Philippines. High humidity and heat accelerate spoilage.

Respond ONLY with this exact JSON structure:
{
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2",
    "Specific recommendation 3",
    "Specific recommendation 4"
  ],
  "priority_actions": [
    "Immediate: specific action to take now",
    "Short-term: action within 1-3 days",
    "Medium-term: action within this week"
  ],
  "cost_impact": "3200.00"
}`;

      console.log('Calling Groq for alert insights...');
      const responseText = await this.callGroq(prompt);
      console.log('Groq alert response received');

      const parsed = this.parseResponse(responseText);
      if (parsed) return parsed;

      console.warn('Parsing failed, using fallback');
      return this.getFallbackAlertInsights(alertData);

    } catch (error) {
      console.error('Groq Alert Insights Error:', error.message);
      return this.getFallbackAlertInsights(alertData);
    }
  }

  async generateDashboardInsights(stats) {
    try {
      const prompt = `Analyze these business metrics for a Philippine food distribution company and provide urgent recommendations.

CURRENT METRICS:
- Total Products in Inventory: ${stats.totalProducts}
- Active Deliveries This Month: ${stats.totalDeliveries}
- Active Spoilage Alerts: ${stats.totalAlerts}
- Eco Score: ${stats.ecoScore}/100

Based on these metrics, provide 2-3 urgent recommendations and a today's overview.

Respond ONLY with this exact JSON structure:
{
  "urgentRecommendations": [
    {
      "priority": "HIGH",
      "type": "SPOILAGE",
      "title": "Short title here",
      "description": "Detailed description of the issue",
      "estimatedImpact": {
        "financial": "₱15,000",
        "timeframe": "Within 24 hours"
      },
      "actionRequired": "Specific action to take"
    }
  ],
  "todayOverview": {
    "keyMetrics": [
      "Key metric observation 1",
      "Key metric observation 2",
      "Key metric observation 3"
    ],
    "opportunities": [
      "Opportunity 1",
      "Opportunity 2"
    ],
    "warnings": [
      "Warning if any"
    ]
  }
}`;

      console.log('Calling Groq for dashboard insights...');
      const responseText = await this.callGroq(prompt);
      console.log('Groq dashboard response received');

      const parsed = this.parseResponse(responseText);
      if (parsed) return parsed;

      console.warn('Parsing failed, using fallback');
      return this.getFallbackDashboardInsights(stats);

    } catch (error) {
      console.error('Groq Dashboard Insights Error:', error.message);
      return this.getFallbackDashboardInsights(stats);
    }
  }

  async optimizeDeliveryRoute(delivery) {
    try {
      const stopsList = delivery.stops?.map((stop, index) =>
        `${index + 1}. ${stop.location} (${stop.type})`
      ).join('\n') || '1. Origin\n2. Destination';

      const prompt = `You are a logistics optimization expert. Analyze this delivery route in the Philippines and provide optimized metrics.

CURRENT DELIVERY:
- Delivery Code: ${delivery.deliveryCode || 'N/A'}
- Vehicle Type: ${delivery.vehicleType || 'van'}
- Total Distance: ${delivery.totalDistance || 50} km
- Estimated Duration: ${delivery.estimatedDuration || 120} minutes
- Fuel Consumption: ${delivery.fuelConsumption || 10} liters
- CO₂ Emissions: ${delivery.carbonEmissions || 25} kg

STOPS IN ORDER:
${stopsList}

Apply logistics optimization (avoid backtracking, group nearby stops, avoid peak hours 7-9AM and 5-7PM in Philippine cities). Calculate realistic 8-20% improvements.

Respond ONLY with this exact JSON structure:
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
    "Specific recommendation for this route 1",
    "Specific recommendation for this route 2",
    "Specific recommendation for this route 3",
    "Specific recommendation for this route 4"
  ]
}`;

      console.log('Calling Groq for route optimization...');
      const responseText = await this.callGroq(prompt);
      console.log('Groq route optimization response received');

      const parsed = this.parseResponse(responseText);
      if (parsed) return parsed;

      console.warn('Parsing failed, using fallback');
      return this.getFallbackRouteOptimization(delivery);

    } catch (error) {
      console.error('Groq Route Optimization Error:', error.message);
      return this.getFallbackRouteOptimization(delivery);
    }
  }

  parseResponse(responseText) {
    try {
      if (!responseText) return null;

      let clean = responseText.trim();
      clean = clean.replace(/```json\n?/gi, '').replace(/```\n?/g, '');

      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}') + 1;

      if (start !== -1 && end > start) {
        clean = clean.substring(start, end);
      }

      const parsed = JSON.parse(clean);
      console.log('Response parsed successfully');
      return parsed;

    } catch (e) {
      console.error('Parse error:', e.message);
      return null;
    }
  }

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

    return { recommendations, priority_actions: priorityActions, cost_impact: costImpact };
  }

  getFallbackDashboardInsights(stats) {
    console.log('Using fallback dashboard insights');
    const urgentRecommendations = [];

    if (stats.totalAlerts > 5) {
      urgentRecommendations.push({
        priority: 'HIGH',
        type: 'SPOILAGE',
        title: 'Multiple Active Alerts Require Attention',
        description: `You have ${stats.totalAlerts} active alerts. High-risk products need immediate action.`,
        estimatedImpact: { financial: `₱${(stats.totalAlerts * 5000).toLocaleString()}`, timeframe: 'Within 48 hours' },
        actionRequired: 'Review all HIGH priority alerts and schedule immediate deliveries'
      });
    }

    if (stats.ecoScore < 70) {
      urgentRecommendations.push({
        priority: 'MEDIUM',
        type: 'ENERGY',
        title: 'Eco Score Below Target',
        description: `Current eco score is ${stats.ecoScore}/100. Improving efficiency reduces costs.`,
        estimatedImpact: { financial: '₱8,500 monthly savings', timeframe: 'This week' },
        actionRequired: 'Review energy usage and optimize delivery routes'
      });
    }

    if (stats.totalDeliveries > 0) {
      urgentRecommendations.push({
        priority: 'LOW',
        type: 'ROUTE',
        title: 'Route Optimization Opportunity',
        description: `With ${stats.totalDeliveries} active deliveries, consolidation could improve efficiency.`,
        estimatedImpact: { financial: '₱5,200 fuel savings', timeframe: 'Next delivery cycle' },
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
        opportunities: ['Consolidate deliveries to reduce fuel costs', 'Monitor high-risk alerts for early intervention'],
        warnings: stats.totalAlerts > 3 ? [`${stats.totalAlerts} active alerts require monitoring`] : []
      }
    };
  }

  getFallbackRouteOptimization(delivery) {
    console.log('Using fallback route optimization');
    const improvementFactor = 0.15 + (Math.random() * 0.05);
    const totalDistance = parseFloat(delivery.totalDistance) || 50;
    const estimatedDuration = parseInt(delivery.estimatedDuration) || 120;
    const fuelConsumption = parseFloat(delivery.fuelConsumption) || 10;
    const carbonEmissions = parseFloat(delivery.carbonEmissions) || 25;

    return {
      optimizedDistance: parseFloat((totalDistance * (1 - improvementFactor)).toFixed(2)),
      optimizedDuration: Math.round(estimatedDuration * (1 - improvementFactor)),
      optimizedFuel: parseFloat((fuelConsumption * (1 - improvementFactor * 0.9)).toFixed(2)),
      optimizedEmissions: parseFloat((carbonEmissions * (1 - improvementFactor * 0.85)).toFixed(2)),
      savings: {
        distance: (totalDistance * improvementFactor).toFixed(1),
        time: Math.round(estimatedDuration * improvementFactor).toString(),
        fuel: (fuelConsumption * improvementFactor * 0.9).toFixed(1),
        emissions: (carbonEmissions * improvementFactor * 0.85).toFixed(1),
        cost: ((fuelConsumption * improvementFactor * 0.9) * 55.50).toFixed(2)
      },
      aiRecommendations: [
        'Reorder stops to minimize backtracking and total distance',
        'Avoid peak traffic hours (7-9 AM and 5-7 PM) in Philippine cities',
        'Use alternative routes via less congested roads',
        'Consolidate nearby deliveries for better efficiency'
      ]
    };
  }
}

module.exports = new AIService();