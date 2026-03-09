// REPLACE ENTIRE FILE:
import React from 'react';
import CarbonVerificationCard from '../../../components/manager/sustainability/CarbonVerificationCard';
import { CheckCircle, Leaf } from 'lucide-react';

const SustainabilityDashboardView = ({ verifications, onVerify, onRequestRevision, loading }) => (
  <div className="space-y-6">

    {/* Stats */}
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
          <Leaf size={20} className="text-green-600" />
        </div>
        <p className="text-2xl font-bold text-green-600">{verifications.length}</p>
        <p className="text-xs text-gray-500 mt-1">Pending Verifications</p>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
          <CheckCircle size={20} className="text-emerald-600" />
        </div>
        <p className="text-2xl font-bold text-emerald-600">—</p>
        <p className="text-xs text-gray-500 mt-1">Verified This Month</p>
      </div>
    </div>

    {loading && (
      <div className="text-center py-12 text-gray-400 text-sm">Loading verifications…</div>
    )}

    {!loading && verifications.length === 0 && (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <CheckCircle size={36} className="mx-auto mb-3 text-green-400" />
        <p className="font-semibold text-gray-700">No pending verifications</p>
        <p className="text-sm text-gray-400 mt-1">
          Completed deliveries will appear here for carbon verification
        </p>
      </div>
    )}

    <div className="space-y-3">
      {verifications.map(record => (
        <CarbonVerificationCard
          key={record.approval_id || record.record_id}
          record={record}
          onVerify={onVerify}
          onRequestRevision={onRequestRevision}
        />
      ))}
    </div>
  </div>
);

export default SustainabilityDashboardView;