import React from 'react';

const StatCard = ({ label, value, icon: Icon, accent }) => (
  <div className={`rounded-xl p-5 border shadow-sm ${
    accent
      ? 'bg-red-50 border-red-200'
      : 'bg-white border-gray-100'
  }`}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      {Icon && (
        <Icon size={16} className={accent ? 'text-red-400' : 'text-gray-300'} />
      )}
    </div>
    <p className={`text-3xl font-bold ${accent ? 'text-red-600' : 'text-gray-800'}`}>
      {value}
    </p>
  </div>
);

export default StatCard;