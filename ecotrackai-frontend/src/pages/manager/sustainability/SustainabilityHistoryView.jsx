// ============================================================
// FILE: src/pages/manager/sustainability/SustainabilityHistoryView.jsx
// LAYER: View — Past carbon verification decisions
// ============================================================

import React from 'react';

const SustainabilityHistoryView = ({ history, loading }) => (
  <div className="space-y-4">
    {loading && <p className="text-[var(--text-300)] text-sm">Loading history...</p>}

    {!loading && history.length === 0 && (
      <p className="text-[var(--text-300)] text-sm">No verification history yet.</p>
    )}

    {history.map((record, i) => (
      <div key={record.approval_id || i}
        className="rounded-xl border border-[var(--surface-700)] bg-[var(--bg-900)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-100)]">
              {record.record_type || 'Carbon Record'}
            </p>
            <p className="text-xs text-[var(--text-300)]">
              {record.total_carbon_kg ?? '—'} kg CO₂ ·{' '}
              {record.updated_at ? new Date(record.updated_at).toLocaleDateString() : '—'}
            </p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
            record.status === 'approved'
              ? 'bg-green-950/40 text-green-300 border-green-900/60'
              : 'bg-red-950/40 text-red-300 border-red-900/60'
          }`}>
            {record.status === 'approved' ? 'Verified' : 'Revision Requested'}
          </span>
        </div>
        {record.manager_comment && (
          <p className="mt-2 text-xs text-[var(--text-300)] italic">
            Note: {record.manager_comment}
          </p>
        )}
      </div>
    ))}
  </div>
);

export default SustainabilityHistoryView;