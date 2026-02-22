import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Layout from '../../components/Layout';
import authService from '../../services/auth.service';
import PlanNewDeliveryModal from '../../components/PlanNewDeliveryModal';
import { GeoJSON } from 'react-leaflet';
import { 
  Plus, Search, Trash2, MapPin, Navigation, 
  Sparkles, TrendingDown, Clock, Fuel, Leaf,
  ChevronDown, ChevronUp, Route, Package, Layers, X
} from 'lucide-react';

// ADD THIS IMPORT
import useDelivery from '../../hooks/useDelivery';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const originIcon = createCustomIcon('green');
const stopIcon = createCustomIcon('blue');
const destinationIcon = createCustomIcon('red');

// Map layers
const MAP_LAYERS = {
  hybrid: {
    name: 'Hybrid (Satellite + Labels)',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps'
  },
  satellite: {
    name: 'Satellite',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps'
  },
  streets: {
    name: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap'
  }
};

const DeliveryRoutesPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // ✅ REPLACE all useState and functions with this hook
  const {
    deliveries,
    loading,
    error,
    success,
    searchTerm,
    showAddModal,
    expandedDelivery,
    optimizingRoute,
    optimizationResult,
    showOptimizationModal,
    summaryStats,
    setSearchTerm,
    setShowAddModal,
    setExpandedDelivery,
    deleteDelivery,
    optimizeRoute,
    applyOptimization,
    handleDeliveryCreated,
    closeOptimizationModal,
    getStatusBadge
  } = useDelivery();

  // Auth check on mount (KEEP THIS - unchanged)
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  const getVehicleIcon = (type) => {
    return <Package size={16} />;
  };

  if (!user) return null;

  return (
    <Layout currentPage="Delivery Routes" user={user}>
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 w-full max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search delivery or driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          <span className="font-medium">Plan new delivery</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Today's Deliveries"
          value={summaryStats.totalDeliveries}
          subtitle={`${summaryStats.inProgress} in progress`}
          icon={<Route />}
          color="blue"
        />
        <SummaryCard
          title="Total Distance"
          value={`${summaryStats.totalDistance} km`}
          subtitle="Today"
          icon={<Navigation />}
          color="purple"
        />
        <SummaryCard
          title="Fuel Saved"
          value={`${summaryStats.fuelSaved} L`}
          subtitle="vs unoptimized"
          icon={<Fuel />}
          color="green"
          trend="down"
        />
        <SummaryCard
          title="CO₂ Reduced"
          value={`${summaryStats.co2Reduced} kg`}
          subtitle="This week"
          icon={<Leaf />}
          color="emerald"
          trend="down"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Delivery</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Route</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Metrics</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-gray-500">
                    Loading deliveries...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Route size={32} className="text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium mb-1">No deliveries found</p>
                      <p className="text-sm text-gray-400">Plan your first delivery route</p>
                    </div>
                  </td>
                </tr>
              ) : (
                deliveries.map((delivery) => (
                  <React.Fragment key={delivery.id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            {getVehicleIcon(delivery.vehicleType)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{delivery.deliveryCode}</p>
                            <p className="text-sm text-gray-500">{delivery.driver}</p>
                            <p className="text-xs text-gray-400">{delivery.date}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-700">{delivery.stops?.length || 0} stops</span>
                        </div>
                        {delivery.stops?.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {delivery.stops[0]?.location?.split(',')[0]} → {delivery.stops[delivery.stops.length - 1]?.location?.split(',')[0]}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Navigation size={14} className="text-blue-500" />
                            <span>{delivery.totalDistance} km</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Clock size={14} className="text-purple-500" />
                            <span>{delivery.estimatedDuration} min</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Leaf size={14} className="text-green-500" />
                            <span>{delivery.carbonEmissions} kg CO₂</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(delivery.status)}`}>
                          {delivery.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setExpandedDelivery(expandedDelivery === delivery.id ? null : delivery.id)}
                            className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                            title="View Details"
                          >
                            {expandedDelivery === delivery.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                          <button
                            onClick={() => optimizeRoute(delivery)}
                            disabled={optimizingRoute === delivery.id}
                            className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="AI Route Optimization"
                          >
                            <Sparkles 
                              size={18} 
                              className={optimizingRoute === delivery.id ? 'animate-spin' : ''} 
                            />
                          </button>
                          <button
                            onClick={() => deleteDelivery(delivery.id)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Delete Delivery"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedDelivery === delivery.id && (
                      <tr className="bg-gray-50">
                        <td colSpan="5" className="px-6 py-4">
                          <DeliveryDetails delivery={delivery} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showOptimizationModal && optimizationResult && (
        <OptimizationModal
          result={optimizationResult}
          onClose={closeOptimizationModal}
          onApply={applyOptimization}
        />
      )}

      {showAddModal && (
        <PlanNewDeliveryModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleDeliveryCreated}
        />
      )}
    </Layout>
  );
};

// Summary Card Component
const SummaryCard = ({ title, value, subtitle, icon, color, trend }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    emerald: 'from-emerald-500 to-emerald-600'
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          {React.cloneElement(icon, { size: 20, className: 'text-white' })}
        </div>
        {trend === 'down' && (
          <TrendingDown size={16} className="text-green-500" />
        )}
      </div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</h4>
      <p className="text-2xl font-bold text-gray-800 mb-1">{value}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  );
};

// Delivery Details Component
const DeliveryDetails = ({ delivery }) => {
  return (
    <div className="bg-white rounded-lg p-4 space-y-4">
      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <MapPin size={18} className="text-blue-500" />
          Route Stops
        </h4>
        <div className="space-y-2">
          {delivery.stops?.map((stop, index) => (
            <div key={index} className="flex items-start gap-3 pl-4">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${
                  stop.type === 'origin' ? 'bg-green-500' : 
                  stop.type === 'destination' ? 'bg-red-500' : 
                  'bg-blue-500'
                }`} />
                {index < delivery.stops.length - 1 && (
                  <div className="w-0.5 h-8 bg-gray-300" />
                )}
              </div>
              <div className="flex-1 pb-2">
                <p className="font-medium text-gray-700">{stop.location}</p>
                {stop.products?.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Products: {stop.products.join(', ')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500 mb-1">Vehicle</p>
          <p className="text-sm font-semibold text-gray-800">{delivery.vehicleType?.replace('_', ' ')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Fuel</p>
          <p className="text-sm font-semibold text-gray-800">{delivery.fuelConsumption} L</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Distance</p>
          <p className="text-sm font-semibold text-gray-800">{delivery.totalDistance} km</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Duration</p>
          <p className="text-sm font-semibold text-gray-800">{delivery.estimatedDuration} min</p>
        </div>
      </div>
    </div>
  );
};

// Enhanced Route Visualization Map Component
const RouteVisualizationMap = ({ originalRoute, optimizedRoute }) => {
  const [mapLayer, setMapLayer] = useState('hybrid');
  const [showLayerSelector, setShowLayerSelector] = useState(false);

  // Get all stops coordinates for map bounds
  const allStops = originalRoute.stops || [];
  const bounds = allStops.length > 0 
    ? allStops.map(stop => [stop.lat, stop.lng])
    : [[14.5995, 120.9842]];

  const getMarkerIcon = (type) => {
    if (type === 'origin') return originIcon;
    if (type === 'destination') return destinationIcon;
    return stopIcon;
  };

  return (
    <div className="relative h-96 rounded-lg overflow-hidden border-2 border-gray-200">
      {/* Map Layer Selector */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div className="relative">
          <button
            onClick={() => setShowLayerSelector(!showLayerSelector)}
            className="bg-white px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-300 flex items-center gap-2 text-sm font-medium"
          >
            <Layers size={16} />
            {MAP_LAYERS[mapLayer].name}
          </button>
          
          {showLayerSelector && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[200px]">
              {Object.entries(MAP_LAYERS).map(([key, layer]) => (
                <button
                  key={key}
                  onClick={() => {
                    setMapLayer(key);
                    setShowLayerSelector(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                    mapLayer === key ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {layer.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <MapContainer
        bounds={bounds}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url={MAP_LAYERS[mapLayer].url}
          attribution={MAP_LAYERS[mapLayer].attribution}
          maxZoom={20}
        />

        {/* Original Route - Real Road Geometry */}
        {originalRoute.routeGeometry && (
          <GeoJSON
            data={originalRoute.routeGeometry}
            style={{
              color: '#3b82f6',
              weight: 3,
              opacity: 0.6,
              dashArray: '10, 10'
            }}
          />
        )}

        {/* Optimized Route - Real Road Geometry */}
        {optimizedRoute.routeGeometry && (
          <GeoJSON
            data={optimizedRoute.routeGeometry}
            style={{
              color: '#10b981',
              weight: 4,
              opacity: 0.8
            }}
          />
        )}

        {/* Markers */}
        {allStops.map((stop, index) => (
          <Marker
            key={index}
            position={[stop.lat, stop.lng]}
            icon={getMarkerIcon(stop.type)}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{stop.type?.toUpperCase()}</p>
                <p className="text-gray-600">{stop.location}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

// Optimization Modal Component
const OptimizationModal = ({ result, onClose, onApply }) => {
  const { originalRoute, optimizedRoute, savings, aiRecommendations } = result;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">AI Route Optimization</h3>
                <p className="text-purple-100 text-sm">Analysis for {originalRoute.deliveryCode}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Savings Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <SavingCard label="Distance" value={`${savings.distance} km`} icon={<Navigation />} />
  <SavingCard label="Time" value={`${savings.time} min`} icon={<Clock />} />
  <SavingCard label="Fuel" value={`${savings.fuel} L`} icon={<Fuel />} />
  <SavingCard label="Emissions" value={`${savings.emissions} kg`} icon={<Leaf />} />
</div>

          {/* Route Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            <RouteComparison title="Current Route" route={originalRoute} isOptimized={false} />
            <RouteComparison title="Optimized Route" route={optimizedRoute} isOptimized={true} />
          </div>

          {/* Route Visualization with Improved Map */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-blue-500" />
              Route Visualization
            </h4>
            <RouteVisualizationMap 
              originalRoute={originalRoute}
              optimizedRoute={optimizedRoute}
            />
            <div className="mt-3 flex items-center gap-6 text-sm bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-blue-500 opacity-60 border-t-2 border-dashed border-blue-500"></div>
                <span className="text-gray-600 font-medium">Current Route</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-green-500 rounded"></div>
                <span className="text-gray-600 font-medium">Optimized Route</span>
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-6 border border-purple-200">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-purple-600" />
              AI Recommendations
            </h4>
            <ul className="space-y-2">
              {aiRecommendations?.map((rec, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={onApply}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
            >
              Apply Optimization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SavingCard = ({ label, value, icon }) => {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
      <div className="flex justify-center mb-2 text-green-600">
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <p className="text-xs text-green-700 font-medium mb-1">{label} Saved</p>
      <p className="text-lg font-bold text-green-800">{value}</p>
    </div>
  );
};

const RouteComparison = ({ title, route, isOptimized }) => {
  return (
    <div className={`rounded-xl p-5 border-2 ${isOptimized ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}>
      <h4 className="font-semibold text-gray-800 mb-4">{title}</h4>
      <div className="space-y-3 mb-4">
        <MetricRow label="Distance" value={`${route.totalDistance} km`} />
        <MetricRow label="Duration" value={`${route.estimatedDuration} min`} />
        <MetricRow label="Fuel" value={`${route.fuelConsumption} L`} />
        <MetricRow label="CO₂" value={`${route.carbonEmissions} kg`} />
      </div>
      <div className="space-y-1.5">
        {route.stops.map((stop, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              stop.type === 'origin' ? 'bg-green-500' : 
              stop.type === 'destination' ? 'bg-red-500' : 
              'bg-blue-500'
            }`} />
            <span className="text-gray-700 truncate">{stop.location.split(',')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MetricRow = ({ label, value }) => {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}:</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
};

export default DeliveryRoutesPage;