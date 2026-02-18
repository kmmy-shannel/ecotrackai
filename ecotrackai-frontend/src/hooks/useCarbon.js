import { useState, useEffect } from 'react';
import carbonService from '../services/carbon.service';

const useCarbon = () => {
  // ── State ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHowCalculated, setShowHowCalculated] = useState(false);
  const [showMonthlyComparison, setShowMonthlyComparison] = useState(false);
  const [carbonData, setCarbonData] = useState({
    thisMonth: {
      totalEmissions: 0,
      deliveryTrips: 0,
      distanceTraveled: 0,
      litersOfFuelUsed: 0,
      month: ''
    },
    comparison: {
      previousMonth: 0,
      change: 0,
      trend: 'decreased'
    }
  });

  // ── Business Logic ─────────────────────────────────────────

  // Load carbon footprint data from API
  const loadCarbonData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await carbonService.getCarbonFootprint();
      
      if (response.success) {
        setCarbonData(response.data);
      }
    } catch (err) {
      console.error('❌ Failed to load carbon data:', err);
      setError('Failed to load carbon footprint data');
      
      // Fallback to empty data
      setCarbonData({
        thisMonth: {
          totalEmissions: 0,
          deliveryTrips: 0,
          distanceTraveled: 0,
          litersOfFuelUsed: 0,
          month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
        },
        comparison: {
          previousMonth: 0,
          change: 0,
          trend: 'decreased'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Computed Values ────────────────────────────────────────

  const decreaseAmount = Math.abs(carbonData.comparison.change).toFixed(1);

  // ── Effects ────────────────────────────────────────────────

  // Auto-load carbon data on mount
  useEffect(() => {
    loadCarbonData();
  }, []);

  // ── Public API ─────────────────────────────────────────────
  return {
    // State
    loading,
    error,
    carbonData,
    showHowCalculated,
    showMonthlyComparison,
    decreaseAmount,

    // Actions
    loadCarbonData,
    setShowHowCalculated,
    setShowMonthlyComparison
  };
};

export default useCarbon;