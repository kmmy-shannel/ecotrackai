// ============================================================
// FILE: src/pages/manager/sustainability/SustainabilityDashboardView.jsx
// LAYER: View — Pending carbon verifications
// ============================================================

import React from 'react';
import CarbonVerificationCard from '../../../components/manager/sustainability/CarbonVerificationCard';
import StatCard from '../../../components/manager/shared/StatCard';
import { CheckCircle, Leaf } from 'lucide-react';

const SustainabilityDashboardView = ({ verifications, onVerify, onRequestRevision, loading }) => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard label="Pending Verifications" value={verifications.length} icon={Leaf} accent />
      <StatCard label="Verified This Month"   value="—"                   icon={CheckCircle} />
    </div>

    {loading && <p className="text-[var(--text-300)] text-sm">Loading verifications...</p>}

    {!loading && verifications.length === 0 && (
      <div className="rounded-xl border border-[var(--surface-700)] bg-[var(--bg-900)] p-8 text-center">
        <CheckCircle size={32} className="mx-auto mb-3 text-green-400" />
        <p className="text-[var(--text-100)] font-semibold">No pending verifications</p>
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