import React from 'react';
import { X, AlertTriangle, CheckCircle, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';

const AIAnalysisModal = ({ analysis, productName, onClose }) => {
  if (!analysis) return null;

  const getRiskColor = (riskLevel) => {
    const colors = {
      LOW: 'text-green-600 bg-green-50 border-green-200',
      MEDIUM: 'text-orange-600 bg-orange-50 border-orange-200',
      HIGH: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[riskLevel] || colors.MEDIUM;
  };

  const getRiskIcon = (riskLevel) => {
    const icons = {
      LOW: <CheckCircle size={24} />,
      MEDIUM: <AlertCircle size={24} />,
      HIGH: <AlertTriangle size={24} />
    };
    return icons[riskLevel] || icons.MEDIUM;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-purple-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">AI Spoilage Analysis</h2>
              <p className="text-sm text-gray-600">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Risk Level */}
          <div className={`border-2 rounded-xl p-6 ${getRiskColor(analysis.riskLevel)}`}>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {getRiskIcon(analysis.riskLevel)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold">Risk Level: {analysis.riskLevel}</h3>
                  <span className="text-2xl font-bold">{analysis.riskScore}/100</span>
                </div>
                <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-current" 
                    style={{ width: `${analysis.riskScore}%` }}
                  ></div>
                </div>
                <p className="mt-2 text-sm font-semibold">Urgency: {analysis.urgency}</p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600" />
              AI Recommendations
            </h3>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-sm font-bold">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700">{rec}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Timeline */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <h4 className="font-semibold text-gray-800 mb-2">📅 Optimal Usage Timeline</h4>
            <p className="text-sm text-gray-700">{analysis.optimalUsageTimeline}</p>
          </div>

          {/* Financial Impact */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <DollarSign size={18} />
              Financial Impact
            </h4>
            <p className="text-2xl font-bold text-orange-600">${analysis.estimatedWasteValue}</p>
            <p className="text-xs text-gray-600 mt-1">Estimated waste value if not addressed</p>
          </div>

          {/* AI Reasoning */}
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <h4 className="font-semibold text-gray-800 mb-2">🤖 AI Reasoning</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{analysis.reasoning}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisModal;