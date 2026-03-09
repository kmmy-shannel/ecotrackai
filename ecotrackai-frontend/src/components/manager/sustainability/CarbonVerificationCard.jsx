import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, Leaf } from 'lucide-react';

const CarbonVerificationCard = ({ record, onVerify, onRequestRevision }) => {
  const [note, setNote]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleVerify = async () => {
    setSubmitting(true);
    setLocalError('');
    const ok = await onVerify(record.approval_id || record.record_id, note);
    if (!ok) setLocalError('Verification failed. Try again.');
    setSubmitting(false);
  };

  const handleRevision = async () => {
    if (!note.trim()) {
      setLocalError('A note is required when requesting revision.');
      return;
    }
    setSubmitting(true);
    setLocalError('');
    const ok = await onRequestRevision(record.approval_id || record.record_id, note);
    if (!ok) setLocalError('Request failed. Try again.');
    setSubmitting(false);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <Leaf size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {record.record_type || record.approval_type || 'Carbon Record'}
            </p>
            <p className="text-xs text-gray-400">
              {record.created_at ? new Date(record.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Pending Verification
        </span>
      </div>

      {/* Carbon Details */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total CO₂',    value: record.total_carbon_kg     ? `${record.total_carbon_kg} kg`     : '—' },
          { label: 'Transport',    value: record.transport_carbon_kg  ? `${record.transport_carbon_kg} kg`  : '—' },
          { label: 'Storage',      value: record.storage_carbon_kg    ? `${record.storage_carbon_kg} kg`    : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-sm font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Calculation Method */}
      {record.calculation_method && (
        <div className="rounded-xl bg-green-50 border border-green-100 px-3 py-2">
          <p className="text-xs text-green-700">
            <span className="font-semibold">Method: </span>{record.calculation_method}
          </p>
        </div>
      )}

      {/* Note Input */}
      <textarea
        rows={2}
        placeholder="Decision note (required for revision request)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700
                   focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent resize-none"
      />

      {localError && (
        <p className="text-xs text-red-500">{localError}</p>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleVerify}
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5
                     bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700
                     text-white text-sm font-semibold shadow-md transition-all disabled:opacity-60"
        >
          <CheckCircle2 size={16} />
          Verify
        </button>
        <button
          onClick={handleRevision}
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5
                     border border-gray-300 text-gray-700 hover:bg-gray-50
                     text-sm font-semibold transition-all disabled:opacity-60"
        >
          <RotateCcw size={16} />
          Request Revision
        </button>
      </div>
    </div>
  );
};

export default CarbonVerificationCard;