import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import authService from '../../services/auth.service';
import useCarbon from '../../hooks/useCarbon';
import HowCalculatedModal from '../../components/HowCalculatedModal';
import MonthlyComparisonModal from '../../components/MonthlyComparisonModal';
import { 
  Leaf, TrendingDown, TrendingUp,
  Truck, Package, MapPin, ChevronRight, RefreshCw
} from 'lucide-react';

const CarbonFootprintPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // — all state and logic 
  const {
    loading,
    error,
    carbonData,
    showHowCalculated,
    showMonthlyComparison,
    decreaseAmount,
    loadCarbonData,
    setShowHowCalculated,
    setShowMonthlyComparison
  } = useCarbon();

  // Auth check on mount
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  if (!user) return null;

  const { thisMonth, comparison } = carbonData;

  return (
    <Layout currentPage="Carbon Footprint" user={user}>

      {/* Modals */}
      {showHowCalculated && (
        <HowCalculatedModal
          onClose={() => setShowHowCalculated(false)}
          currentData={thisMonth}
        />
      )}
      {showMonthlyComparison && (
        <MonthlyComparisonModal
          onClose={() => setShowMonthlyComparison(false)}
          currentData={{ ...thisMonth, comparison }}
        />
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadCarbonData}>
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {/* Loading Message */}
      {loading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          <span>Loading carbon footprint data...</span>
        </div>
      )}

      {/* Main Card */}
      <div className="grid grid-cols-1 gap-6">
        <div className="w-full">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-200">
              <h2 className="text-center font-bold text-gray-800 text-lg">
                {thisMonth.month || 'This Month'}
              </h2>
            </div>

            {/* Total Emissions */}
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 px-8 py-12">
              <div className="text-center">
                <p className="text-7xl font-bold text-gray-800 mb-3">
                  {thisMonth.totalEmissions.toFixed(1)}
                  <span className="text-4xl ml-2">kg CO₂</span>
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  {comparison.trend === 'decreased' ? (
                    <>
                      <TrendingDown size={20} className="text-green-600" />
                      <p className="text-base text-green-700 font-semibold">
                        Decreased {decreaseAmount}% from Last Month
                      </p>
                    </>
                  ) : comparison.trend === 'increased' ? (
                    <>
                      <TrendingUp size={20} className="text-red-600" />
                      <p className="text-base text-red-700 font-semibold">
                        Increased {decreaseAmount}% from Last Month
                      </p>
                    </>
                  ) : (
                    <p className="text-base text-gray-700 font-semibold">No change from Last Month</p>
                  )}
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="px-6 py-6 bg-white">
              <h3 className="text-center font-bold text-gray-800 mb-6 text-lg">Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                <EcoStatCard 
                  title="Delivery Trips" 
                  value={thisMonth.deliveryTrips} 
                  subtitle="This month" 
                  icon={<Truck size={20} />} 
                />
                <EcoStatCard 
                  title="KM Traveled" 
                  value={thisMonth.distanceTraveled.toFixed(1)} 
                  subtitle="Total distance" 
                  icon={<MapPin size={20} />} 
                />
                <EcoStatCard 
                  title="Liters of Fuel Used" 
                  value={thisMonth.litersOfFuelUsed.toFixed(1)} 
                  subtitle="Total consumption" 
                  icon={<Package size={20} />} 
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => navigate('/deliveries')}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-lg transition-colors shadow-sm font-medium"
                >
                  View all deliveries
                </button>
                <button
                  onClick={() => setShowHowCalculated(true)}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-lg transition-colors shadow-sm font-medium"
                >
                  How it's calculated
                </button>
                <button
                  onClick={() => setShowMonthlyComparison(true)}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-lg transition-colors shadow-sm font-medium"
                >
                  Monthly comparison
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-6">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Leaf size={22} className="text-green-600" />
            <h3 className="text-lg font-bold text-gray-800">Tips to Reduce Carbon Footprint</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TipCard 
              tip="Optimize delivery routes to reduce fuel consumption" 
              impact="Can save up to 15% CO₂ emissions" 
            />
            <TipCard 
              tip="Consolidate deliveries to minimize trips" 
              impact="Reduces emissions by 20-30%"
            />
            <TipCard 
              tip="Switch to eco-friendly vehicles when possible" 
              impact="Can cut emissions by up to 50%" 
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

// EcoStatCard Component
const EcoStatCard = ({ title, value, subtitle, icon }) => (
  <div className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
    <div className="bg-[#1a4d2e] px-5 pt-4 pb-3 rounded-t-2xl flex items-center justify-between">
      <h4 className="text-white text-xs font-medium uppercase tracking-wide">{title}</h4>
      {icon && <div className="text-white opacity-80">{icon}</div>}
    </div>
    <div className="bg-white px-5 py-5 flex-1 flex flex-col justify-between rounded-b-2xl">
      <p className="text-gray-800 text-4xl font-bold mb-2">{value}</p>
      <p className="text-green-600 text-xs flex items-center gap-1 font-medium">
        {subtitle}
        <ChevronRight size={14} className="text-green-600 opacity-70" />
      </p>
    </div>
  </div>
);

// TipCard Component
const TipCard = ({ tip, impact }) => (
  <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl hover:shadow-md transition-all">
    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
    <div className="flex-1">
      <p className="text-sm font-semibold text-gray-800 mb-1">{tip}</p>
      <p className="text-xs text-green-700 font-medium">{impact}</p>
    </div>
  </div>
);

export default CarbonFootprintPage;