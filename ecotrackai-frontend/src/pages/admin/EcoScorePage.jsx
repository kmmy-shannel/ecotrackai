import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import authService from '../../services/auth.service';
import useEcoTrust from '../../hooks/useEcoTrust';
import {
  Award, Star, TrendingUp, History, Eye,
  Map, Brain, CheckCircle, Target, Zap, RefreshCw, AlertCircle
} from 'lucide-react';

const TRUST_LEVELS = [
  { name: 'Newcomer',       minPoints: 0,   color: 'gray',   description: 'Just starting' },
  { name: 'Eco Warrior',    minPoints: 100, color: 'blue',   description: 'Learning & improving' },
  { name: 'Eco Champion',   minPoints: 300, color: 'green',  description: 'Consistently working on it' },
  { name: 'Eco Leader',     minPoints: 700, color: 'yellow', description: 'Sustainability expert' },
];

const HOW_TO_EARN = [
  { icon: <Brain size={18} />,       tip: 'Use AI route optimization',              points: '+50 pts per route' },
  { icon: <Map size={18} />,         tip: 'Complete deliveries using AI suggestions', points: '+20 pts per delivery' },
  { icon: <CheckCircle size={18} />, tip: 'Follow spoilage prevention tips',         points: '+30 pts per tip' },
];

const COLOR_MAP = {
  gray:   { bg: 'bg-gray-100',   icon: 'text-gray-600',   badge: 'bg-gray-100 text-gray-700' },
  blue:   { bg: 'bg-blue-100',   icon: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700' },
  green:  { bg: 'bg-green-100',  icon: 'text-green-600',  badge: 'bg-green-100 text-green-700' },
  yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
};

const EcoScorePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    setUser(currentUser);
  }, [navigate]);

  const businessId = user?.businessId || user?.business_id;
  const { score, level, nextLevelPoints, transactions, loading, error, refresh } = useEcoTrust(businessId);

  if (!user) return null;

  // Resolve current level config
  const currentLevelConfig = [...TRUST_LEVELS].reverse().find(l => score >= l.minPoints) || TRUST_LEVELS[0];
  const nextLevelConfig = TRUST_LEVELS[TRUST_LEVELS.indexOf(currentLevelConfig) + 1] || null;
  const progressTarget = nextLevelConfig ? nextLevelConfig.minPoints : currentLevelConfig.minPoints;
  const progressBase = currentLevelConfig.minPoints;
  const progressPercent = nextLevelConfig
    ? Math.min(100, ((score - progressBase) / (progressTarget - progressBase)) * 100)
    : 100;

  return (
    <Layout currentPage="EcoScore" user={user}>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div>
          <button onClick={refresh}><RefreshCw size={16} /></button>
        </div>
      )}

      {loading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          <span>Loading EcoTrust data...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Main Score Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-200">
              <h2 className="text-center font-bold text-gray-800 text-lg">Your EcoTrust Score</h2>
            </div>

            <div className="bg-gradient-to-br from-green-100 to-emerald-100 px-8 py-8">
              <div className="text-center">
                <p className="text-7xl font-bold text-gray-800 mb-3">
                  {score}<span className="text-4xl ml-2">POINTS</span>
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Award size={24} className="text-green-600" />
                  <p className="text-xl text-green-700 font-semibold">{level || currentLevelConfig.name}</p>
                </div>
                <p className="text-green-600 text-sm mt-1">"{currentLevelConfig.description}"</p>
              </div>
            </div>

            <div className="px-6 py-6 bg-white">
              {/* Progress Cards */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={18} className="text-green-600" />
                    <p className="text-sm font-semibold text-gray-700">Progress</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-800 mb-1">
                    {score - progressBase} / {progressTarget - progressBase}
                  </p>
                  <p className="text-xs text-gray-500">points earned this level</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={18} className="text-blue-600" />
                    <p className="text-sm font-semibold text-gray-700">Next Level</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-800 mb-1">
                    {nextLevelConfig ? nextLevelConfig.name : 'Max Level'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {nextLevelConfig ? `at ${nextLevelConfig.minPoints} points` : 'You\'ve reached the top!'}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-gray-600 mb-2">
                  <span>{currentLevelConfig.name}</span>
                  <span>{nextLevelConfig?.name || 'Max'}</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Transaction History */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Zap size={18} className="text-yellow-500" />
                  Recent Points Earned
                </h3>
                {transactions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((tx, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle size={16} className="text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {tx.action_type || tx.description || 'Points earned'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ''}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          +{tx.points_earned || tx.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-lg transition-colors font-medium">
                  <Eye size={16} /> How Customers See You
                </button>
                <button onClick={refresh} className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-lg transition-colors font-medium">
                  <History size={16} /> Refresh Score
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Trust Levels + How to Earn */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-200">
              <h3 className="font-bold text-gray-800 text-lg text-center">Trust Levels</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {TRUST_LEVELS.map((lvl) => {
                const colors = COLOR_MAP[lvl.color];
                const isCurrent = lvl.name === (level || currentLevelConfig.name);
                return (
                  <div key={lvl.name} className={`p-4 transition-colors ${isCurrent ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                        <Award size={16} className={colors.icon} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-800 text-sm">{lvl.name}</h4>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                            {lvl.minPoints}+ pts
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">"{lvl.description}"</p>
                        {isCurrent && (
                          <span className="mt-2 inline-block text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                            Current Level
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* How to Earn */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200">
              <h3 className="font-bold text-gray-800 text-center">How to Earn Points</h3>
            </div>
            <div className="p-5 space-y-4">
              {HOW_TO_EARN.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{item.tip}</p>
                    <p className="text-xs text-yellow-700 font-medium">{item.points}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EcoScorePage;