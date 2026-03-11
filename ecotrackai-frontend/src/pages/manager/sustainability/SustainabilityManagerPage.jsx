import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import useSustainabilityApprovals from '../../../hooks/useSustainabilityApprovals';
import SustainabilityManagerLayout from '../../../components/manager/sustainability/SustainabilityManagerLayout';
import SustainabilityDashboardView from './SustainabilityDashboardView';
import SustainabilityHistoryView   from './SustainabilityHistoryView';

const SustainabilityManagerPage = () => {
  const { user }       = useAuth();
  const [searchParams] = useSearchParams();

  const activeTab   = searchParams.get('tab') || 'pending';
  const currentPage =
    activeTab === 'history' ? 'VERIFICATION HISTORY'  :
    activeTab === 'audit'   ? 'ECOTRUST AUDIT'         :
    activeTab === 'trends'  ? 'CARBON TRENDS'          :
                              'SUSTAINABILITY DASHBOARD';

  // ── New hook API ──────────────────────────────────────────
  const {
    historyRecords,
    loading,
    error,
  } = useSustainabilityApprovals();

  return (
    <SustainabilityManagerLayout currentPage={currentPage} user={user}>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {activeTab === 'pending' || activeTab === '' ? (
        // Dashboard view uses the hook internally — no props needed
        <SustainabilityDashboardView />

      ) : activeTab === 'history' ? (
        <SustainabilityHistoryView
          history={historyRecords}
          loading={loading}
        />

      ) : activeTab === 'audit' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">EcoTrust Audit</h2>
          <p className="text-sm text-gray-500 mt-1">
            View all EcoTrust transactions and flag suspicious entries for Super Admin review.
          </p>
        </div>

      ) : activeTab === 'trends' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Carbon Trends</h2>
          <p className="text-sm text-gray-500 mt-1">
            Compare estimated vs actual carbon metrics across completed deliveries.
          </p>
        </div>

      ) : null}

    </SustainabilityManagerLayout>
  );
};

export default SustainabilityManagerPage;