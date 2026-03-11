import React, { useState } from 'react';
import useSustainabilityApprovals from '../../../hooks/useSustainabilityApprovals';
import { CheckCircle, XCircle, RefreshCw, AlertCircle, Leaf } from 'lucide-react';

const SustainabilityDashboardView = () => {
  const { pendingRecords, loading, error, verifyRecord, refresh } = useSustainabilityApprovals();
  const [revisionNote, setRevisionNote] = useState('');
  const [selectedId, setSelectedId]     = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [resultMsg, setResultMsg]       = useState('');
  const [isSuccess, setIsSuccess]       = useState(false);

  const handleVerify = async (recordId) => {
    setSubmitting(true);
    setResultMsg('');
    const result = await verifyRecord(recordId, 'verified', '');
    setIsSuccess(result.success);
    setResultMsg(result.success
      ? `✓ Verified! ${result.data?.totalPointsAdded || 0} points released. Level: ${result.data?.newLevel || ''}`
      : `Error: ${result.error}`
    );
    setSubmitting(false);
  };

  const handleRequestRevision = async (recordId) => {
    if (!revisionNote.trim()) return alert('Please enter a revision note.');
    setSubmitting(true);
    setResultMsg('');
    const result = await verifyRecord(recordId, 'revision_requested', revisionNote);
    setIsSuccess(result.success);
    setResultMsg(result.success
      ? '✓ Revision requested. Admin will be notified.'
      : `Error: ${result.error}`
    );
    setRevisionNote('');
    setSelectedId(null);
    setSubmitting(false);
  };

  return (
    <div className="p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Pending Carbon Verifications</h2>
        <button
          onClick={refresh}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Leaf size={20} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{pendingRecords.length}</p>
          <p className="text-xs text-gray-500 mt-1">Pending Verifications</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">IPCC</p>
          <p className="text-xs text-gray-500 mt-1">Emission Standard</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {resultMsg && (
        <div className={`p-3 border rounded-lg text-sm ${
          isSuccess
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {resultMsg}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-blue-600 py-6 justify-center">
          <RefreshCw size={16} className="animate-spin" /> Loading pending verifications...
        </div>
      )}

      {/* Empty State */}
      {!loading && pendingRecords.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <CheckCircle size={36} className="mx-auto mb-3 text-green-400" />
          <p className="font-semibold text-gray-700">No pending verifications</p>
          <p className="text-sm text-gray-400 mt-1">
            Completed deliveries will appear here for carbon verification
          </p>
        </div>
      )}

      {/* Verification Cards */}
      {pendingRecords.map(record => (
        <div
          key={record.record_id}
          className="bg-white rounded-2xl shadow border border-gray-200 p-5 space-y-4"
        >
          {/* Card Header */}
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-gray-800">
                {record.route_name || `Delivery #${record.delivery_route_id}`}
              </p>
              <p className="text-xs text-gray-400">
                {record.vehicle_type} · {record.created_at
                  ? new Date(record.created_at).toLocaleDateString()
                  : ''}
              </p>
            </div>
            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
              Pending
            </span>
          </div>

          {/* Breakdown */}
        {/* Breakdown */}
<div className="grid grid-cols-2 gap-3 text-sm">
  <div className="bg-gray-50 rounded-xl p-3">
    <p className="text-xs text-gray-500 mb-1">Transportation CO₂</p>
    <p className="font-semibold">
      {record.transportation_carbon_kg ?? '—'} kg
    </p>
  </div>
  <div className="bg-gray-50 rounded-xl p-3">
    <p className="text-xs text-gray-500 mb-1">Storage CO₂</p>
    <p className="font-semibold">
      {record.storage_carbon_kg ?? '—'} kg
    </p>
  </div>
  <div className="bg-green-50 rounded-xl p-3 col-span-2">
    <p className="text-xs text-gray-500 mb-1">Total CO₂ Emission</p>
    <p className="font-semibold text-green-700">
      {record.total_carbon_kg ?? '—'} kg CO₂
    </p>
    <p className="text-xs text-gray-400 mt-1">
      Method: {record.calculation_method || 'IPCC diesel emission factor'}
    </p>
  </div>
</div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleVerify(record.record_id)}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              <CheckCircle size={16} /> Verify
            </button>
            <button
              onClick={() =>
                setSelectedId(selectedId === record.record_id ? null : record.record_id)
              }
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold"
            >
              <XCircle size={16} /> Request Revision
            </button>
          </div>

          {/* Revision Input */}
          {selectedId === record.record_id && (
            <div className="space-y-2">
              <textarea
                value={revisionNote}
                onChange={e => setRevisionNote(e.target.value)}
                placeholder="Explain why revision is needed (e.g. fuel figure not credible for this vehicle type)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button
                onClick={() => handleRequestRevision(record.record_id)}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Submit Revision Request
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SustainabilityDashboardView;