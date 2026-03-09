import React, { useState } from 'react';
import { Save, AlertCircle, Leaf } from 'lucide-react';

const EcoTrustConfig = ({ config = [], onUpdate, onLoad }) => {
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleEdit = (action) => {
    setEditing({ ...action });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!window.confirm('Update this EcoTrust action? This affects all businesses.')) return;
    setSubmitting(true);
    await onUpdate?.(editing.action_id, {
      action_name:     editing.action_name,
      action_category: editing.action_category,
      points_value:    editing.points_value,
      description:     editing.description,
    });
    setSubmitting(false);
    setEditing(null);
  };

  const categoryColors = {
    spoilage_prevention: 'bg-orange-100 text-orange-700',
    delivery_optimization: 'bg-blue-100 text-blue-700',
    carbon_verification: 'bg-green-100 text-green-700',
    other: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex gap-3">
        <AlertCircle size={18} className="text-yellow-700 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-700">
          <strong>Caution:</strong> Changes affect EcoTrust point values for all businesses platform-wide.
          These values determine how many points businesses earn per sustainable action.
        </p>
      </div>

      {config.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 text-center">
          <Leaf size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm font-medium">No EcoTrust actions configured</p>
          <button
            onClick={onLoad}
            className="mt-4 px-4 py-2 bg-green-800 text-white rounded-xl text-sm font-semibold hover:bg-green-900"
          >
            Load Config
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-white to-gray-50 border-b border-gray-100 flex items-center gap-2">
            <Leaf size={18} className="text-green-800" />
            <h3 className="font-semibold text-gray-800">ECOTRUST POINT ACTIONS</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {config.map(action => (
              <div key={action.action_id} className="p-5 hover:bg-gray-50 transition-colors">
                {editing?.action_id === action.action_id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Action Name</label>
                        <input
                          value={editing.action_name}
                          onChange={e => setEditing({...editing, action_name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Points Value</label>
                        <input
                          type="number" min="0"
                          value={editing.points_value}
                          onChange={e => setEditing({...editing, points_value: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                        <select
                          value={editing.action_category}
                          onChange={e => setEditing({...editing, action_category: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="spoilage_prevention">Spoilage Prevention</option>
                          <option value="delivery_optimization">Delivery Optimization</option>
                          <option value="carbon_verification">Carbon Verification</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <input
                          value={editing.description || ''}
                          onChange={e => setEditing({...editing, description: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave} disabled={submitting}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-800 text-white rounded-xl text-sm font-semibold hover:bg-green-900 disabled:opacity-50"
                      >
                        <Save size={14} /> {submitting ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <p className="text-green-800 font-bold text-sm">+{action.points_value}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{action.action_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            categoryColors[action.action_category] || categoryColors.other
                          }`}>
                            {action.action_category?.replace(/_/g, ' ')}
                          </span>
                          {action.description && (
                            <span className="text-xs text-gray-400">{action.description}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEdit(action)}
                      className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium"
                    >
                      Edit Points
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EcoTrustConfig;