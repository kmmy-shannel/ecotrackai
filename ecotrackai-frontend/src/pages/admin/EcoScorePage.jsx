import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import authService from '../../services/auth.service';
import useEcoTrust from '../../hooks/useEcoTrust';
import {
  Award, TrendingUp, Zap, RefreshCw, AlertCircle,
  CheckCircle, Leaf, Truck, Package, Star
} from 'lucide-react';

const TRUST_LEVELS = [
  { level: 1, name: 'Newcomer',     min: 0,    max: 499,  color: 'gray',   emoji: '🌱', desc: 'Just getting started' },
  { level: 2, name: 'Eco Warrior',  min: 500,  max: 999,  color: 'blue',   emoji: '⚡', desc: 'Consistently preventing waste' },
  { level: 3, name: 'Eco Champion', min: 1000, max: 1999, color: 'green',  emoji: '🏆', desc: 'Strong environmental leadership' },
  { level: 4, name: 'Eco Leader',   min: 2000, max: 3999, color: 'yellow', emoji: '🌟', desc: 'Top-tier sustainable business' },
  { level: 5, name: 'Eco Legend',   min: 4000, max: null, color: 'purple', emoji: '👑', desc: 'Pinnacle of sustainable distribution' },
];

const COLOR_MAP = {
  gray:   { ring: 'ring-gray-300',   bg: 'bg-gray-100',    text: 'text-gray-700',   bar: 'from-gray-400 to-gray-500',     badge: 'bg-gray-100 text-gray-700 border-gray-200' },
  blue:   { ring: 'ring-blue-300',   bg: 'bg-blue-50',     text: 'text-blue-700',   bar: 'from-blue-400 to-blue-600',     badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  green:  { ring: 'ring-green-300',  bg: 'bg-green-50',    text: 'text-green-700',  bar: 'from-green-400 to-emerald-500', badge: 'bg-green-100 text-green-700 border-green-200' },
  yellow: { ring: 'ring-yellow-300', bg: 'bg-yellow-50',   text: 'text-yellow-700', bar: 'from-yellow-400 to-orange-400', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  purple: { ring: 'ring-purple-300', bg: 'bg-purple-50',   text: 'text-purple-700', bar: 'from-purple-400 to-purple-600', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const CATEGORY_ICON = {
  'spoilage prevention':  <Package size={14} className="text-orange-500" />,
  'delivery efficiency':  <Truck size={14} className="text-blue-500" />,
  'carbon reduction':     <Leaf size={14} className="text-green-500" />,
  'delivery completion':  <CheckCircle size={14} className="text-emerald-500" />,
  'delivery optimization':<Zap size={14} className="text-purple-500" />,
  'carbon verification':  <Leaf size={14} className="text-teal-500" />,
  'on time delivery':     <TrendingUp size={14} className="text-blue-400" />,
};

const getCategoryIcon = (category) =>
  CATEGORY_ICON[String(category || '').toLowerCase()] || <Star size={14} className="text-gray-400" />;

const EcoScorePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    setUser(currentUser);
  }, [navigate]);

  const businessId = user?.businessId || user?.business_id;
  const {
    score, level, levelNumber,
    nextLevel, pointsToNext, progressPct,
    transactions, breakdown, actions,
    loading, error, refresh
  } = useEcoTrust(businessId);

  if (!user) return null;

  const currentLevelConfig = TRUST_LEVELS.find(l => l.name === level) || TRUST_LEVELS[0];
  const colors = COLOR_MAP[currentLevelConfig.color];

  return (
    <Layout currentPage="EcoTrust" user={user}>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div>
          <button onClick={refresh} className="hover:text-red-800"><RefreshCw size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: Score Card ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Score Hero */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-700 to-emerald-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-xs font-semibold uppercase tracking-widest mb-1">EcoTrust Score</p>
                  <div className="flex items-end gap-3">
                    <p className="text-6xl font-bold">{loading ? '—' : score}</p>
                    <p className="text-2xl font-medium text-green-200 mb-1">pts</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30`}>
                    <span className="text-2xl">{currentLevelConfig.emoji}</span>
                    <div>
                      <p className="font-bold text-sm">Lv {levelNumber}</p>
                      <p className="text-xs text-green-200">{level}</p>
                    </div>
                  </div>
                  <p className="text-xs text-green-300 mt-2 italic">"{currentLevelConfig.desc}"</p>
                </div>
              </div>

              {/* Progress to next level */}
              <div className="mt-5">
                <div className="flex justify-between text-xs text-green-200 mb-1.5">
                  <span>{level}</span>
                  <span>{nextLevel ? `${pointsToNext} pts to ${nextLevel}` : '🏆 Max Level Reached'}</span>
                </div>
                <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Points breakdown by category */}
            {breakdown.length > 0 && (
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Points by Category</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {breakdown.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                      {getCategoryIcon(b.category)}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-700 capitalize truncate">{b.category || 'Other'}</p>
                        <p className="text-xs text-green-600 font-bold">{b.total_points} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent transactions */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Zap size={13} className="text-yellow-500" /> Recent Points Earned
                </p>
                <button onClick={refresh} disabled={loading}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              {loading ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading…
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <Star size={24} className="mx-auto mb-2 text-gray-300" />
                  No transactions yet — complete actions to earn points!
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-green-200 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          {getCategoryIcon(tx.category)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{tx.action_type || 'Points earned'}</p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {tx.description || tx.related_record_type || ''}
                            {tx.transaction_date ? ` · ${new Date(tx.transaction_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-green-600 flex-shrink-0 ml-2">
                        +{tx.points_earned} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* How to Earn — pulled from DB actions */}
          {actions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-100">
                <p className="font-bold text-gray-800 text-sm uppercase tracking-wide">How to Earn Points</p>
              </div>
              <div className="divide-y divide-gray-50">
                {actions.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-yellow-50 border border-yellow-200 rounded-full flex items-center justify-center flex-shrink-0">
                        {getCategoryIcon(a.category)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{a.action_name}</p>
                        <p className="text-[10px] text-gray-400 capitalize truncate">{a.category || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      {a.times_earned > 0 && (
                        <span className="text-[10px] text-gray-400">{a.times_earned}× earned</span>
                      )}
                      <span className="text-sm font-bold text-green-600">+{a.points_value} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Trust Levels ───────────────────────────── */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
              <p className="font-bold text-gray-800 text-center">EcoTrust Levels</p>
            </div>
            <div className="divide-y divide-gray-50">
              {TRUST_LEVELS.map((lvl) => {
                const c       = COLOR_MAP[lvl.color];
                const active  = lvl.name === level;
                const achieved = score >= lvl.min;
                return (
                  <div key={lvl.level}
                    className={`p-4 transition-colors ${active ? 'bg-green-50' : achieved ? 'bg-gray-50/50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg ring-2 ${achieved ? c.ring : 'ring-gray-200'} ${achieved ? c.bg : 'bg-gray-100'}`}>
                        {lvl.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs font-bold text-gray-800">Lv {lvl.level} · {lvl.name}</p>
                          {active && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">Current</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 mb-1">
                          {lvl.max ? `${lvl.min.toLocaleString()} – ${lvl.max.toLocaleString()} pts` : `${lvl.min.toLocaleString()}+ pts`}
                        </p>
                        <p className="text-[10px] text-gray-400 italic">"{lvl.desc}"</p>
                      </div>
                    </div>
                    {/* Mini progress bar if current level */}
                    {active && nextLevel && (
                      <div className="mt-2 ml-12">
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${colors.bar} rounded-full transition-all`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{progressPct}% to {nextLevel}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EcoScorePage;
