import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import productService from '../../services/product.service';
import alertService from '../../services/alert.service';
import deliveryService from '../../services/delivery.service';
import Layout from '../../components/Layout';
import AddProductModal from '../../components/AddProductModal';
import PlanNewDeliveryModal from '../../components/PlanNewDeliveryModal';
import ManageAccountsModal from '../../components/admin/ManageAccountsModal';

import {
  ChevronRight, Check,
  Users, Sparkles, Truck,
  AlertTriangle, Map, Zap
} from 'lucide-react';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalDeliveries: 0,
    totalAlerts: 0,
    ecoScore: 0,
  });
  const [spoilageStats, setSpoilageStats] = useState({ high: 0, medium: 0, low: 0 });

  // High-risk batches (replaces AI urgent recommendations)
  const [highRiskBatches, setHighRiskBatches]   = useState([]);
  const [loadingHighRisk, setLoadingHighRisk]   = useState(false);

  // AI insights per batch (like AlertsPage)
  const [batchInsights, setBatchInsights]       = useState({}); // { inventoryId: insights }
  const [loadingInsightId, setLoadingInsightId] = useState(null);
  const [expandedInsightId, setExpandedInsightId] = useState(null);

  // Approved batches ready for delivery (replaces Today's Overview)
  const [approvedBatches, setApprovedBatches]   = useState([]);
  const [loadingApproved, setLoadingApproved]   = useState(false);

  // Modals
  const [showAddProduct,     setShowAddProduct]     = useState(false);
  const [showPlanRoute,      setShowPlanRoute]      = useState(false);
  const [showManageAccounts, setShowManageAccounts] = useState(false);
  const [selectedPrefill,    setSelectedPrefill]    = useState(null);

  const toCount = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const getMonthlyDeliveryCount = (deliveries = []) => {
    const now = new Date();
    const monthly = deliveries.filter((d) => {
      const raw = d.created_at || d.delivery_date || d.scheduled_date || d.date;
      if (!raw) return false;
      const dt = new Date(raw);
      return !Number.isNaN(dt.getTime()) && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    });
    return monthly.length > 0 ? monthly.length : deliveries.length;
  };

  // ── Load dashboard stats ──────────────────────────────────────────────────
  const loadDashboardStats = useCallback(async () => {
    try {
      await alertService.syncAlerts().catch(() => null);
      const [productsRes, deliveriesRes, alertStatsRes] = await Promise.allSettled([
        productService.getAllProducts(),
        deliveryService.getAllDeliveries(),
        alertService.getAlertStats(),
      ]);

      const products   = productsRes.status   === 'fulfilled' ? productsRes.value?.data?.products   || productsRes.value?.products   || [] : [];
      const deliveries = deliveriesRes.status === 'fulfilled' ? deliveriesRes.value?.data?.deliveries || deliveriesRes.value?.deliveries || [] : [];
      const alertStats = alertStatsRes.status === 'fulfilled' ? alertStatsRes.value?.data || {} : {};

      const high   = toCount(alertStats.high_risk);
      const medium = toCount(alertStats.medium_risk);
      const low    = toCount(alertStats.low_risk);

      setStats(prev => ({
        ...prev,
        totalProducts:   products.length,
        totalDeliveries: getMonthlyDeliveryCount(deliveries),
        totalAlerts:     high + medium + low,
      }));
      setSpoilageStats({ high, medium, low });
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    }
  }, []);

  // ── Load high-risk batches ────────────────────────────────────────────────
  const loadHighRiskBatches = useCallback(async () => {
    try {
      setLoadingHighRisk(true);
      const res  = await alertService.getAllAlerts();
      const list = res?.data?.alerts || res?.alerts || res?.data || [];
      
      // Only show HIGH risk batches that are still 'active' (not yet submitted for AI/approval)
      setHighRiskBatches((Array.isArray(list) ? list : []).filter(a =>
        (a.risk_level || a.riskLevel) === 'HIGH' && a.status === 'active'
      ));
    } catch {
      setHighRiskBatches([]);
    } finally {
      setLoadingHighRisk(false);
    }
  }, []);

  // ── Load approved batches ready for delivery ──────────────────────────────
  const loadApprovedBatches = useCallback(async () => {
    try {
      setLoadingApproved(true);
      const res  = await alertService.getApprovedBatches();
      const list = res?.data?.approvedBatches || res?.approvedBatches || [];
      setApprovedBatches(Array.isArray(list) ? list : []);
    } catch {
      setApprovedBatches([]);
    } finally {
      setLoadingApproved(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadDashboardStats();
    loadHighRiskBatches();
    loadApprovedBatches();
  }, [user, loadDashboardStats, loadHighRiskBatches, loadApprovedBatches]);

  // ── Get AI insights for a specific high-risk batch ────────────────────────
  const handleGetInsights = async (batch) => {
    const id = batch.inventory_id || batch.id;
    if (expandedInsightId === id) { setExpandedInsightId(null); return; }
    setExpandedInsightId(id);
    if (batchInsights[id]) return; // already loaded

    try {
      setLoadingInsightId(id);
      const res = await alertService.getAIInsights(id);
      setBatchInsights(prev => ({ ...prev, [id]: res?.data || res }));
    } catch {
      setBatchInsights(prev => ({ ...prev, [id]: { error: true } }));
    } finally {
      setLoadingInsightId(null);
    }
  };

  // ── Plan delivery from approved batch ─────────────────────────────────────
  const handlePlanBatch = (batch = null) => {
    if (batch) {
      setSelectedPrefill({
        inventoryId: batch.inventory_id,
        productName: batch.product_name,
        batchNumber: batch.batch_number,
        quantity:    `${batch.available_quantity} ${batch.unit_of_measure || 'kg'}`,
        daysLeft:    batch.days_left,
        riskLevel:   batch.risk_level,
      });
    } else {
      setSelectedPrefill(null);
    }
    setShowPlanRoute(true);
  };

  const handlePlanSuccess = () => {
    setShowPlanRoute(false);
    setSelectedPrefill(null);
    loadApprovedBatches();
    loadDashboardStats();
  };

  if (!user) return null;

  return (
    <Layout currentPage="DASHBOARD" user={user}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">DASHBOARD</h1>
        <div className="flex gap-3">
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowManageAccounts(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-800 hover:bg-green-900 text-white rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Users size={20} />
              <span className="font-medium">Manage Accounts</span>
            </button>
          )}
          <button
            onClick={() => handlePlanBatch()}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-green-700 text-green-700 rounded-xl transition-all shadow-md hover:shadow-lg hover:bg-green-50 transform hover:-translate-y-0.5"
          >
            <Map size={20} />
            <span className="font-medium">Plan Route</span>
          </button>
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-800 hover:bg-green-900 text-white rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <span className="text-xl font-semibold">+</span>
            <span className="font-medium">Add Product</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Products"   value={stats.totalProducts}   subtitle="In inventory"       cardType="split-design" />
        <StatCard title="Total Deliveries" value={stats.totalDeliveries} subtitle="This month"         cardType="white-with-image" backgroundImage="/images/van_total_delivery.jpg" />
        <StatCard title="Alerts"           value={stats.totalAlerts}     subtitle={`${spoilageStats.high} high · ${spoilageStats.medium} medium`} cardType="white" />
        <StatCard title="Eco Score"        value={stats.ecoScore}        subtitle="This week"          cardType="split-design-reverse" />
      </div>

      {/* Risk Summary Bar */}
      <div className="mb-6 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-3 text-sm">
        <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 font-semibold">High risk: {spoilageStats.high}</span>
        <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-700 font-semibold">Medium risk: {spoilageStats.medium}</span>
        <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 font-semibold">Low risk: {spoilageStats.low}</span>
        <button
          onClick={() => navigate('/alerts')}
          className="ml-auto text-xs text-green-700 font-semibold hover:underline flex items-center gap-1"
        >
          View all alerts <ChevronRight size={13} />
        </button>
      </div>

      {/* Main two-column section */}
      <div className="grid grid-cols-2 gap-6">

        {/* LEFT — High Risk Batches + AI Insights */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-500" />
              <h3 className="text-lg font-bold text-gray-800">URGENT BATCHES</h3>
            </div>
            <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-200">
              {highRiskBatches.length} unactioned
            </span>
          </div>

          <div className="min-h-[300px]">
            {loadingHighRisk ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm">Loading high risk batches…</p>
              </div>
            ) : highRiskBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Check size={28} className="text-green-600" />
                </div>
                <p className="font-medium text-gray-600">All urgent batches actioned</p>
                <p className="text-sm mt-1 text-center px-4">No HIGH risk batches waiting for AI review.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {highRiskBatches.map((batch) => {
                  const id       = batch.inventory_id || batch.id;
                  const expanded = expandedInsightId === id;
                  const insights = batchInsights[id];
                  const loading  = loadingInsightId === id;

                  return (
                    <div key={id} className="rounded-xl border border-red-100 bg-red-50/40 overflow-hidden">
                      {/* Batch row */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-red-700">
                            {(batch.product_name || batch.productName || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{batch.product_name || batch.productName}</p>
                          <p className="text-xs text-gray-500">
                            Batch {batch.batch_number || batch.batchNumber || '—'} · {batch.current_quantity ?? batch.quantity ?? '—'} {batch.unit_of_measure || 'kg'} · {batch.days_left ?? batch.daysLeft ?? '?'}d left
                          </p>
                        </div>
                        <button
                          onClick={() => handleGetInsights(batch)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-full transition-colors flex-shrink-0"
                        >
                          <Sparkles size={11} className={loading ? 'animate-spin' : ''} />
                          {expanded ? 'Hide' : 'AI Insights'}
                        </button>
                      </div>

                      {/* Expandable AI insights */}
                      {expanded && (
                        <div className="border-t border-red-100 bg-white px-4 py-3">
                          {loading ? (
                            <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
                              <Sparkles size={13} className="animate-pulse text-green-600" />
                              Analyzing with AI…
                            </div>
                          ) : insights?.error ? (
                            <p className="text-xs text-red-500">Could not load insights. Try again.</p>
                          ) : insights ? (
                            <div className="space-y-2">
                              {(insights.recommendations || []).length > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Recommendations</p>
                                  <ul className="space-y-1">
                                    {insights.recommendations.map((r, i) => (
                                      <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                                        <span className="text-green-600 mt-0.5">•</span> {r}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {(insights.priority_actions || []).length > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 mt-2">Priority Actions</p>
                                  <ul className="space-y-1">
                                    {insights.priority_actions.map((a, i) => (
                                      <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                                        <span className="text-orange-500 font-bold">{i + 1}.</span> {a}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">No insights available.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Batches Ready for Delivery */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Truck size={20} className="text-orange-500" />
              <h3 className="text-lg font-bold text-gray-800">READY FOR DELIVERY</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded-full border border-orange-200">
                {approvedBatches.length} approved
              </span>
              {approvedBatches.length > 0 && (
                <button
                  onClick={() => handlePlanBatch()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  <Zap size={12} /> Plan Now
                </button>
              )}
            </div>
          </div>

          <div className="min-h-[300px]">
            {loadingApproved ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm">Loading approved batches…</p>
              </div>
            ) : approvedBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Truck size={24} className="text-gray-400" />
                </div>
                <p className="font-medium text-gray-600">No batches ready yet</p>
                <p className="text-sm mt-1 text-center px-4">Approved batches from the Inventory Manager will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {approvedBatches.map((batch) => (
                  <div
                    key={batch.inventory_id}
                    className="flex items-center gap-3 px-4 py-3 bg-orange-50/50 rounded-xl border border-orange-100 hover:border-orange-300 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      batch.risk_level === 'HIGH'   ? 'bg-red-500' :
                      batch.risk_level === 'MEDIUM' ? 'bg-orange-400' : 'bg-green-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{batch.product_name}</p>
                      <p className="text-xs text-gray-500">
                        Batch {batch.batch_number || '—'} · {batch.available_quantity} {batch.unit_of_measure || 'kg'} · {batch.days_left}d left
                      </p>
                    </div>
                    <button
                      onClick={() => handlePlanBatch(batch)}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-800 underline underline-offset-2 transition-colors flex-shrink-0"
                    >
                      Plan this batch
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => navigate('/alerts')}
                  className="w-full mt-2 py-2 text-xs font-semibold text-green-700 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  View all in Spoilage Alerts <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddProduct && (
        <AddProductModal
          onClose={() => setShowAddProduct(false)}
          onSuccess={() => { setShowAddProduct(false); loadDashboardStats(); }}
        />
      )}

      {showPlanRoute && (
        <PlanNewDeliveryModal
          prefill={selectedPrefill}
          onClose={() => { setShowPlanRoute(false); setSelectedPrefill(null); }}
          onSuccess={handlePlanSuccess}
        />
      )}

      {showManageAccounts && (
        <ManageAccountsModal onClose={() => setShowManageAccounts(false)} />
      )}
    </Layout>
  );
};

// ── StatCard ──────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, cardType, backgroundImage, graphImage }) => {
  const getCardStyle = () => {
    switch (cardType) {
      case 'split-design':
        return {
          container:    'bg-white overflow-hidden flex flex-col',
          header:       'bg-white px-5 pt-5 pb-3',
          body:         'bg-[#1a4d2e] px-5 py-4 flex-1 flex flex-col justify-between',
          titleText:    'text-gray-700 text-xs font-medium uppercase tracking-wide',
          valueText:    'text-white text-4xl font-bold',
          subtitleText: 'text-green-100 text-xs flex items-center gap-1',
          subtitleIcon: 'text-green-100 opacity-70'
        };
      case 'split-design-reverse':
        return {
          container:    'bg-white overflow-hidden flex flex-col',
          header:       'bg-[#1a4d2e] px-5 pt-4 pb-3 rounded-t-2xl',
          body:         'bg-white px-5 py-4 flex-1 flex flex-col justify-between rounded-b-2xl',
          titleText:    'text-white text-xs font-medium uppercase tracking-wide',
          valueText:    'text-gray-800 text-4xl font-bold',
          subtitleText: 'text-green-600 text-xs flex items-center gap-1',
          subtitleIcon: 'text-green-600 opacity-70'
        };
      case 'dark-green':
        return { container: 'bg-[#1a4d2e] text-white', valueText: 'text-white', subtitleText: 'text-green-100', titleText: 'text-green-100' };
      case 'white-with-image':
        return { container: 'bg-white text-gray-800 relative overflow-hidden', valueText: 'text-gray-800', subtitleText: 'text-gray-500', titleText: 'text-gray-600' };
      case 'white':
      default:
        return { container: 'bg-white text-gray-800', valueText: 'text-gray-800', subtitleText: 'text-gray-500', titleText: 'text-gray-600' };
    }
  };

  const styles = getCardStyle();

  if (cardType === 'split-design' || cardType === 'split-design-reverse' || cardType === 'split-design-with-graph') {
    return (
      <div className={`${styles.container} rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100`}>
        <div className={styles.header}>
          <h4 className={styles.titleText}>{title}</h4>
        </div>
        <div className={styles.body}>
          <p className={styles.valueText}>{value}</p>
          <p className={styles.subtitleText}>
            {subtitle}
            <ChevronRight size={14} className={styles.subtitleIcon} />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} rounded-2xl p-5 shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100`}>
      {cardType === 'white-with-image' && backgroundImage && (
        <div className="absolute right-0 bottom-0 opacity-100">
          <img src={backgroundImage} alt="" className="w-32 h-24 object-contain" />
        </div>
      )}
      {cardType === 'dark-green-with-graph' && graphImage && (
        <div className="absolute right-4 bottom-4 opacity-100">
          <img src={graphImage} alt="" className="w-40 h-24 object-contain" />
        </div>
      )}
      <div className="relative z-10">
        <h4 className={`text-xs font-medium uppercase tracking-wide mb-3 ${styles.titleText}`}>{title}</h4>
        <p className={`text-4xl font-bold mb-2 ${styles.valueText}`}>{value}</p>
        <p className={`text-xs ${styles.subtitleText} flex items-center gap-1`}>
          {subtitle}
          <ChevronRight size={14} className="opacity-50" />
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;
