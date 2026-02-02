import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth.service';
import aiService from '../services/ai.service';
import Navigation from '../components/Navigation';
import ManagerManagement from '../components/ManagerManagement';
import { 
  TrendingUp, ChevronRight, Check,
  Users, Sparkles, Clock, AlertCircle, Package, Truck, AlertTriangle, DollarSign, Map
} from 'lucide-react';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalDeliveries: 0,
    totalAlerts: 0,
    ecoScore: 0,
    profit: 0
  });

  // Single loadAIInsights function with useCallback
  const loadAIInsights = useCallback(async () => {
    try {
      setLoadingInsights(true);
      console.log('📊 Requesting AI insights with stats:', stats);
      
      const response = await aiService.getDashboardInsights(stats);
      console.log('✅ AI insights received:', response);
      
      if (response.success) {
        setAiInsights(response.data);
      }
    } catch (error) {
      console.error('❌ Failed to load AI insights:', error);
      // Set fallback data for demo purposes
      setAiInsights({
        urgentRecommendations: [
          {
            priority: 'HIGH',
            type: 'SPOILAGE',
            title: 'Temperature Alert - Cold Storage Unit 3',
            description: 'Temperature rising above optimal range. Immediate action required to prevent spoilage.',
            estimatedImpact: {
              financial: '₱15,000 potential loss',
              timeframe: 'Within 2 hours'
            },
            actionRequired: 'Check refrigeration system and reduce load'
          },
          {
            priority: 'MEDIUM',
            type: 'ROUTE',
            title: 'Optimize Delivery Routes',
            description: 'Current routes can be optimized to reduce fuel consumption by 18%.',
            estimatedImpact: {
              financial: '₱8,500 savings/month',
              timeframe: 'Implement this week'
            },
            actionRequired: 'Review suggested route plan in logistics tab'
          }
        ],
        todayOverview: {
          keyMetrics: [
            'Active deliveries: 8 out of 10 completed',
            'Average temperature compliance: 98.5%',
            'Energy efficiency: Above target by 12%'
          ],
          opportunities: [
            'Peak delivery efficiency window: 2-4 PM',
            'Consolidate 3 routes to save fuel costs'
          ],
          warnings: [
            'Storage capacity at 87% - consider offloading'
          ]
        }
      });
    } finally {
      setLoadingInsights(false);
    }
  }, [stats]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    setUser(currentUser);
    loadAIInsights();
  }, [navigate, loadAIInsights]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  

  const getPriorityColor = (priority) => {
    const colors = {
      HIGH: 'bg-red-50 border-red-200 text-red-700',
      MEDIUM: 'bg-orange-50 border-orange-200 text-orange-700',
      LOW: 'bg-blue-50 border-blue-200 text-blue-700'
    };
    return colors[priority] || colors.LOW;
  };

  const getTypeIcon = (type) => {
    const icons = {
      SPOILAGE: <Package size={20} />,
      ROUTE: <Truck size={20} />,
      ENERGY: <TrendingUp size={20} />,
      FINANCIAL: <DollarSign size={20} />
    };
    return icons[type] || <AlertCircle size={20} />;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col shadow-sm">
        <div className="flex items-center gap-3 mb-10">
          <img 
            src="/logo.jpg" 
            alt="EcoTrackAI Logo" 
            className="w-10 h-10 rounded-xl shadow-md object-cover"
          />
          <h1 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            ECO-TRACKAI
          </h1>
        </div>

        <Navigation onLogout={handleLogout} />
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <header className="bg-gradient-to-r from-white to-gray-50 rounded-2xl p-6 mb-6 flex items-center justify-between shadow-sm border border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Welcome back, {user.fullName.split(' ')[0]}!</h2>
            <p className="text-sm text-gray-500 mt-1">Here's what's happening with your eco-tracking today</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-3">
              <p className="text-sm font-medium text-gray-700">{user.fullName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-semibold text-lg">{user.fullName.charAt(0)}</span>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">DASHBOARD</h1>
          <div className="flex gap-3">
            {user && user.role === 'admin' && (
              <button
                onClick={() => setShowManagerModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-800 hover:bg-green-900 text-white rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <Users size={20} />
                <span className="font-medium">Manage Accounts</span>
              </button>
            )}

            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-green-700 text-green-700 rounded-xl transition-all shadow-md hover:shadow-lg hover:bg-green-50 transform hover:-translate-y-0.5">
              <Map size={20} />
              <span className="font-medium">Plan Route</span>
            </button>

            <button className="flex items-center gap-2 px-5 py-2.5 bg-green-800 hover:bg-green-900 text-white rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
              <span className="text-xl font-semibold">+</span>
              <span className="font-medium">Add Product</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard
            title="Total product"
            value={stats.totalProducts}
            subtitle="Today"
            cardType="split-design" 
          />

          <StatCard
            title="Total delivery"
            value={stats.totalDeliveries}
            subtitle="Today"
            cardType="white-with-image"
            backgroundImage="/images/van_total_delivery.jpg"
          />

          <StatCard
            title="Alerts"
            value={`0${stats.totalAlerts}`}
            subtitle="Decreased from last week"
            cardType="white"
          />

          <StatCard
            title="Eco Score"
            value={stats.ecoScore}
            subtitle="Increase from this week"
            cardType="split-design-reverse"
          />

          <StatCard
  title="Monthly Profit"
  value={`₱ ${stats.profit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
  subtitle="Decreased from Last Month"
  cardType="split-design-with-graph"
  graphImage="/images/graph.png"
/>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-purple-600" />
                <h3 className="text-lg font-bold text-gray-800">URGENT AI RECOMMENDATIONS</h3>
              </div>
              
              <button 
                onClick={loadAIInsights}
                disabled={loadingInsights}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} className={loadingInsights ? 'animate-spin' : ''} />
                <span className="text-sm font-medium">{loadingInsights ? 'Analyzing...' : 'Get AI Insights'}</span>
              </button>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 min-h-[300px] flex flex-col justify-between border border-gray-100">
              {loadingInsights ? (
                <div className="text-center text-gray-400 flex-1 flex flex-col items-center justify-center">
                  <Sparkles size={32} className="text-purple-600 animate-pulse mb-3" />
                  <p className="font-medium">AI is analyzing your data...</p>
                  <p className="text-sm mt-1">This may take a few moments</p>
                </div>
              ) : aiInsights?.urgentRecommendations?.length > 0 ? (
                <div className="space-y-3 flex-1 overflow-auto">
                  {aiInsights.urgentRecommendations.map((rec, index) => (
                    <div key={index} className={`border rounded-lg p-4 ${getPriorityColor(rec.priority)}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getTypeIcon(rec.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold">{rec.title}</h4>
                            <span className="text-xs font-semibold px-2 py-1 bg-white rounded">
                              {rec.priority}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{rec.description}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="font-medium">Financial:</span> {rec.estimatedImpact.financial}
                            </div>
                            <div>
                              <span className="font-medium">Timeline:</span> {rec.estimatedImpact.timeframe}
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                            <p className="text-xs font-medium">Action: {rec.actionRequired}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 flex-1 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <Check size={32} className="text-green-600" />
                  </div>
                  <p className="font-medium">No urgent recommendations</p>
                  <p className="text-sm mt-1">Everything is running smoothly!</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">TODAY'S OVERVIEW</h3>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 min-h-[300px] border border-gray-100">
              {loadingInsights ? (
                <div className="text-center text-gray-400 flex items-center justify-center h-full">
                  <Clock size={32} className="animate-pulse" />
                </div>
              ) : aiInsights?.todayOverview ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Key Metrics
                    </h4>
                    <ul className="space-y-1 pl-4">
                      {aiInsights.todayOverview.keyMetrics.map((metric, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          {metric}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                      <TrendingUp size={16} className="text-green-500" />
                      Opportunities
                    </h4>
                    <ul className="space-y-1 pl-4">
                      {aiInsights.todayOverview.opportunities.map((opp, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {aiInsights.todayOverview.warnings.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-orange-700 mb-2 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-orange-500" />
                        Warnings
                      </h4>
                      <ul className="space-y-1 pl-4">
                        {aiInsights.todayOverview.warnings.map((warning, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400 flex items-center justify-center h-full">
                  <div>
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 mx-auto">
                      <span className="text-3xl">📊</span>
                    </div>
                    <p className="font-medium">No activities today</p>
                    <p className="text-sm mt-1">Start tracking your eco-activities</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showManagerModal && (
        <ManagerManagement onClose={() => setShowManagerModal(false)} />
      )}
    </div>
  );
};

const StatCard = ({ title, value, subtitle, cardType, backgroundImage, graphImage }) => {
  const getCardStyle = () => {
    switch(cardType) {
      case 'split-design':
        return {
          container: 'bg-white overflow-hidden flex flex-col',
          header: 'bg-white px-5 pt-5 pb-3',
          body: 'bg-[#1a4d2e] px-5 py-4 flex-1 flex flex-col justify-between',
          titleText: 'text-gray-700 text-xs font-medium uppercase tracking-wide',
          valueText: 'text-white text-4xl font-bold',
          subtitleText: 'text-green-100 text-xs flex items-center gap-1',
          subtitleIcon: 'text-green-100 opacity-70'
        };
      case 'split-design-reverse':  
      return {
        container: 'bg-white overflow-hidden flex flex-col',
        header: 'bg-[#1a4d2e] px-5 pt-4 pb-3 rounded-t-2xl',
        body: 'bg-white px-5 py-4 flex-1 flex flex-col justify-between rounded-b-2xl',
        titleText: 'text-white text-xs font-medium uppercase tracking-wide',
        valueText: 'text-gray-800 text-4xl font-bold',
        subtitleText: 'text-green-600 text-xs flex items-center gap-1',
        subtitleIcon: 'text-green-600 opacity-70'
      };
      case 'dark-green':
        return {
          container: 'bg-[#1a4d2e] text-white', 
          valueText: 'text-white',
          subtitleText: 'text-green-100',
          titleText: 'text-green-100'
        };
      
      case 'dark-green-with-graph':
        return {
          container: 'bg-[#1a4d2e] text-white relative overflow-hidden',
          valueText: 'text-white',
          subtitleText: 'text-green-100',
          titleText: 'text-green-100'
        };
      case 'split-design-with-graph':
  return {
    container: 'bg-white overflow-hidden flex flex-col relative',
    header: 'bg-white px-5 pt-5 pb-3 relative z-10',
    body: 'bg-[#1a4d2e] px-5 py-4 flex-1 flex flex-col justify-between relative overflow-hidden',
    titleText: 'text-gray-700 text-xs font-medium uppercase tracking-wide',
    valueText: 'text-white text-4xl font-bold relative z-10',
    subtitleText: 'text-green-100 text-xs flex items-center gap-1 relative z-10',
    subtitleIcon: 'text-green-100 opacity-70'
  };
      case 'white-with-image':
        return {
          container: 'bg-white text-gray-800 relative overflow-hidden',
          valueText: 'text-gray-800',
          subtitleText: 'text-gray-500',
          titleText: 'text-gray-600'
        };
      
      case 'white':
      default:
        return {
          container: 'bg-white text-gray-800',
          valueText: 'text-gray-800',
          subtitleText: 'text-gray-500',
          titleText: 'text-gray-600'
        };
    }
  };

  const styles = getCardStyle();

  // Split design layout
 
// Split design layout
if (cardType === 'split-design' || cardType === 'split-design-reverse' || cardType === 'split-design-with-graph') {
  return (
    <div className={`${styles.container} rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100`}>
      {/* Header section */}
      <div className={styles.header}>
        <h4 className={styles.titleText}>
          {title}
        </h4>
      </div>
      
      {/* Body section */}
      <div className={styles.body}>
        {/* Graph decoration for profit card */}
        {cardType === 'split-design-with-graph' && graphImage && (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <img 
              src={graphImage} 
              alt="" 
              className="w-full h-full object-cover"
              style={{ 
                filter: 'brightness(1.5) contrast(1.2)',
                mixBlendMode: 'overlay'
              }}
            />
          </div>
        )}
        
        <p className={styles.valueText}>
          {value}
        </p>
        <p className={styles.subtitleText}>
          {subtitle}
          <ChevronRight size={14} className={styles.subtitleIcon} />
        </p>
      </div>
    </div>
  );
}

  // Original card designs
  return (
    <div className={`${styles.container} rounded-2xl p-5 shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100`}>
      {/* Delivery card background image */}
      {cardType === 'white-with-image' && backgroundImage && (
        <div className="absolute right-0 bottom-0 opacity-100">
          <img 
            src={backgroundImage} 
            alt="" 
            className="w-32 h-24 object-contain"
          />
        </div>
      )}

      {/* Profit card graph decoration */}
      {cardType === 'dark-green-with-graph' && graphImage && (
        <div className="absolute right-4 bottom-4 opacity-100">
          <img 
            src={graphImage} 
            alt="" 
            className="w-40 h-24 object-contain"
          />
        </div>
      )}

      {/* Card content */}
      <div className="relative z-10">
        <h4 className={`text-xs font-medium uppercase tracking-wide mb-3 ${styles.titleText}`}>
          {title}
        </h4>
        <p className={`text-4xl font-bold mb-2 ${styles.valueText}`}>
          {value}
        </p>
        <p className={`text-xs ${styles.subtitleText} flex items-center gap-1`}>
          {subtitle}
          <ChevronRight size={14} className="opacity-50" />
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;