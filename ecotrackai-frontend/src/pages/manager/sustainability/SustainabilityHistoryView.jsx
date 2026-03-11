import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const SustainabilityHistoryView = ({ history = [], loading = false }) => (
  <div className="space-y-4">
    {loading && (
      <p className="text-gray-400 text-sm">Loading history...</p>
    )}

    {!loading && history.length === 0 && (
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
        <CheckCircle size={36} className="mx-auto mb-3 text-gray-300" />
        <p className="font-semibold text-gray-500">No verification history yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Verified carbon records will appear here
        </p>
      </div>
    )}

    {history.map((record, i) => {
      const isVerified = record.verification_status === 'verified';
      const isRevision = record.verification_status === 'revision_requested';

      return (
        <div
          key={record.record_id || i}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {record.route_name || `Delivery #${record.route_id || '—'}`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {record.vehicle_type || '—'} ·{' '}
                {record.created_at
                  ? new Date(record.created_at).toLocaleDateString()
                  : '—'}
              </p>
            </div>

            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              isVerified
                ? 'bg-green-100 text-green-700'
                : isRevision
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {isVerified
                ? <><CheckCircle size={12} /> Verified</>
                : isRevision
                ? <><XCircle size={12} /> Revision Requested</>
                : record.verification_status}
            </span>
          </div>

          {/* Carbon details */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400 mb-0.5">Total CO₂</p>
              <p className="font-semibold text-gray-700">
                {record.total_carbon_kg ?? '—'} kg
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400 mb-0.5">Transport CO₂</p>
              <p className="font-semibold text-gray-700">
                {record.transportation_carbon_kg ?? '—'} kg
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400 mb-0.5">Storage CO₂</p>
              <p className="font-semibold text-gray-700">
                {record.storage_carbon_kg ?? '—'} kg
              </p>
            </div>
          </div>

          {/* Revision notes if any */}
          {record.revision_notes && (
            <p className="text-xs text-gray-400 italic border-t border-gray-100 pt-2">
              Note: {record.revision_notes}
            </p>
          )}
        </div>
      );
    })}
  </div>
);

export default SustainabilityHistoryView;