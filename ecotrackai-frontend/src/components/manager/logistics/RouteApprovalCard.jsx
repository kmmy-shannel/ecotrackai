import React from 'react';
import { MapPin, Navigation, Clock, Leaf, Fuel, Sparkles, Eye } from 'lucide-react';

const RouteApprovalCard = ({ approval, onViewDetails, onApprove, onDecline, submitting, readOnly }) => {
  const extra = (() => {
    try { return JSON.parse(approval.extra_data || approval.extraData || '{}'); }
    catch { return {}; }
  })();

  const savings   = extra.savings        || {};
  const original  = extra.originalRoute  || {};
  const optimized = extra.optimizedRoute || {};
  const stops     = extra.stops          || [];

  const priorityColors = {
    HIGH:   'border-l-red-500',
    MEDIUM: 'border-l-orange-400',
    LOW:    'border-l-blue-400',
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${priorityColors[approval.priority] || 'border-l-gray-300'} overflow-hidden`}>

      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-bold text-gray-800 text-sm">
              {approval.product_name} — {stops.length === 1 ? 'SINGLE STOP' : `MULTI STOP (${stops.length} STOPS)`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {stops[0]?.location?.split(',')[0]} → {stops[stops.length - 1]?.location?.split(',')[0]}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            approval.priority === 'HIGH'   ? 'bg-red-100 text-red-700' :
            approval.priority === 'MEDIUM' ? 'bg-orange-100 text-orange-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {approval.priority}
          </span>
        </div>

        <p className="text-xs text-gray-400">
          Driver: {extra.driver || '—'} · {extra.vehicleType?.replace('_', ' ') || '—'}
        </p>
      </div>

      {/* Route Comparison */}
      <div className="mx-5 mb-4 grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">ORIGINAL</p>
          <div className="space-y-1 text-xs text-gray-700">
            <div className="flex items-center gap-1"><Navigation size={11} className="text-gray-400" /> {original.totalDistance} km</div>
            <div className="flex items-center gap-1"><Clock size={11} className="text-gray-400" /> {original.estimatedDuration} min</div>
            <div className="flex items-center gap-1"><Leaf size={11} className="text-gray-400" /> {original.carbonEmissions} kg CO₂</div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-3 border border-green-100">
          <p className="text-xs font-semibold text-green-600 mb-2 flex items-center gap-1"><Sparkles size={10} /> AI OPTIMIZED</p>
          <div className="space-y-1 text-xs text-green-800">
            <div className="flex items-center gap-1"><Navigation size={11} /> {optimized.totalDistance} km</div>
            <div className="flex items-center gap-1"><Clock size={11} /> {optimized.estimatedDuration} min</div>
            <div className="flex items-center gap-1"><Leaf size={11} /> {optimized.carbonEmissions} kg CO₂</div>
          </div>
        </div>
      </div>

      {/* Savings */}
      {savings.distance && (
        <div className="mx-5 mb-4 flex items-center gap-3 text-xs">
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
            -{savings.distance} km
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
            -{savings.fuel} L fuel
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
            -{savings.emissions} kg CO₂
          </span>
        </div>
      )}

      {/* Submitted by */}
      <div className="px-5 pb-4">
        <p className="text-xs text-gray-400 mb-3">Submitted by: <span className="font-medium text-gray-600">Admin</span></p>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => onViewDetails(approval)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors">
            <Eye size={13} /> View Details
          </button>
          {!readOnly && (
            <>
              <button onClick={() => onApprove(approval.approval_id || approval.id)} disabled={submitting}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                Approve
              </button>
              <button onClick={() => onDecline(approval.approval_id || approval.id)} disabled={submitting}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                Decline
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteApprovalCard; 
