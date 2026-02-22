import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, Trash2, MapPin, Search, Navigation, X, Layers } from 'lucide-react';
import deliveryService from '../services/delivery.service';

// Fix Leaflet default marker icon issue
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

// OpenRouteService API key - REPLACE WITH YOUR OWN
const ORS_API_KEY = '5b3ce3597851110001cf6248YOUR_KEY_HERE';

// Map layer options
const MAP_LAYERS = {
  satellite: {
    name: 'Satellite',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps'
  },
  hybrid: {
    name: 'Hybrid (Satellite + Labels)',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps'
  },
  streets: {
    name: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap'
  },
  esri: {
    name: 'Esri Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri'
  }
};

// Map Click Handler Component
// Map Click Handler Component - FIXED
const MapClickHandler = ({ onLocationSelect, activeStopIndex }) => {
  useMapEvents({
    click: (e) => {
      if (activeStopIndex !== null) {
        console.log('Map clicked at:', e.latlng);
        // FIXED: Pass null for address, then activeStopIndex as third parameter
        onLocationSelect(e.latlng, null, activeStopIndex);
      }
    },
  });
  return null;
};

// Location Search Component
const LocationSearch = ({ onLocationSelect, stopIndex }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const searchLocation = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(query)}&size=5`
      );
      const data = await response.json();
      
      if (data.features) {
        setSearchResults(data.features);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchLocation(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Name location location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
        />
      </div>
      
      {searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {searchResults.map((result, index) => (
            <button
              key={index}
              onClick={() => {
                const [lng, lat] = result.geometry.coordinates;
                onLocationSelect(
                  { lat, lng },
                  result.properties.label,
                  stopIndex
                );
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 text-sm"
            >
              <p className="font-medium text-gray-800">{result.properties.name}</p>
              <p className="text-xs text-gray-500">{result.properties.label}</p>
            </button>
          ))}
        </div>
      )}
      
      {searching && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

// Main Modal Component
const PlanNewDeliveryModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    deliveryDate: new Date().toISOString().split('T')[0],
    driver: '',
    vehicleType: 'van',
    estimatedLoad: ''
  });
  
  const [stops, setStops] = useState([
    { location: '', lat: null, lng: null, type: 'origin', products: [] },
    { location: '', lat: null, lng: null, type: 'destination', products: [] }
  ]);

  const [activeStopIndex, setActiveStopIndex] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [estimatedDistance, setEstimatedDistance] = useState(null);
  const [mapLayer, setMapLayer] = useState('hybrid'); // Default to hybrid
  const [showLayerSelector, setShowLayerSelector] = useState(false);
  const mapRef = useRef(null);

  const vehicleTypes = [
    { value: 'van', label: 'Van' },
    { value: 'refrigerated_truck', label: 'Refrigerated Truck' },
    { value: 'truck', label: 'Truck' },
    { value: 'motorcycle', label: 'Motorcycle' }
  ];

  // Calculate route distance using OpenRouteService
  const calculateRouteDistance = async () => {
    const validStops = stops.filter(s => s.lat && s.lng);
    
    if (validStops.length < 2) {
      setEstimatedDistance(null);
      return;
    }

    try {
      const coordinates = validStops.map(s => [s.lng, s.lat]);
      
      const response = await fetch(
        'https://api.openrouteservice.org/v2/directions/driving-car',
        {
          method: 'POST',
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ coordinates })
        }
      );

      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const distanceKm = (data.routes[0].summary.distance / 1000).toFixed(2);
        const durationMin = Math.round(data.routes[0].summary.duration / 60);
        setEstimatedDistance({ distance: distanceKm, duration: durationMin });
      }
    } catch (error) {
      console.error('Route calculation error:', error);
    }
  };

  useEffect(() => {
    calculateRouteDistance();
  }, [stops]);

  const handleLocationSelect = (latlng, address = null, stopIndex) => {
    console.log('Setting location for stop', stopIndex, ':', latlng);
    const newStops = [...stops];
    newStops[stopIndex] = {
      ...newStops[stopIndex],
      lat: latlng.lat,
      lng: latlng.lng,
      location: address || `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`
    };
    setStops(newStops);
    setActiveStopIndex(null);

    // Fit map to show all markers
    if (mapRef.current) {
      const bounds = newStops
        .filter(s => s.lat && s.lng)
        .map(s => [s.lat, s.lng]);
      
      if (bounds.length > 0) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  };

  const addStop = () => {
    const newStops = [...stops];
    newStops.splice(stops.length - 1, 0, {
      location: '',
      lat: null,
      lng: null,
      type: 'stop',
      products: []
    });
    setStops(newStops);
  };

  const removeStop = (index) => {
    if (stops.length <= 2) return;
    const newStops = stops.filter((_, i) => i !== index);
    setStops(newStops);
  };

  const updateStop = (index, field, value) => {
    const newStops = [...stops];
    newStops[index][field] = value;
    setStops(newStops);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.driver.trim()) {
      newErrors.driver = 'Driver name is required';
    }
    
    if (!formData.estimatedLoad || formData.estimatedLoad <= 0) {
      newErrors.estimatedLoad = 'Valid load weight is required';
    }

    stops.forEach((stop, index) => {
      if (!stop.location.trim() || !stop.lat || !stop.lng) {
        newErrors[`stop_${index}`] = 'Please select location on map or search';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const deliveryData = {
  deliveryDate: formData.deliveryDate,
  driver: formData.driver.trim(),
  vehicleType: formData.vehicleType,
  estimatedLoad: formData.estimatedLoad,
  stops: stops.map(s => ({
    location: s.location,
    lat: s.lat,
    lng: s.lng,
    type: s.type,
    products: s.products
  })),
  totalDistance: estimatedDistance?.distance,
  estimatedDuration: estimatedDistance?.duration
};
      
      await deliveryService.createDelivery(deliveryData);
      onSuccess();
    } catch (error) {
      console.error('Create delivery error:', error);
      setErrors({ submit: error.response?.data?.message || 'Failed to create delivery' });
    } finally {
      setLoading(false);
    }
  };

  const getMarkerIcon = (type) => {
    if (type === 'origin') return originIcon;
    if (type === 'destination') return destinationIcon;
    return stopIcon;
  };

  // Default map center (Philippines - Pangasinan area)
  const defaultCenter = [15.8949, 120.2863]; // Centered on Pangasinan

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Plus size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Plan New Delivery</h3>
                <p className="text-green-100 text-sm">Create route with map-based location selection</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Form */}
          <div className="w-2/5 border-r border-gray-200 overflow-y-auto p-6 space-y-6">
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {errors.submit}
              </div>
            )}

            {/* Delivery Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Delivery Information</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date *</label>
                <input 
                  type="date" 
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name *</label>
                <input 
                  type="text" 
                  placeholder="Enter driver name" 
                  value={formData.driver}
                  onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${
                    errors.driver ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.driver && <p className="text-red-500 text-xs mt-1">{errors.driver}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  >
                    {vehicleTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Load (kg) *</label>
                  <input 
                    type="number" 
                    placeholder="500" 
                    value={formData.estimatedLoad}
                    onChange={(e) => setFormData({ ...formData, estimatedLoad: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${
                      errors.estimatedLoad ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.estimatedLoad && <p className="text-red-500 text-xs mt-1">{errors.estimatedLoad}</p>}
                </div>
              </div>
            </div>

            {/* Route Stops */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Route Stops</h4>
                <button
                  onClick={addStop}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
                >
                  <Plus size={14} />
                  Add Stop
                </button>
              </div>

              <div className="space-y-2">
                {stops.map((stop, index) => (
                  <div key={index} className={`border-2 rounded-lg p-3 transition-all ${
                    activeStopIndex === index ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        stop.type === 'origin' ? 'bg-green-500' : 
                        stop.type === 'destination' ? 'bg-red-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="text-xs font-semibold text-gray-700">
                        {stop.type === 'origin' ? 'Origin' : 
                         stop.type === 'destination' ? 'Destination' : `Stop ${index -1}`}
                      </span>
                      {stop.type === 'stop' && (
                        <button
                          onClick={() => removeStop(index)}
                          className="ml-auto text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <LocationSearch 
                      onLocationSelect={handleLocationSelect}
                      stopIndex={index}
                    />

                    <button
                      onClick={() => setActiveStopIndex(activeStopIndex === index ? null : index)}
                      className={`w-full mt-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        activeStopIndex === index
                          ? 'bg-green-500 text-white shadow-md animate-pulse'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <MapPin size={14} className="inline mr-1" />
                      {activeStopIndex === index ? '👆 Click map to set location' : 'Select on map'}
                    </button>

                    {stop.lat && stop.lng && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-xs text-green-800 font-medium">✓ Location set</p>
                        <p className="text-xs text-gray-600 truncate">{stop.location}</p>
                      </div>
                    )}
                    {errors[`stop_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`stop_${index}`]}</p>
                    )}

                    {stop.type !== 'origin' && (
                      <input
                        type="text"
                        placeholder="Products (optional)"
                        value={stop.products.join(', ')}
                        onChange={(e) => updateStop(index, 'products', e.target.value.split(',').map(p => p.trim()))}
                        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-xs"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Estimated Distance */}
            {estimatedDistance && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-3 text-sm">
                  <Navigation size={18} className="text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-800">Estimated Route</p>
                    <p className="text-blue-600 text-xs">
                      {estimatedDistance.distance} km • {estimatedDistance.duration} min
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Map */}
          <div className="w-3/5 relative">
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

            {showMap && (
              <MapContainer
                center={defaultCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
              >
                <TileLayer
                  url={MAP_LAYERS[mapLayer].url}
                  attribution={MAP_LAYERS[mapLayer].attribution}
                  maxZoom={20}
                />
                
                <MapClickHandler 
                  onLocationSelect={handleLocationSelect}
                  activeStopIndex={activeStopIndex}
                />

                {stops.map((stop, index) => 
                  stop.lat && stop.lng ? (
                    <Marker 
                      key={index} 
                      position={[stop.lat, stop.lng]}
                      icon={getMarkerIcon(stop.type)}
                    >
                      <Popup>
                        <div className="text-xs">
                          <p className="font-semibold">{stop.type.toUpperCase()}</p>
                          <p className="text-gray-600">{stop.location}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null
                )}
              </MapContainer>
            )}

            {activeStopIndex !== null && (
              <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl text-sm font-medium animate-bounce">
                👆 Click anywhere on the map to set Stop {activeStopIndex + 1} location
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-2xl flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium text-gray-700 disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus size={18} />
                Create Delivery
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanNewDeliveryModal;