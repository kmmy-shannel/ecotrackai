const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const axios = require('axios');

const OLLAMA_API_URL = 'http://localhost:11434/api/generate';

// AI Spoilage Analysis
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

module.exports = router;