import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import authService from '../services/auth.service';
import alertService from '../services/alert.service';
import { Search, Sparkles, Trash2, X, TrendingDown, Package, Clock } from 'lucide-react';

const AlertsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [stats, setStats] = useState({
    total: 0,
    high_risk: 0,
    medium_risk: 0,
    low_risk: 0
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [aiInsights, setAIInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    setUser(currentUser);
    loadAlerts();
    loadStats();
  }, [navigate]);

  useEffect(() => {
    filterAlerts();
  }, [alerts, searchTerm, selectedFilter]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await alertService.getAllAlerts();
      setAlerts(response.data.alerts || []);
      setError('');
    } catch (err) {
      console.error('Load alerts error:', err);
      setError(err.response?.data?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await alertService.getAlertStats();
      setStats(response.data);
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };

  const filterAlerts = () => {
    let filtered = alerts;

    if (selectedFilter !== 'All') {
      filtered = filtered.filter(alert => {
        if (selectedFilter === 'High') return alert.risk_level === 'HIGH';
        if (selectedFilter === 'Medium') return alert.risk_level === 'MEDIUM';
        if (selectedFilter === 'Low') return alert.risk_level === 'LOW';
        return true;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(alert =>
        alert.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAlerts(filtered);
  };

  const handleDeleteAlert = async (id) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      await alertService.deleteAlert(id);
      setSuccess('Alert deleted successfully');
      loadAlerts();
      loadStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete alert error:', err);
      setError('Failed to delete alert');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleGetAIInsights = async (alert) => {
    setSelectedAlert(alert);
    setShowAIModal(true);
    setLoadingInsights(true);

    try {
      const response = await alertService.getAIInsights(alert.id);
      setAIInsights(response.data);
    } catch (err) {
      console.error('Get AI insights error:', err);
      setAIInsights({
        recommendations: [
          'Unable to generate insights at this time',
          'Please try again later'
        ],
        priority_actions: [],
        cost_impact: 'Unknown'
      });
    } finally {
      setLoadingInsights(false);
    }
  };

  const getRiskBadgeColor = (riskLevel) => {
    const colors = {
      HIGH: 'bg-red-100 text-red-600 border-red-200',
      MEDIUM: 'bg-orange-100 text-orange-600 border-orange-200',
      LOW: 'bg-green-100 text-green-600 border-green-200'
    };
    return colors[riskLevel] || colors.LOW;
  };

  const getRiskBadgeText = (riskLevel) => {
    const text = {
      HIGH: 'High',
      MEDIUM: 'Medium',
      LOW: 'Low'
    };
    return text[riskLevel] || 'Low';
  };

  const getProductImage = (productName) => {
    return '🥔';
  };

  if (!user) return null;

  return (
    <Layout currentPage="Spoilage Alerts" user={user}>
      <div className="max-w-7xl mx-auto">
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {/* AI Suggests Box */}
        <div className="bg-gray-100 rounded-2xl p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-3">AI Suggests</h3>
          <div className="bg-white rounded-xl p-6 text-center min-h-[100px] flex items-center justify-center">
            {stats.high_risk > 0 ? (
              <div className="text-left w-full">
                <p className="text-red-600 font-semibold mb-2">⚠️ Urgent Action Required</p>
                <p className="text-gray-700 text-sm">
                  You have {stats.high_risk} high-risk product{stats.high_risk > 1 ? 's' : ''} requiring immediate attention.
                  Click "Get AI insights" to view recommendations.
                </p>
              </div>
            ) : (
              <p className="text-gray-400">No urgent recommendations</p>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <FilterPill
            label="All"
            active={selectedFilter === 'All'}
            onClick={() => setSelectedFilter('All')}
          />
          <FilterPill
            label={`High (${stats.high_risk || 0})`}
            active={selectedFilter === 'High'}
            onClick={() => setSelectedFilter('High')}
          />
          <FilterPill
            label={`Medium (${stats.medium_risk || 0})`}
            active={selectedFilter === 'Medium'}
            onClick={() => setSelectedFilter('Medium')}
          />
          <FilterPill
            label={`Low (${stats.low_risk || 0})`}
            active={selectedFilter === 'Low'}
            onClick={() => setSelectedFilter('Low')}
          />
        </div>

        {/* Table Header - Green */}
        <div className="bg-green-100 rounded-t-2xl px-4 py-3 grid grid-cols-6 gap-4 font-semibold text-gray-700 text-sm border border-green-200">
          <div>Product</div>
          <div className="text-center">Quantity</div>
          <div className="text-center">Shelf Life</div>
          <div className="text-center">Risk</div>
          <div className="text-right">Value</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Product Cards */}
        <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Loading alerts...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 font-medium mb-1">No alerts found</p>
              <p className="text-sm text-gray-400">All products are in good condition</p>
            </div>
          ) : (
            filteredAlerts.map((alert, index) => (
              <ProductCard
                key={alert.id}
                alert={alert}
                onDelete={handleDeleteAlert}
                onGetInsights={handleGetAIInsights}
                getProductImage={getProductImage}
                getRiskBadgeColor={getRiskBadgeColor}
                getRiskBadgeText={getRiskBadgeText}
                isLast={index === filteredAlerts.length - 1}
              />
            ))
          )}
        </div>

        {/* Get AI Insights Button */}
        {filteredAlerts.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                if (filteredAlerts.length > 0) {
                  handleGetAIInsights(filteredAlerts[0]);
                }
              }}
              className="inline-flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full transition-colors shadow-lg shadow-purple-200"
            >
              <Sparkles size={20} />
              Get AI insights
            </button>
          </div>
        )}
      </div>

      {/* AI Insights Modal */}
      {showAIModal && (
        <AIInsightsModal
          alert={selectedAlert}
          insights={aiInsights}
          loading={loadingInsights}
          onClose={() => {
            setShowAIModal(false);
            setSelectedAlert(null);
            setAIInsights(null);
          }}
        />
      )}
    </Layout>
  );
};

// Filter Pill Component
const FilterPill = ({ label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-gray-800 text-white'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {label}
    </button>
  );
};

// Product Card Component
const ProductCard = ({ 
  alert, 
  onDelete, 
  onGetInsights,
  getProductImage, 
  getRiskBadgeColor, 
  getRiskBadgeText, 
  isLast 
}) => {
  return (
    <div className={`px-4 py-4 grid grid-cols-6 gap-4 items-center hover:bg-gray-50 transition-colors ${
      !isLast ? 'border-b border-gray-100' : ''
    }`}>
      {/* Product with Image */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
          {getProductImage(alert.product_name)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">
            {alert.product_name}
          </p>
        </div>
      </div>

      {/* Quantity */}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-800">
          {alert.quantity || '100kg'}
        </p>
      </div>

      {/* Shelf Life */}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-800">
          {alert.days_left ? `${alert.days_left}d` : '4d'}
        </p>
      </div>

      {/* Risk Badge */}
      <div className="flex justify-center">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskBadgeColor(alert.risk_level)}`}>
          {getRiskBadgeText(alert.risk_level)}
        </span>
      </div>

      {/* Value */}
      <div className="text-right">
        <p className="text-sm font-bold text-gray-800">
          ₱{alert.value || '8000.00'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <button 
          onClick={() => onGetInsights(alert)}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-full transition-colors inline-flex items-center gap-1"
          title="Get AI Insights"
        >
          <Sparkles size={12} />
          AI insights
        </button>
        <button
          onClick={() => onDelete(alert.id)}
          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
          title="Delete Alert"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// AI Insights Modal Component
const AIInsightsModal = ({ alert, insights, loading, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Sparkles size={24} />
              </div>
              <h2 className="text-2xl font-bold">AI Insights</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          {alert && (
            <p className="text-purple-100 text-sm">
              Analysis for: {alert.product_name}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing product data...</p>
            </div>
          ) : insights ? (
            <div className="space-y-6">
              {/* Risk Assessment */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 border border-red-200">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="text-red-600" size={20} />
                  <h3 className="font-bold text-gray-800">Risk Assessment</h3>
                </div>
                <p className="text-gray-700 text-sm mb-2">
                  <strong>Risk Level:</strong> {alert?.risk_level || 'HIGH'}
                </p>
                <p className="text-gray-700 text-sm mb-2">
                  <strong>Days Until Expiry:</strong> {alert?.days_left || 4} days
                </p>
                <p className="text-gray-700 text-sm">
                  <strong>Estimated Loss:</strong> ₱{alert?.value || '8000.00'}
                </p>
              </div>

              {/* Recommendations */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="text-blue-600" size={20} />
                  <h3 className="font-bold text-gray-800">Recommendations</h3>
                </div>
                <ul className="space-y-2">
                  {(insights.recommendations || [
                    'Move product to faster delivery route',
                    'Consider promotional pricing to accelerate sales',
                    'Monitor temperature closely - current conditions suboptimal',
                    'Prioritize this product for next delivery batch'
                  ]).map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Priority Actions */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="text-purple-600" size={20} />
                  <h3 className="font-bold text-gray-800">Priority Actions</h3>
                </div>
                <ul className="space-y-2">
                  {(insights.priority_actions || [
                    'Immediate: Schedule delivery within 48 hours',
                    'Short-term: Reduce storage temperature by 2°C',
                    'Medium-term: Review supplier delivery schedules'
                  ]).map((action, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-purple-600 font-bold">{index + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cost Impact */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                <h3 className="font-bold text-gray-800 mb-2">Potential Cost Savings</h3>
                <p className="text-gray-700 text-sm">
                  By following these recommendations, you could potentially save{' '}
                  <strong className="text-green-600">
                    ₱{insights.cost_impact || (parseFloat(alert?.value || 8000) * 0.8).toFixed(2)}
                  </strong>
                  {' '}in product loss prevention.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No insights available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-lg transition-colors"
          >
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;