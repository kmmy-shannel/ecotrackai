import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import useSustainabilityApprovals from '../../../hooks/useSustainabilityApprovals';
import SustainabilityManagerLayout from '../../../components/manager/sustainability/SustainabilityManagerLayout';
import SustainabilityDashboardView  from './SustainabilityDashboardView';
import SustainabilityHistoryView    from './SustainabilityHistoryView';

const SustainabilityManagerPage = () => {
  const { user }       = useAuth();
  const [searchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'pending';

  const PAGE_TITLES = {
    pending: 'SUSTAINABILITY DASHBOARD',
    history: 'VERIFICATION HISTORY',
    trends:  'CARBON TRENDS',
    audit:   'ECOTRUST AUDIT',
  };
  const currentPage = PAGE_TITLES[activeTab] || 'SUSTAINABILITY DASHBOARD';

  // ── Single hook supplies everything ─────────────────────────────────────────
  const {
    historyRecords,
    loading,
    error,
    trendData,
    trendLoading,
    auditRecords,
    auditLoading,
    loadTrendData,
    loadAuditRecords,
    flagTransaction,
  } = useSustainabilityApprovals();

  return (
    <SustainabilityManagerLayout currentPage={currentPage} user={user}>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {/* ── Pending verifications ─────────────────────────────────────────── */}
      {(activeTab === 'pending' || activeTab === '') && (
        // SustainabilityDashboardView uses its own internal hook call — no props needed
        <SustainabilityDashboardView />
      )}

      {/* ── Verification history ──────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <SustainabilityHistoryView
          activeTab="history"
          history={historyRecords}
          loading={loading}
        />
      )}

      {/* ── Carbon trends chart ───────────────────────────────────────────── */}
      {activeTab === 'trends' && (
        <SustainabilityHistoryView
          activeTab="trends"
          trendData={trendData}
          trendLoading={trendLoading}
          onLoadTrend={loadTrendData}
        />
      )}

      {/* ── EcoTrust audit ────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <SustainabilityHistoryView
          activeTab="audit"
          auditRecords={auditRecords}
          auditLoading={auditLoading}
          onLoadAudit={loadAuditRecords}
          onFlagTransaction={flagTransaction}
        />
      )}

    </SustainabilityManagerLayout>
  );
};

export default SustainabilityManagerPage;