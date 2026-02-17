import React, { useState, useEffect } from 'react';
import authService from '../../services/auth.service';
import approvalService from '../../services/approval.service';
import { Package, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const InventoryManagerPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'inventory_manager') {
      navigate('/');
      return;
    }
    setUser(currentUser);
    loadApprovals();
  }, [navigate]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const response = await approvalService.getMyApprovals('pending');
      if (response.success) setApprovals(response.data.approvals);
    } catch (err) {
      console.error('Load approvals error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId) => {
    await approvalService.approve(approvalId, '');
    loadApprovals();
  };

  const handleReject = async (approvalId) => {
    const notes = prompt('Reason for rejection:');
    if (notes === null) return;
    await approvalService.reject(approvalId, notes);
    loadApprovals();
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a4d2e] text-white px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={24} />
          <div>
            <h1 className="font-bold text-lg">Inventory Manager Dashboard</h1>
            <p className="text-emerald-200 text-sm">Spoilage Prevention Approvals</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-emerald-200">{user.fullName}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Pending Approvals</h2>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
            {approvals.length} pending
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading approvals...</div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">All caught up!</p>
            <p className="text-gray-400 text-sm mt-1">No pending approvals at the moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map(approval => (
              <div key={approval.approval_id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={16} className="text-yellow-500" />
                      <span className="text-xs text-yellow-600 font-medium uppercase tracking-wide">Pending Review</span>
                    </div>
                    <h3 className="font-bold text-gray-800 mb-1">{approval.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{approval.description}</p>
                    <p className="text-xs text-gray-400">
                      Submitted: {new Date(approval.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(approval.approval_id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors font-medium"
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(approval.approval_id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors font-medium"
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryManagerPage;