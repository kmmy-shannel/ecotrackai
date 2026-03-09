import React, { useState } from 'react';
import { Leaf, Fuel, Navigation, CheckCircle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

const CarbonVerificationCard = ({ record, onVerify, onRequestRevision }) => {
  const [open,          setOpen]     = useState(false);
  const [notes,         setNotes]    = useState('');
  const [revisioning,   setRev]      = useState(false);
  const [busy,          setBusy]     = useState(false);

  // related_record_id is the carbon_footprint_records.record_id
  // This is what PATCH /api/carbon/:id/verify expects
  const carbonRecordId = record.related_record_id || record.record_id;

  const fmt = (v, dp = 2) => Number(v || 0).toFixed(dp);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

      {/* Card header */}
      <div
        className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <Leaf size={18} className="text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {record.record_type || 'Delivery Carbon Record'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {record.total_carbon_kg ? `${fmt(record.total_carbon_kg)} kg CO₂` : '—'} ·{' '}
              {record.actual_distance_km ? `${fmt(record.actual_distance_km)} km actual` : '—'}
            </p>
            <p className="text-xs text-gray-400">
              Submitted {record.created_at ? new Date(record.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
            Pending
          </span>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4">

          {/* Carbon metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Estimated</p>
              <div className="space-y-1 text-xs text-gray-700">
                <div className="flex items-center gap-1.5">
                  <Navigation size={11} className="text-gray-400" />
                  {fmt(record.planned_distance)} km planned
                </div>
                <div className="flex items-center gap-1.5">
                  <Fuel size={11} className="text-gray-400" />
                  {fmt(record.planned_fuel)} L estimated
                </div>
                <div className="flex items-center gap-1.5">
                  <Leaf size={11} className="text-gray-400" />
                  {fmt(record.estimated_carbon_kg)} kg CO₂ est.
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
              <p className="text-xs font-semibold text-green-600 uppercase mb-2">Actual</p>
              <div className="space-y-1 text-xs text-green-800">
                <div className="flex items-center gap-1.5">
                  <Navigation size={11} />
                  {fmt(record.actual_distance_km)} km driven
                </div>
                <div className="flex items-center gap-1.5">
                  <Fuel size={11} />
                  {fmt(record.actual_fuel_liters)} L used
                </div>
                <div className="flex items-center gap-1.5">
                  <Leaf size={11} />
                  {fmt(record.total_carbon_kg)} kg CO₂ actual
                </div>
              </div>
            </div>
          </div>

          {/* Calculation method */}
          {record.calculation_method && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
              Method: <span className="font-semibold">{record.calculation_method}</span>
            </div>
          )}

          {/* Notes field */}
          <div>
            <label className="text-xs font-medium text-gray-600">
              {revisioning ? 'Reason for revision request (required)' : 'Verification notes (optional)'}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder={revisioning
                ? 'Explain what needs to be corrected…'
                : 'Any notes for this verification…'}
              className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Action buttons */}
          {!revisioning ? (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setBusy(true);
                  await onVerify(carbonRecordId, notes);
                  setBusy(false);
                }}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                <CheckCircle size={15} />
                {busy ? 'Verifying…' : 'Verify'}
              </button>
              <button
                onClick={() => setRev(true)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-orange-300 hover:bg-orange-50 text-orange-600 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <RotateCcw size={15} />
                Request Revision
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!notes.trim()) return;
                  setBusy(true);
                  await onRequestRevision(carbonRecordId, notes);
                  setBusy(false);
                }}
                disabled={busy || !notes.trim()}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {busy ? 'Sending…' : 'Confirm Revision Request'}
              </button>
              <button
                onClick={() => { setRev(false); setNotes(''); }}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CarbonVerificationCard;