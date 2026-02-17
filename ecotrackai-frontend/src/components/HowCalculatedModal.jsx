import React from 'react';
import { X, Zap, Fuel, Leaf, Calculator, Truck, Info } from 'lucide-react';

const HowCalculatedModal = ({ onClose, currentData }) => {
  const steps = [
    {
      step: 1,
      icon: <Truck size={20} />,
      title: 'Delivery Distance Tracked',
      description: 'Each delivery route records the total kilometers traveled from origin to all stops to destination.',
      formula: 'Total Distance = Sum of all stop-to-stop distances (km)',
      color: 'blue',
      example: `${currentData?.distanceTraveled?.toFixed(1) || '0.0'} km tracked this month`
    },
    {
      step: 2,
      icon: <Fuel size={20} />,
      title: 'Fuel Consumption Estimated',
      description: 'Fuel usage is calculated based on vehicle type and distance traveled using industry-standard consumption rates.',
      formula: 'Fuel (L) = Distance (km) ÷ 100 × Consumption Rate (L/100km)',
      color: 'orange',
      example: `${currentData?.litersOfFuelUsed?.toFixed(1) || '0.0'} liters consumed this month`,
      rates: [
        { vehicle: 'Small Van', rate: '8.5 L/100km' },
        { vehicle: 'Medium Truck', rate: '12.0 L/100km' },
        { vehicle: 'Large Truck', rate: '18.0 L/100km' },
        { vehicle: 'Motorcycle', rate: '3.5 L/100km' },
      ]
    },
    {
      step: 3,
      icon: <Zap size={20} />,
      title: 'CO₂ Emissions Calculated',
      description: 'Carbon emissions are derived from fuel consumption using the standard gasoline emission factor.',
      formula: 'CO₂ (kg) = Fuel Used (L) × 2.31 kg CO₂/liter',
      color: 'green',
      example: `${currentData?.totalEmissions?.toFixed(2) || '0.00'} kg CO₂ this month`
    },
    {
      step: 4,
      icon: <Leaf size={20} />,
      title: 'AI-Powered Insights',
      description: 'Our DeepSeek AI analyzes your delivery patterns and compares against previous months to generate optimization recommendations.',
      formula: 'Monthly Change (%) = ((This Month − Last Month) ÷ Last Month) × 100',
      color: 'emerald',
      example: 'AI compares trends and suggests route improvements'
    }
  ];

  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'bg-blue-100 text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
      step: 'bg-blue-600'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'bg-orange-100 text-orange-600',
      badge: 'bg-orange-100 text-orange-700',
      step: 'bg-orange-500'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'bg-green-100 text-green-600',
      badge: 'bg-green-100 text-green-700',
      step: 'bg-green-600'
    },
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'bg-emerald-100 text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-700',
      step: 'bg-emerald-600'
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#1a4d2e] to-emerald-700 text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Calculator size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold">How It's Calculated</h3>
                <p className="text-emerald-100 text-sm">Carbon footprint methodology</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">

          {/* Intro */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <Info size={18} className="text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Your carbon footprint is automatically calculated from your delivery data
              using industry-standard emission factors. No manual input required.
            </p>
          </div>

          {/* Steps */}
          {steps.map((s, idx) => {
            const c = colorMap[s.color];
            return (
              <div key={idx} className={`rounded-xl border ${c.border} ${c.bg} p-5`}>
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className={`w-7 h-7 ${c.step} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                      {s.step}
                    </div>
                    <div className={`w-9 h-9 ${c.icon} rounded-lg flex items-center justify-center`}>
                      {s.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 mb-1">{s.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{s.description}</p>

                    {/* Formula */}
                    <div className="bg-white rounded-lg px-4 py-2 border border-gray-200 mb-3 font-mono text-xs text-gray-700">
                      {s.formula}
                    </div>

                    {/* Vehicle rates table */}
                    {s.rates && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {s.rates.map((r, i) => (
                          <div key={i} className="bg-white rounded-lg px-3 py-2 border border-gray-200 flex justify-between text-xs">
                            <span className="text-gray-600">{r.vehicle}</span>
                            <span className="font-semibold text-gray-800">{r.rate}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Live example */}
                    <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium ${c.badge}`}>
                      <Leaf size={11} />
                      {s.example}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Emission factor source */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Emission factor: <strong>2.31 kg CO₂ per liter</strong> of gasoline
              — based on IPCC & US EPA standards. AI analysis powered by{' '}
              <strong>DeepSeek-R1</strong> via Ollama.
            </p>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#1a4d2e] hover:bg-emerald-800 text-white rounded-xl font-semibold transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowCalculatedModal;