import { useEffect, useState } from 'react';
import carbonService from '../services/carbon.service';

const emptyData = {
  thisMonth: {
    totalEmissions: 0,
    deliveryTrips: 0,
    distanceTraveled: 0,
    litersOfFuelUsed: 0,
    month: '',
  },
  comparison: {
    previousMonth: 0,
    change: 0,
    trend: 'decreased',
  },
};

const useCarbon = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHowCalculated, setShowHowCalculated] = useState(false);
  const [showMonthlyComparison, setShowMonthlyComparison] = useState(false);
  const [carbonData, setCarbonData] = useState({
    thisMonth: {
      month: '',
      totalEmissions: 0,
      deliveryTrips: 0,
      distanceTraveled: 0,
      litersOfFuelUsed: 0,
    },
    comparison: {
      trend: 'none',
      percentage: 0,
    }
  });

  const loadCarbonData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await carbonService.getCarbonFootprint();
      if (response?.success && response?.data) {
        setCarbonData(response.data);
      } else {
        setCarbonData(emptyData);
      }
    } catch (_err) {
      setError('Failed to load carbon footprint data');
      setCarbonData({
        ...emptyData,
        thisMonth: {
          ...emptyData.thisMonth,
          month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCarbonData();
  }, []);

  const decreaseAmount = Math.abs(carbonData?.comparison?.change || 0).toFixed(1);

  return {
    loading,
    error,
    carbonData,
    showHowCalculated,
    showMonthlyComparison,
    decreaseAmount,
    loadCarbonData,
    setShowHowCalculated,
    setShowMonthlyComparison,
  };
};

export default useCarbon;
