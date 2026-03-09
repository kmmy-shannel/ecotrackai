const axios = require('axios');

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 10000;

const PROMPT_VERSIONS = {
  ALERT_INSIGHTS: 'alert-insights-v1',
  DASHBOARD_INSIGHTS: 'dashboard-insights-v1',
  ROUTE_OPTIMIZATION: 'route-optimization-v1'
};

class AIService {
  _sanitizeText(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/[<>`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _sanitizeObject(input) {
    if (Array.isArray(input)) {
      return input.map((item) => this._sanitizeObject(item));
    }
    if (input && typeof input === 'object') {
      const output = {};
      for (const [key, value] of Object.entries(input)) {
        output[key] = this._sanitizeObject(value);
      }
      return output;
    }
    if (typeof input === 'string') {
      return this._sanitizeText(input);
    }
    return input;
  }

  _safeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  _safeString(value, fallback = '') {
    const text = this._sanitizeText(value);
    return text || fallback;
  }

  _strictJsonParse(text) {
    if (typeof text !== 'string') return null;
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  _logMeta({ context, promptVersion, confidence, usedFallback }) {
    console.log('[AI_META]', {
      model: GROQ_MODEL,
      timestamp: new Date().toISOString(),
      prompt_version: promptVersion,
      confidence_score: confidence,
      context,
      used_fallback: usedFallback
    });
  }

  _buildSystemInstruction() {
    return [
      'You are an expert supply chain and logistics analyst for Philippine food distribution.',
      'Respond with STRICT JSON only.',
      'No markdown.',
      'No explanation.',
      'No extra keys outside the requested schema.'
    ].join(' ');
  }

  async _callGroq(prompt) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY; // ← read fresh every call
  
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set');
    }
  
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: this._buildSystemInstruction() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 900
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: REQUEST_TIMEOUT_MS
      }
    );
  
    return response?.data?.choices?.[0]?.message?.content || '';
  }

  _validateAlertInsightsSchema(payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (!Array.isArray(payload.recommendations)) return false;
    if (!Array.isArray(payload.priority_actions)) return false;
    if (!('cost_impact' in payload)) return false;
    return true;
  }

  _validateDashboardSchema(payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (!Array.isArray(payload.urgentRecommendations)) return false;
    if (!payload.todayOverview || typeof payload.todayOverview !== 'object') return false;
    if (!Array.isArray(payload.todayOverview.keyMetrics)) return false;
    if (!Array.isArray(payload.todayOverview.opportunities)) return false;
    if (!Array.isArray(payload.todayOverview.warnings)) return false;
    return true;
  }

  _validateRouteSchema(payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (!('optimizedDistance' in payload)) return false;
    if (!('optimizedDuration' in payload)) return false;
    if (!('optimizedFuel' in payload)) return false;
    if (!('optimizedEmissions' in payload)) return false;
    if (!payload.savings || typeof payload.savings !== 'object') return false;
    if (!Array.isArray(payload.aiRecommendations)) return false;
    return true;
  }

  _normalizeAlertInsights(payload) {
    return this._sanitizeObject({
      recommendations: Array.isArray(payload.recommendations)
        ? payload.recommendations.map((v) => this._safeString(v)).filter(Boolean).slice(0, 5)
        : [],
      priority_actions: Array.isArray(payload.priority_actions)
        ? payload.priority_actions.map((v) => this._safeString(v)).filter(Boolean).slice(0, 5)
        : [],
      cost_impact: this._safeString(payload.cost_impact, '0.00')
    });
  }

  _normalizeDashboard(payload) {
    const normalizedUrgent = Array.isArray(payload.urgentRecommendations)
      ? payload.urgentRecommendations.map((rec) => ({
          priority: this._safeString(rec?.priority, 'LOW').toUpperCase(),
          type: this._safeString(rec?.type, 'ROUTE').toUpperCase(),
          title: this._safeString(rec?.title, 'Recommendation'),
          description: this._safeString(rec?.description, ''),
          estimatedImpact: {
            financial: this._safeString(rec?.estimatedImpact?.financial, 'N/A'),
            timeframe: this._safeString(rec?.estimatedImpact?.timeframe, 'N/A')
          },
          actionRequired: this._safeString(rec?.actionRequired, '')
        }))
      : [];

    const normalized = {
      urgentRecommendations: normalizedUrgent,
      todayOverview: {
        keyMetrics: Array.isArray(payload?.todayOverview?.keyMetrics)
          ? payload.todayOverview.keyMetrics.map((v) => this._safeString(v)).filter(Boolean)
          : [],
        opportunities: Array.isArray(payload?.todayOverview?.opportunities)
          ? payload.todayOverview.opportunities.map((v) => this._safeString(v)).filter(Boolean)
          : [],
        warnings: Array.isArray(payload?.todayOverview?.warnings)
          ? payload.todayOverview.warnings.map((v) => this._safeString(v)).filter(Boolean)
          : []
      }
    };

    return this._sanitizeObject(normalized);
  }

  _normalizeRoute(payload) {
    const optimizedFuel = parseFloat(this._safeNumber(payload.optimizedFuel, 0).toFixed(2));
    const optimizedEmissions = parseFloat(this._safeNumber(payload.optimizedEmissions, 0).toFixed(2));

    const normalized = {
      optimizedDistance: parseFloat(this._safeNumber(payload.optimizedDistance, 0).toFixed(2)),
      optimizedDuration: Math.round(this._safeNumber(payload.optimizedDuration, 0)),
      optimizedFuel,
      optimizedEmissions,
      fuelEstimate: optimizedFuel,
      carbonEstimate: optimizedEmissions,
      savings: {
        distance: this._safeString(payload?.savings?.distance, '0.0'),
        time: this._safeString(payload?.savings?.time, '0'),
        fuel: this._safeString(payload?.savings?.fuel, '0.0'),
        emissions: this._safeString(payload?.savings?.emissions, '0.0'),
        cost: this._safeString(payload?.savings?.cost, '0.00')
      },
      aiRecommendations: Array.isArray(payload.aiRecommendations)
        ? payload.aiRecommendations.map((v) => this._safeString(v)).filter(Boolean).slice(0, 6)
        : []
    };

    return this._sanitizeObject(normalized);
  }

  _deterministicAlertFallback(alertData = {}) {
    const daysLeft = this._safeNumber(alertData.days_left, 0);
    const riskLevel = this._safeString(alertData.risk_level, 'LOW').toUpperCase();
    const value = this._safeNumber(alertData.value, 0);
    const temp = this._safeNumber(alertData.temperature, 0);
    const humidity = this._safeNumber(alertData.humidity, 0);

    if (riskLevel === 'HIGH') {
      return {
        recommendations: [
          `Prioritize immediate dispatch; ${daysLeft} day(s) left before expiry.`,
          'Apply limited-time discount to reduce spoilage exposure.',
          'Move high-risk stock to first stop in next delivery cycle.',
          `Verify storage controls at ${temp}C and ${humidity}% humidity.`
        ],
        priority_actions: [
          'Immediate: Dispatch within 24 hours.',
          'Short-term: Contact top buyers for quick volume uptake.',
          'Medium-term: Reduce storage dwell time for this SKU.'
        ],
        cost_impact: (value * 0.8).toFixed(2)
      };
    }

    if (riskLevel === 'MEDIUM') {
      return {
        recommendations: [
          `Schedule dispatch within 2-4 days; ${daysLeft} day(s) remaining.`,
          'Bundle with fast-moving inventory for turnover.',
          `Track storage consistency at ${temp}C and ${humidity}% humidity.`,
          'Prioritize in upcoming route plans.'
        ],
        priority_actions: [
          'Immediate: Queue for next outbound batch.',
          'Short-term: Recheck quality status daily.',
          'Medium-term: Tune reorder levels for this item.'
        ],
        cost_impact: (value * 0.5).toFixed(2)
      };
    }

    return {
      recommendations: [
        `Maintain regular handling; ${daysLeft} day(s) remaining.`,
        'Continue routine quality checks.',
        'Keep standard distribution sequence.',
        'Monitor trend changes in shelf-life usage.'
      ],
      priority_actions: [
        'Immediate: Continue standard monitoring.',
        'Short-term: Keep FIFO allocation.',
        'Medium-term: Review weekly spoilage metrics.'
      ],
      cost_impact: (value * 0.1).toFixed(2)
    };
  }

  _deterministicDashboardFallback(stats = {}) {
    const totalProducts = this._safeNumber(stats.totalProducts, 0);
    const totalDeliveries = this._safeNumber(stats.totalDeliveries, 0);
    const totalAlerts = this._safeNumber(stats.totalAlerts, 0);
    const ecoScore = this._safeNumber(stats.ecoScore, 0);

    const urgentRecommendations = [];

    if (totalAlerts >= 5) {
      urgentRecommendations.push({
        priority: 'HIGH',
        type: 'SPOILAGE',
        title: 'High active alert volume',
        description: `${totalAlerts} active alerts require prioritization.`,
        estimatedImpact: {
          financial: `PHP ${(totalAlerts * 5000).toLocaleString()}`,
          timeframe: 'Within 24-48 hours'
        },
        actionRequired: 'Prioritize HIGH and MEDIUM risk batches for dispatch.'
      });
    }

    if (ecoScore < 70) {
      urgentRecommendations.push({
        priority: 'MEDIUM',
        type: 'ENERGY',
        title: 'Eco score below target',
        description: `Current eco score is ${ecoScore}/100.`,
        estimatedImpact: {
          financial: 'PHP 8,500 monthly potential savings',
          timeframe: 'This week'
        },
        actionRequired: 'Apply optimized delivery routes consistently.'
      });
    }

    if (totalDeliveries > 0) {
      urgentRecommendations.push({
        priority: 'LOW',
        type: 'ROUTE',
        title: 'Route optimization available',
        description: `${totalDeliveries} active deliveries can be reviewed for optimization.`,
        estimatedImpact: {
          financial: 'PHP 5,200 fuel savings estimate',
          timeframe: 'Next delivery cycle'
        },
        actionRequired: 'Run route optimization before manager approval.'
      });
    }

    return {
      urgentRecommendations,
      todayOverview: {
        keyMetrics: [
          `${totalProducts} products in managed inventory.`,
          `${totalDeliveries} active deliveries in current cycle.`,
          `${totalAlerts} active alerts across all risk levels.`
        ],
        opportunities: [
          'Consolidate nearby stops to reduce fuel consumption.',
          'Move nearing-expiry stock into earlier dispatch windows.'
        ],
        warnings: totalAlerts > 3 ? [`${totalAlerts} alerts require close monitoring.`] : []
      }
    };
  }

  _deterministicRouteFallback(delivery = {}) {
    const totalDistance = this._safeNumber(delivery.totalDistance || delivery.total_distance, 50);
    const estimatedDuration = this._safeNumber(delivery.estimatedDuration || delivery.estimated_duration, 120);
    const fuelConsumption = this._safeNumber(delivery.fuelConsumption || delivery.fuel_consumption, 10);
    const carbonEmissions = this._safeNumber(delivery.carbonEmissions || delivery.carbon_emissions, 25);

    const stopsCount = Array.isArray(delivery.stops) ? delivery.stops.length : 2;
    const improvementFactor = Math.min(0.18, 0.12 + (Math.max(0, stopsCount - 2) * 0.01));

    const optimizedDistance = totalDistance * (1 - improvementFactor);
    const optimizedDuration = estimatedDuration * (1 - improvementFactor);
    const optimizedFuel = fuelConsumption * (1 - improvementFactor * 0.9);
    const optimizedEmissions = carbonEmissions * (1 - improvementFactor * 0.85);
    const fuelSaved = fuelConsumption - optimizedFuel;

    return {
      optimizedDistance: parseFloat(optimizedDistance.toFixed(2)),
      optimizedDuration: Math.round(optimizedDuration),
      optimizedFuel: parseFloat(optimizedFuel.toFixed(2)),
      optimizedEmissions: parseFloat(optimizedEmissions.toFixed(2)),
      savings: {
        distance: (totalDistance - optimizedDistance).toFixed(1),
        time: Math.round(estimatedDuration - optimizedDuration).toString(),
        fuel: fuelSaved.toFixed(1),
        emissions: (carbonEmissions - optimizedEmissions).toFixed(1),
        cost: (fuelSaved * 55.5).toFixed(2)
      },
      aiRecommendations: [
        'Reorder stops to minimize backtracking.',
        'Avoid known peak-hour congestion windows.',
        'Cluster nearby drop points before final dispatch.',
        'Review vehicle utilization for current load.'
      ]
    };
  }

  _buildAlertPrompt(alertData) {
    return `Analyze this spoilage alert for a Philippine food distribution business.

ALERT DATA:
- Product: ${this._safeString(alertData.product_name)}
- Risk Level: ${this._safeString(alertData.risk_level)}
- Days Left Until Expiry: ${this._safeNumber(alertData.days_left, 0)}
- Temperature: ${this._safeNumber(alertData.temperature, 0)}C
- Humidity: ${this._safeNumber(alertData.humidity, 0)}%
- Location: ${this._safeString(alertData.location)}
- Quantity: ${this._safeString(alertData.quantity)}
- Estimated Value: PHP ${this._safeNumber(alertData.value, 0)}

Return STRICT JSON with this exact structure:
{
  "recommendations": ["...", "...", "..."],
  "priority_actions": ["...", "...", "..."],
  "cost_impact": "0.00"
}`;
  }

  _buildDashboardPrompt(stats) {
    return `Analyze these business metrics for a Philippine food distribution company.

CURRENT METRICS:
- Total Products in Inventory: ${this._safeNumber(stats.totalProducts, 0)}
- Active Deliveries This Period: ${this._safeNumber(stats.totalDeliveries, 0)}
- Active Spoilage Alerts: ${this._safeNumber(stats.totalAlerts, 0)}
- Eco Score: ${this._safeNumber(stats.ecoScore, 0)}/100

Return STRICT JSON with this exact structure:
{
  "urgentRecommendations": [
    {
      "priority": "HIGH",
      "type": "SPOILAGE",
      "title": "...",
      "description": "...",
      "estimatedImpact": { "financial": "...", "timeframe": "..." },
      "actionRequired": "..."
    }
  ],
  "todayOverview": {
    "keyMetrics": ["...", "..."],
    "opportunities": ["...", "..."],
    "warnings": ["..."]
  }
}`;
  }

  _buildRoutePrompt(delivery) {
    const stopsList = Array.isArray(delivery.stops) && delivery.stops.length > 0
      ? delivery.stops.map((stop, index) => `${index + 1}. ${this._safeString(stop.location)} (${this._safeString(stop.type)})`).join('\n')
      : '1. Origin\n2. Destination';

    return `You are a route optimization analyst for urban Philippine logistics.

CURRENT DELIVERY:
- Delivery Code: ${this._safeString(delivery.deliveryCode || delivery.delivery_code || 'N/A')}
- Vehicle Type: ${this._safeString(delivery.vehicleType || delivery.vehicle_type || 'van')}
- Total Distance: ${this._safeNumber(delivery.totalDistance || delivery.total_distance, 50)} km
- Estimated Duration: ${this._safeNumber(delivery.estimatedDuration || delivery.estimated_duration, 120)} minutes
- Fuel Consumption: ${this._safeNumber(delivery.fuelConsumption || delivery.fuel_consumption, 10)} liters
- CO2 Emissions: ${this._safeNumber(delivery.carbonEmissions || delivery.carbon_emissions, 25)} kg

STOPS:
${stopsList}

Return STRICT JSON with this exact structure:
{
  "optimizedDistance": 0,
  "optimizedDuration": 0,
  "optimizedFuel": 0,
  "optimizedEmissions": 0,
  "savings": {
    "distance": "0",
    "time": "0",
    "fuel": "0",
    "emissions": "0",
    "cost": "0"
  },
  "aiRecommendations": ["...", "...", "..."]
}`;
  }

  async _generateAlertInsightsInternal(alertData) {
    const promptVersion = PROMPT_VERSIONS.ALERT_INSIGHTS;
    try {
      const prompt = this._buildAlertPrompt(alertData);
      const responseText = await this._callGroq(prompt);

      const parsed = this._strictJsonParse(responseText);
      if (!parsed || !this._validateAlertInsightsSchema(parsed)) {
        const fallback = this._deterministicAlertFallback(alertData);
        const normalized = this._normalizeAlertInsights(fallback);
        const meta = {
          model: GROQ_MODEL,
          promptVersion,
          confidence: 0.42,
          usedFallback: true,
          timestamp: new Date().toISOString()
        };
        this._logMeta({
          context: 'alert_insights',
          promptVersion,
          confidence: meta.confidence,
          usedFallback: true
        });
        return { data: normalized, meta };
      }

      const normalized = this._normalizeAlertInsights(parsed);
      const meta = {
        model: GROQ_MODEL,
        promptVersion,
        confidence: 0.9,
        usedFallback: false,
        timestamp: new Date().toISOString()
      };
      this._logMeta({
        context: 'alert_insights',
        promptVersion,
        confidence: meta.confidence,
        usedFallback: false
      });
      return { data: normalized, meta };
    } catch (error) {
      console.error('[AIService.generateAlertInsights]', error.message);
      const fallback = this._normalizeAlertInsights(this._deterministicAlertFallback(alertData));
      const meta = {
        model: GROQ_MODEL,
        promptVersion,
        confidence: 0.35,
        usedFallback: true,
        timestamp: new Date().toISOString()
      };
      this._logMeta({
        context: 'alert_insights',
        promptVersion,
        confidence: meta.confidence,
        usedFallback: true
      });
      return { data: fallback, meta };
    }
  }

  async generateAlertInsights(alertData) {
    const result = await this._generateAlertInsightsInternal(alertData);
    return result.data;
  }

  async generateSpoilageRecommendation(alertData) {
    const result = await this._generateAlertInsightsInternal(alertData);
    const recommendation = this._safeString(
      result?.data?.priority_actions?.[0] || result?.data?.recommendations?.[0],
      'Monitor batch closely and prioritize timely redistribution.'
    );

    return this._sanitizeObject({
      recommendation,
      insights: result.data,
      meta: result.meta
    });
  }

  async generateDashboardInsights(stats) {
    const promptVersion = PROMPT_VERSIONS.DASHBOARD_INSIGHTS;
    try {
      const prompt = this._buildDashboardPrompt(stats);
      const responseText = await this._callGroq(prompt);

      const parsed = this._strictJsonParse(responseText);
      if (!parsed || !this._validateDashboardSchema(parsed)) {
        const fallback = this._deterministicDashboardFallback(stats);
        const normalized = this._normalizeDashboard(fallback);
        this._logMeta({
          context: 'dashboard_insights',
          promptVersion,
          confidence: 0.43,
          usedFallback: true
        });
        return normalized;
      }

      const normalized = this._normalizeDashboard(parsed);
      this._logMeta({
        context: 'dashboard_insights',
        promptVersion,
        confidence: 0.9,
        usedFallback: false
      });
      return normalized;
    } catch (error) {
      console.error('[AIService.generateDashboardInsights]', error.message);
      const fallback = this._normalizeDashboard(this._deterministicDashboardFallback(stats));
      this._logMeta({
        context: 'dashboard_insights',
        promptVersion,
        confidence: 0.35,
        usedFallback: true
      });
      return fallback;
    }
  }

  async optimizeDeliveryRoute(delivery) {
    const promptVersion = PROMPT_VERSIONS.ROUTE_OPTIMIZATION;
    try {
      const prompt = this._buildRoutePrompt(delivery);
      const responseText = await this._callGroq(prompt);

      const parsed = this._strictJsonParse(responseText);
      if (!parsed || !this._validateRouteSchema(parsed)) {
        const fallback = this._deterministicRouteFallback(delivery);
        const normalized = this._normalizeRoute(fallback);
        const confidence = 0.44;
        this._logMeta({
          context: 'route_optimization',
          promptVersion,
          confidence,
          usedFallback: true
        });
        return this._sanitizeObject({
          ...normalized,
          modelName: GROQ_MODEL,
          promptVersion,
          confidenceScore: confidence,
          usedFallback: true
        });
      }

      const normalized = this._normalizeRoute(parsed);
      const confidence = 0.9;
      this._logMeta({
        context: 'route_optimization',
        promptVersion,
        confidence,
        usedFallback: false
      });
      return this._sanitizeObject({
        ...normalized,
        modelName: GROQ_MODEL,
        promptVersion,
        confidenceScore: confidence,
        usedFallback: false
      });
    } catch (error) {
      console.error('[AIService.optimizeDeliveryRoute]', error.message);
      const fallback = this._normalizeRoute(this._deterministicRouteFallback(delivery));
      const confidence = 0.35;
      this._logMeta({
        context: 'route_optimization',
        promptVersion,
        confidence,
        usedFallback: true
      });
      return this._sanitizeObject({
        ...fallback,
        modelName: GROQ_MODEL,
        promptVersion,
        confidenceScore: confidence,
        usedFallback: true
      });
    }
  }
}

module.exports = new AIService();
