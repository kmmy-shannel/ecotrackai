const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { sendSuccess, sendError } = require('../utils/response.utils');
const aiService = require('../services/ai.service');
const axios = require('axios');

const OLLAMA_API_URL = 'http://localhost:11434/api/generate';

/**
 * Get dashboard insights from AI
 * POST /api/ai/dashboard-insights
 */
router.post('/dashboard-insights', authenticate, async (req, res) => {
  try {
    console.log('📊 Dashboard insights request received');
    const { stats } = req.body;

    if (!stats) {
      return sendError(res, 400, 'Stats data is required');
    }

    // Generate AI insights using the AI service
    const insights = await aiService.generateDashboardInsights(stats);

    sendSuccess(res, 200, 'Dashboard insights generated successfully', insights);

  } catch (error) {
    console.error('❌ Dashboard insights error:', error);
    sendError(res, 500, 'Failed to generate dashboard insights', error.message);
  }
});

/**
 * AI Spoilage Analysis
 * POST /api/ai/analyze-spoilage
 */
router.post('/analyze-spoilage', authenticate, async (req, res) => {
  try {
    const { product, storageData } = req.body;
    
    console.log('🤖 Analyzing spoilage risk for:', product.product_name);
    
    const prompt = `You are a food safety and spoilage prediction expert. Analyze this product and provide risk assessment.

PRODUCT INFORMATION:
- Name: ${product.product_name}
- Type: ${product.product_type}
- Storage Category: ${product.storage_category}
- Shelf Life: ${product.shelf_life_days} days
- Current Quantity: ${product.total_quantity} ${product.unit_of_measure}

STORAGE CONDITIONS:
- Days in Storage: ${storageData.daysInStorage} days
- Temperature: ${storageData.temperature}°C
- Humidity: ${storageData.humidity}%

ANALYSIS TASK:
1. Calculate spoilage risk percentage (0-100%)
2. Identify specific risk factors
3. Provide actionable recommendations
4. Estimate remaining shelf life in days

Return ONLY valid JSON (no markdown):
{
  "riskLevel": "low|medium|high",
  "riskPercentage": 45,
  "remainingShelfLife": 12,
  "riskFactors": [
    "Temperature slightly above optimal",
    "Product approaching shelf life limit"
  ],
  "recommendations": [
    "Move to colder storage immediately",
    "Priority sale - discount if needed",
    "Monitor daily for signs of spoilage"
  ],
  "summary": "Brief 1-2 sentence summary of the analysis"
}`;

    const aiResponse = await axios.post(OLLAMA_API_URL, {
      model: 'deepseek-r1:1.5b',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        num_predict: 800
      }
    });

    // Parse AI response
    let analysis;
    try {
      let responseText = aiResponse.data.response.trim();
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      if (responseText.includes('<think>')) {
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}') + 1;
        responseText = responseText.substring(jsonStart, jsonEnd);
      }
      
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse.data.response);
      
      // Fallback analysis
      const daysRemaining = product.shelf_life_days - storageData.daysInStorage;
      const riskPercentage = Math.min(100, Math.round((storageData.daysInStorage / product.shelf_life_days) * 100));
      
      analysis = {
        riskLevel: riskPercentage < 30 ? 'low' : riskPercentage < 70 ? 'medium' : 'high',
        riskPercentage: riskPercentage,
        remainingShelfLife: Math.max(0, daysRemaining),
        riskFactors: [
          `${storageData.daysInStorage} days in storage`,
          `${daysRemaining} days remaining until expiry`
        ],
        recommendations: [
          daysRemaining < 3 ? 'Urgent: Sell or use immediately' : 'Monitor regularly',
          'Maintain optimal storage conditions',
          'Check for visible signs of spoilage'
        ],
        summary: `Product has ${daysRemaining} days remaining. Risk level: ${riskPercentage < 30 ? 'low' : riskPercentage < 70 ? 'medium' : 'high'}.`
      };
    }

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('AI spoilage analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze spoilage risk',
      error: error.message
    });
  }
});

/**
 * Get route optimization suggestions
 * POST /api/ai/route-optimization
 */
router.post('/route-optimization', authenticate, async (req, res) => {
  try {
    console.log('🚚 Route optimization request received');
    const { routeData } = req.body;

    if (!routeData) {
      return sendError(res, 400, 'Route data is required');
    }

    // TODO: Implement route optimization AI
    // For now, return a fallback
    sendSuccess(res, 200, 'Route optimization generated successfully', {
      optimizedRoute: [],
      savings: {
        distance: '15km',
        fuel: '₱500',
        time: '30 minutes'
      },
      recommendations: [
        'Consolidate deliveries to northern region',
        'Avoid peak traffic hours (8-10 AM)',
        'Use alternative route via Highway 5'
      ]
    });

  } catch (error) {
    console.error('❌ Route optimization error:', error);
    sendError(res, 500, 'Failed to generate route optimization', error.message);
  }
});

module.exports = router;