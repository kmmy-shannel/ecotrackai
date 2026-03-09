import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../../services/auth.service';
import InventoryManagerLayout from '../../../components/manager/inventory/InventoryManagerLayout';
import InventoryDashboardView from './InventoryDashboardView';
import InventoryHistoryView from './InventoryHistoryView';
import useApprovals from '../../../hooks/useApprovals';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const InventoryManagerPage = () => {
  const navigate = useNavigate();
  const [user, setUser]   = useState(null);
  const [view, setView]   = useState('dashboard');

  const {
    approvals, history, alerts,
    loading, error, success,
    approveApproval, declineApproval, generateAlerts,
  } = useApprovals();

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    if (currentUser.role !== 'inventory_manager') { navigate('/unauthorized'); return; }
    setUser(currentUser);
  }, [navigate]);

  if (!user) return null;

  const pageTitle = view === 'dashboard' ? 'Pending Approvals' : 'Approval History';

  return (
    <InventoryManagerLayout
      currentPage={pageTitle}
      user={user}
      activeView={view}
      onViewChange={setView}
      pendingCount={approvals.length} 
    >
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Toasts */}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm">
            <CheckCircle2 size={15} /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Views — driven by sidebar, no tab buttons here */}
        {view === 'dashboard' ? (
          <InventoryDashboardView
            approvals={approvals}
            alerts={alerts}
            loading={loading}
            onApprove={approveApproval}
            onDecline={declineApproval}
            onGenerateAlerts={generateAlerts}
          />
        ) : (
          <InventoryHistoryView history={history} />
        )}

      </div>
    </InventoryManagerLayout>
  );
};

export default InventoryManagerPage;