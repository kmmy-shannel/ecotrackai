import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useSustainabilityApprovals } from '../../../hooks/useSustainabilityApprovals';
import SustainabilityManagerLayout from '../../../components/manager/sustainability/SustainabilityManagerLayout';
import SustainabilityDashboardView from './SustainabilityDashboardView';
import SustainabilityHistoryView   from './SustainabilityHistoryView';

const SustainabilityManagerPage = () => {
  const { user }         = useAuth();
  const [searchParams]   = useSearchParams();
  const businessId       = user?.businessId || user?.business_id;

  // Reads ?tab= exactly like InventoryManagerPage and LogisticsManagerPage do
  const activeTab   = searchParams.get('tab') || 'pending';
  const isHistory   = activeTab === 'history';
  const currentPage =
    activeTab === 'history' ? 'VERIFICATION HISTORY'  :
    activeTab === 'audit'   ? 'ECOTRUST AUDIT'         :
    activeTab === 'trends'  ? 'CARBON TRENDS'          :
                              'SUSTAINABILITY DASHBOARD';

  const {
    pendingVerifications,
    history,
    loading,
    error,
    success,
    loadHistory,
    verify,
    requestRevision,
  } = useSustainabilityApprovals(businessId);

  React.useEffect(() => {
    if (isHistory) loadHistory();
  }, [isHistory, loadHistory]);

  return (
    <SustainabilityManagerLayout currentPage={currentPage} user={user}>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm font-medium">
          {success}
        </div>
      )}

      {activeTab === 'pending' || activeTab === '' ? (
        <SustainabilityDashboardView
          verifications={pendingVerifications}
          onVerify={verify}
          onRequestRevision={requestRevision}
          loading={loading}
        />
      ) : activeTab === 'history' ? (
        <SustainabilityHistoryView
          history={history}
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