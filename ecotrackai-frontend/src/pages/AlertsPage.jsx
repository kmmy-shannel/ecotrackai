import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import authService from '../services/auth.service';
import alertService from '../services/alert.service';
import { AlertTriangle, Search, X, Clock, Thermometer, Droplets, MapPin } from 'lucide-react';

const AlertsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [stats, setStats] = useState({
    total: 0,
    high_risk: 0,
    medium_risk: 0,
    low_risk: 0
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    // Filter by risk level
    if (selectedFilter !== 'ALL') {
      filtered = filtered.filter(alert => alert.risk_level === selectedFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(alert =>
        alert.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAlerts(filtered);
  };

  const handleDismissAlert = async (id) => {
    if (!window.confirm('Are you sure you want to dismiss this alert?')) {
      return;
    }

    try {
      await alertService.updateAlertStatus(id, 'dismissed');
      setSuccess('Alert dismissed successfully');
      loadAlerts();
      loadStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Dismiss alert error:', err);
      setError('Failed to dismiss alert');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getRiskBadgeColor = (riskLevel) => {
    const colors = {
      HIGH: 'bg-red-100 text-red-700 border-red-300',
      MEDIUM: 'bg-orange-100 text-orange-700 border-orange-300',
      LOW: 'bg-blue-100 text-blue-700 border-blue-300'
    };
    return colors[riskLevel] || colors.LOW;
  };

  if (!user) return null;

  return (
    <Layout currentPage="Spoilage Alerts" user={user}>
      {/* Success/Error Messages */}
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

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section - Alerts List */}
        <div className="lg:col-span-2">
          {/* Filter Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center gap-2 p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">ALERTS</h3>
              <div className="flex gap-2 ml-auto">
                <FilterButton
                  label="ALL"
                  active={selectedFilter === 'ALL'}
                  onClick={() => setSelectedFilter('ALL')}
                />
                <FilterButton
                  label="HIGH"
                  active={selectedFilter === 'HIGH'}
                  onClick={() => setSelectedFilter('HIGH')}
                  color="red"
                />
                <FilterButton
                  label="MEDIUM"
                  active={selectedFilter === 'MEDIUM'}
                  onClick={() => setSelectedFilter('MEDIUM')}
                  color="orange"
                />
                <FilterButton
                  label="LOW"
                  active={selectedFilter === 'LOW'}
                  onClick={() => setSelectedFilter('LOW')}
                  color="blue"
                />
              </div>
            </div>

            {/* Alerts Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Details</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Days Left</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="3" className="text-center py-12 text-gray-500">
                        Loading alerts...
                      </td>
                    </tr>
                  ) : filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle size={32} className="text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium mb-1">No alerts found</p>
                          <p className="text-sm text-gray-400">All products are in good condition</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getRiskBadgeColor(alert.risk_level)}`}>
                              <AlertTriangle size={20} />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{alert.product_name}</p>
                              <p className="text-sm text-gray-600 mt-1">{alert.details}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                {alert.temperature && (
                                  <div className="flex items-center gap-1">
                                    <Thermometer size={14} />
                                    <span>{alert.temperature}°C</span>
                                  </div>
                                )}
                                {alert.humidity && (
                                  <div className="flex items-center gap-1">
                                    <Droplets size={14} />
                                    <span>{alert.humidity}%</span>
                                  </div>
                                )}
                                {alert.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin size={14} />
                                    <span>{alert.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-gray-400" />
                            <span className={`font-semibold ${
                              alert.days_left <= 2 ? 'text-red-600' :
                              alert.days_left <= 5 ? 'text-orange-600' :
                              'text-blue-600'
                            }`}>
                              {alert.days_left} {alert.days_left === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => handleDismissAlert(alert.id)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                              title="Dismiss Alert"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Section - Risk Level System & AI Recommendations */}
        <div className="space-y-6">
          {/* Risk Level System */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">RISK LEVEL SYSTEM</h3>
            <div className="space-y-3">
              <RiskLevelCard
                level="HIGH RISK"
                count={stats.high_risk}
                color="red"
              />
              <RiskLevelCard
                level="MEDIUM RISK"
                count={stats.medium_risk}
                color="orange"
              />
              <RiskLevelCard
                level="LOW RISK"
                count={stats.low_risk}
                color="blue"
              />
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl shadow-sm border border-purple-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">AI RECOMMENDATION</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <p>• Prioritize high-risk items for immediate action</p>
              <p>• Check temperature sensors in storage areas</p>
              <p>• Review expiry dates for medium-risk products</p>
              <p>• Consider route optimization for faster delivery</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Filter Button Component
const FilterButton = ({ label, active, onClick, color = 'gray' }) => {
  const colors = {
    gray: active ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    red: active ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200',
    orange: active ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-200',
    blue: active ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${colors[color]}`}
    >
      {label}
    </button>
  );
};

// Risk Level Card Component
const RiskLevelCard = ({ level, count, color }) => {
  const colors = {
    red: 'bg-red-100 border-red-300 text-red-700',
    orange: 'bg-orange-100 border-orange-300 text-orange-700',
    blue: 'bg-blue-100 border-blue-300 text-blue-700'
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${color === 'red' ? 'bg-red-600' : color === 'orange' ? 'bg-orange-600' : 'bg-blue-600'}`} />
          <span className="font-semibold text-sm">{level}</span>
        </div>
        <span className="text-2xl font-bold">{String(count).padStart(2, '0')}</span>
      </div>
    </div>
  );
};

export default AlertsPage;