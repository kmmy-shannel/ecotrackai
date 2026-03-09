import React, { useState } from 'react';
import { X, Navigation, Clock, Leaf, Fuel, Sparkles, MapPin } from 'lucide-react';

const RouteDetailModal = ({ approval, onClose, onDecision, submitting, readOnly }) => {
  const [comments, setComments] = useState('');

  const extra = (() => {
    try { return JSON.parse(approval.extra_data || approval.extraData || '{}'); }
    catch { return {}; }
  })();

  const { savings = {}, originalRoute = {}, optimizedRoute = {}, stops = [], aiRecommendations = [] } = extra;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header — dark green matching admin style */}
        <div className="bg-gradient-to-r from-green-700 to-green-600 text-white p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{approval.product_name}</h2>
              <p className="text-green-200 text-sm mt-0.5">
                {stops.length === 1 ? 'Single Stop Route' : `Multi-Stop Route (${stops.length} stops)`}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Route Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">Route Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div><span className="text-gray-500">Driver:</span> <span className="font-medium">{extra.driver || '—'}</span></div>
              <div><span className="text-gray-500">Vehicle:</span> <span className="font-medium">{extra.vehicleType?.replace('_', ' ') || '—'}</span></div>
            </div>
            <div className="space-y-2">
              {stops.map((stop, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                    stop.type === 'origin' ? 'bg-green-500' :
                    stop.type === 'destination' ? 'bg-red-500' : 'bg-green-700'
                  }`} />
                  <span className="text-gray-700">{stop.location}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Route Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Original Order</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Distance</span><span className="font-semibold">{originalRoute.totalDistance} km</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-semibold">{originalRoute.estimatedDuration} min</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Fuel</span><span className="font-semibold">{originalRoute.fuelConsumption} L</span></div>
                <div className="flex justify-between"><span className="text-gray-500">CO₂</span><span className="font-semibold">{originalRoute.carbonEmissions} kg</span></div>
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-xs font-bold text-green-700 uppercase mb-3 flex items-center gap-1">
                <Sparkles size={10} /> AI Optimized
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Distance</span><span className="font-semibold text-green-700">{optimizedRoute.totalDistance} km</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-semibold text-green-700">{optimizedRoute.estimatedDuration} min</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Fuel</span><span className="font-semibold text-green-700">{optimizedRoute.fuelConsumption} L</span></div>
                <div className="flex justify-between"><span className="text-gray-500">CO₂</span><span className="font-semibold text-green-700">{optimizedRoute.carbonEmissions} kg</span></div>
              </div>
            </div>
          </div>

          {/* Savings */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-bold text-green-700 uppercase mb-2">Total Savings</p>
            <div className="flex gap-4 text-sm text-green-800 font-semibold flex-wrap">
              <span>-{savings.distance} km</span>
              <span>-{savings.fuel} L fuel</span>
              <span>-{savings.emissions} kg CO₂</span>
              <span>-{savings.time} min</span>
            </div>
          </div>

          {/* AI Suggestion */}
          {approval.ai_suggestion && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-purple-600" />
                <p className="text-xs font-bold text-purple-700 uppercase">AI Suggestion</p>
              </div>
              <p className="text-sm text-purple-800 italic">"{approval.ai_suggestion}"</p>
            </div>
          )}

          {/* Comments */}
          {!readOnly && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Comments <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                rows={3}
                placeholder="Comment here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-2xl flex-shrink-0">
          {!readOnly ? (
            <div className="flex gap-3">
              <button
                onClick={() => onDecision(approval.approval_id || approval.id, 'approved', comments)}
                disabled={submitting}
                className="flex-1 py-3 bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-md"
              >
                Accept
              </button>
              <button
                onClick={() => onDecision(approval.approval_id || approval.id, 'declined', comments)}
                disabled={submitting}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Decline
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-xl transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteDetailModal;
