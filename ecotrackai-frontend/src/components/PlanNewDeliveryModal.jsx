import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, Trash2, MapPin, Search, Navigation, X, Layers, Truck, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import deliveryService from '../services/delivery.service';
import inventoryService from '../services/inventory.service';

// ── Leaflet icon fix ──────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (color) => new L.Icon({
  iconUrl:   `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const originIcon      = createCustomIcon('green');
const stopIcon        = createCustomIcon('blue');
const destinationIcon = createCustomIcon('red');

// ── Dagupan City, Pangasinan ──────────────────────────────────────────────────
const DAGUPAN_CENTER = [16.0433, 120.3339];
const DAGUPAN_BOUNDS = [[15.98, 120.27], [16.11, 120.41]];
const DAGUPAN_ZOOM   = 14;

const isWithinDagupan = (lat, lng) =>
  lat >= 15.98 && lat <= 16.11 && lng >= 120.27 && lng <= 120.41;

const MAP_LAYERS = {
  hybrid:    { name: 'Hybrid',    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', attribution: '© Google' },
  satellite: { name: 'Satellite', url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attribution: '© Google' },
  streets:   { name: 'Streets',   url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',   attribution: '© OSM' },
};

// ── Reverse geocode lat/lng → place name ─────────────────────────────────────
const reverseGeocode = async (lat, lng) => {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const name =
      addr.amenity || addr.shop || addr.building ||
      addr.road    || addr.suburb || addr.neighbourhood ||
      data.display_name?.split(',')[0] ||
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    return { name, fullAddress: data.display_name || `${lat}, ${lng}` };
  } catch {
    return { name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, fullAddress: `${lat}, ${lng}` };
  }
};

// ── MapClickHandler ───────────────────────────────────────────────────────────
const MapClickHandler = ({ onLocationSelect, activeStopIndex }) => {
  useMapEvents({
    click: async (e) => {
      if (activeStopIndex === null) return;
      const { lat, lng } = e.latlng;
      if (!isWithinDagupan(lat, lng)) {
        alert('Please select a location within Dagupan City, Pangasinan.');
        return;
      }
      const { name, fullAddress } = await reverseGeocode(lat, lng);
      onLocationSelect({ lat, lng }, name, fullAddress, activeStopIndex);
    },
  });
  return null;
};

// ── Location Search ───────────────────────────────────────────────────────────
const LocationSearch = ({ onLocationSelect, stopIndex }) => {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [busy,    setBusy]    = useState(false);

  useEffect(() => {
    if (query.length < 3) { setResults([]); return; }
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Dagupan Pangasinan')}&bounded=1&viewbox=120.27,15.98,120.41,16.11&limit=5&addressdetails=1`;
        const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        setResults(data);
      } catch { /* silent */ }
      finally { setBusy(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" size={14} />
        <input
          type="text"
          placeholder="Search location in Dagupan…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-8 pr-7 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 text-xs focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        {busy && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-green-100 rounded-lg shadow-xl max-h-44 overflow-y-auto">
          {results.map((r, i) => {
            const addr = r.address || {};
            const placeName = addr.amenity || addr.shop || addr.building ||
                              addr.road || addr.suburb || r.display_name?.split(',')[0];
            const lat = parseFloat(r.lat), lng = parseFloat(r.lon);
            return (
              <button key={i}
                onClick={() => {
                  if (!isWithinDagupan(lat, lng)) {
                    alert('That location is outside Dagupan City.');
                    return;
                  }
                  onLocationSelect({ lat, lng }, placeName || r.display_name?.split(',')[0], r.display_name, stopIndex);
                  setQuery(''); setResults([]);
                }}
                className="w-full px-3 py-2.5 text-left hover:bg-green-50 border-b border-gray-100 last:border-0 transition-colors"
              >
                <p className="font-semibold text-gray-800 text-xs">{placeName}</p>
                <p className="text-gray-400 truncate text-[10px]">{r.display_name}</p>
                <p className="text-green-600 text-[10px] font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Main Modal ────────────────────────────────────────────────────────────────
const PlanNewDeliveryModal = ({ onClose, onSuccess, prefill = null }) => {
  // REPLACE WITH:
  const [formData, setFormData] = useState({
    deliveryDate:  new Date().toISOString().split('T')[0],
    vehicleType:   'van',
    estimatedLoad: ''
  });
  const [inventory,        setInventory]        = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [stops, setStops] = useState([
    { name: '', fullAddress: '', lat: null, lng: null, type: 'origin',      products: [] },
    { name: '', fullAddress: '', lat: null, lng: null, type: 'destination', products: [] }
  ]);
  const [activeStopIndex,   setActiveStopIndex]   = useState(null);
  const [errors,            setErrors]            = useState({});
  const [loading,           setLoading]           = useState(false);
  const [estimatedDistance, setEstimatedDistance] = useState(null);
  const [routeError,        setRouteError]        = useState(null);
  const [mapLayer,          setMapLayer]          = useState('hybrid');
  const [showLayerSelector, setShowLayerSelector] = useState(false);
  const mapRef = useRef(null);

  const vehicleTypes = [
    { value: 'van',                label: 'Van' },
    { value: 'refrigerated_truck', label: 'Refrigerated Truck' },
    { value: 'truck',              label: 'Truck' },
    { value: 'motorcycle',         label: 'Motorcycle' },
  ];

  // REPLACE WITH:
  useEffect(() => {
    inventoryService.getAllInventory()
      .then(res => {
        const list = res?.data || res || [];
        setInventory(Array.isArray(list) ? list : []);
      })
      .catch(() => setInventory([]))
      .finally(() => setInventoryLoading(false));
  }, []);

  const calculateRoute = async () => {
    const valid = stops.filter(s => s.lat && s.lng);
    if (valid.length < 2) { setEstimatedDistance(null); return; }
    setRouteError(null);
    try {
      const data = await deliveryService.calculateRoute(valid.map(s => [s.lng, s.lat]));
      if (data?.data?.routes?.[0]) {
        const r = data.data.routes[0].summary;
        setEstimatedDistance({ distance: (r.distance / 1000).toFixed(2), duration: Math.round(r.duration / 60) });
      }
    } catch { setRouteError('Could not calculate route distance.'); }
  };

  useEffect(() => { calculateRoute(); }, [stops]);

  const handleLocationSelect = (latlng, name, fullAddress, stopIndex) => {
    const ns = [...stops];
    ns[stopIndex] = {
      ...ns[stopIndex],
      lat:         latlng.lat,
      lng:         latlng.lng,
      name:        name        || `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`,
      fullAddress: fullAddress || `${latlng.lat}, ${latlng.lng}`,
    };
    setStops(ns);
    setActiveStopIndex(null);
    const pts = ns.filter(s => s.lat && s.lng).map(s => [s.lat, s.lng]);
    if (pts.length > 0 && mapRef.current) mapRef.current.fitBounds(pts, { padding: [40, 40] });
  };

  const addStop = () => {
    const ns = [...stops];
    ns.splice(stops.length - 1, 0, { name: '', fullAddress: '', lat: null, lng: null, type: 'stop', products: [] });
    setStops(ns);
  };

  const removeStop = (index) => { if (stops.length > 2) setStops(stops.filter((_, i) => i !== index)); };

  // REPLACE WITH:
  const validateForm = () => {
    const errs = {};
    if (!formData.estimatedLoad || +formData.estimatedLoad <= 0) errs.estimatedLoad = 'Valid load weight required';
    stops.forEach((s, i) => { if (!s.lat || !s.lng) errs[`stop_${i}`] = 'Set this location on the map'; });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      setLoading(true);
     await deliveryService.createDelivery({
        routeName:    `Route-${Date.now()}`,
        deliveryDate: formData.deliveryDate,
        vehicleType:  formData.vehicleType,
        estimatedLoad: formData.estimatedLoad,
        driverUserId: parseInt(formData.driverUserId, 10),
        // Store as { address, lat, lng } — this is what the table parses to show name + coords
        originLocation: {
          address: stops[0].name,
          lat: stops[0].lat,
          lng: stops[0].lng,
        },
        destinationLocation: {
          address: stops[stops.length - 1].name,
          lat: stops[stops.length - 1].lat,
          lng: stops[stops.length - 1].lng,
        },
        stops: stops.map(s => ({
          location: { address: s.name, lat: s.lat, lng: s.lng },
          type:     s.type,
          products: s.products
        })),
        totalDistance:     estimatedDistance?.distance,
        estimatedDuration: estimatedDistance?.duration
      });
      onSuccess?.();
    } catch (error) {
      setErrors({ submit: error.response?.data?.message || 'Failed to create delivery' });
    } finally {
      setLoading(false);
    }
  };

  const getMarkerIcon = (type) => type === 'origin' ? originIcon : type === 'destination' ? destinationIcon : stopIcon;
  const getStopLabel  = (type, index) => type === 'origin' ? 'Origin' : type === 'destination' ? 'Destination' : `Stop ${index}`;
  const getStopDot    = (type) => type === 'origin' ? 'bg-green-600' : type === 'destination' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-6xl w-full h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-green-100">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 bg-gradient-to-r from-green-800 to-green-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Truck size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Plan New Delivery</h3>
              <p className="text-green-200 text-xs">Dagupan City, Pangasinan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* Left — white form panel */}
          <div className="w-2/5 flex-shrink-0 overflow-y-auto p-5 space-y-5 bg-white border-r border-gray-100">

            {errors.submit && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs">
                <AlertCircle size={14} /> {errors.submit}
              </div>
            )}
            {prefill && (
  <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
    <Zap size={15} className="text-orange-500 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-xs font-bold text-orange-800">Pre-filled from Spoilage Approval</p>
      <p className="text-[11px] text-orange-700 mt-0.5">
        {prefill.productName} · Batch {prefill.batchNumber} · {prefill.quantity} · {prefill.daysLeft}d left
      </p>
      <p className="text-[10px] text-orange-500 mt-1">Add stop locations and assign products to complete this plan.</p>
    </div>
  </div>
)}
            

            {/* Delivery Info */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-green-100" />
                <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest px-1">Delivery Information</span>
                <div className="h-px flex-1 bg-green-100" />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Delivery Date *</label>
                  <input type="date" value={formData.deliveryDate}
                    onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-1">Driver Assignment</p>
                  <p className="text-[11px] text-blue-600">Driver will be assigned by the Logistics Manager when approving this route.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Vehicle *</label>
                    <select value={formData.vehicleType}
                      onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
                      {vehicleTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Load (kg) *</label>
                    <input type="number" placeholder="e.g. 500" value={formData.estimatedLoad}
                      onChange={e => setFormData({ ...formData, estimatedLoad: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${errors.estimatedLoad ? 'border-red-300' : 'border-gray-200'}`} />
                    {errors.estimatedLoad && <p className="text-red-500 text-[10px] mt-1">{errors.estimatedLoad}</p>}
                  </div>
                </div>
              </div>
            </section>

            {/* Route Stops */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-px w-4 bg-green-100" />
                  <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Route Stops</span>
                </div>
                <button onClick={addStop}
                  className="flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 rounded-lg text-[10px] font-semibold hover:bg-green-100 transition-colors">
                  <Plus size={11} /> Add Stop
                </button>
              </div>

              <div className="space-y-2">
                {stops.map((stop, index) => (
                  <div key={index}
                    className={`rounded-xl p-3 border transition-all ${activeStopIndex === index ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 bg-gray-50/50'}`}>

                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${getStopDot(stop.type)}`}>
                        {index + 1}
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{getStopLabel(stop.type, index)}</span>
                      {stop.type === 'stop' && (
                        <button onClick={() => removeStop(index)} className="ml-auto text-red-400 hover:text-red-600 p-0.5">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <LocationSearch onLocationSelect={handleLocationSelect} stopIndex={index} />

                    <button onClick={() => setActiveStopIndex(activeStopIndex === index ? null : index)}
                      className={`w-full mt-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                        activeStopIndex === index
                          ? 'bg-green-700 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700'
                      }`}>
                      <MapPin size={11} />
                      {activeStopIndex === index ? 'Click on the map to pin…' : 'Pin on map'}
                    </button>

                    {/* ── Location confirmed: show NAME + coordinates clearly ── */}
                    {stop.lat && stop.lng && (
                      <div className="mt-2 p-2.5 bg-white rounded-lg border border-green-200">
                        <div className="flex items-start gap-2">
                          <CheckCircle size={13} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 leading-tight">{stop.name}</p>
                            <p className="text-[10px] text-green-700 font-mono mt-0.5">
                              {Number(stop.lat).toFixed(5)}, {Number(stop.lng).toFixed(5)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {errors[`stop_${index}`] && (
                      <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1">
                        <AlertCircle size={10} /> {errors[`stop_${index}`]}
                      </p>
                    )}

                     {stop.type !== 'origin' && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Assign Fruits to this Stop</p>
                        {inventoryLoading ? (
                          <p className="text-[10px] text-gray-400 flex items-center gap-1">
                            <span className="w-2.5 h-2.5 border border-green-500 border-t-transparent rounded-full animate-spin inline-block" /> Loading inventory…
                          </p>
                        ) : inventory.length === 0 ? (
                          <p className="text-[10px] text-orange-500">No available inventory. Add fruits first.</p>
                        ) : (
                          inventory.map(item => {
                            const existing = (stop.products || []).find(p => p.inventoryId === item.inventory_id);
                            return (
                              <div key={item.inventory_id} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-2.5 py-1.5">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-gray-700 truncate">{item.product_name}</p>
                                  <p className="text-[10px] text-gray-400">{item.quantity} {item.unit_of_measure} available</p>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  max={item.quantity}
                                  placeholder="0"
                                  value={existing?.quantityAssigned || ''}
                                  onChange={e => {
                                    const qty = parseFloat(e.target.value) || 0;
                                    const ns = [...stops];
                                    const products = [...(ns[index].products || [])];
                                    const idx2 = products.findIndex(p => p.inventoryId === item.inventory_id);
                                    if (qty > 0) {
                                      const entry = { inventoryId: item.inventory_id, productName: item.product_name, quantityAssigned: qty, unit: item.unit_of_measure };
                                      if (idx2 >= 0) products[idx2] = entry;
                                      else products.push(entry);
                                    } else {
                                      if (idx2 >= 0) products.splice(idx2, 1);
                                    }
                                    ns[index] = { ...ns[index], products };
                                    setStops(ns);
                                  }}
                                  className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-[11px] text-center focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                                />
                                <span className="text-[10px] text-gray-400 w-6">{item.unit_of_measure}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {estimatedDistance && (
              <div className="rounded-xl p-3 flex items-center gap-3 bg-green-50 border border-green-200">
                <Navigation size={18} className="text-green-700 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-green-800">Estimated Route</p>
                  <p className="text-[11px] text-green-600">{estimatedDistance.distance} km · {estimatedDistance.duration} min</p>
                </div>
              </div>
            )}
            {routeError && (
              <p className="text-orange-500 text-[10px] flex items-center gap-1">
                <AlertCircle size={11} /> {routeError}
              </p>
            )}
          </div>

          {/* Right — Map */}
          <div className="flex-1 relative min-w-0">
            <div className="absolute top-3 right-3 z-[1000]">
              <div className="relative">
                <button onClick={() => setShowLayerSelector(!showLayerSelector)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 shadow-sm hover:shadow-md">
                  <Layers size={13} /> {MAP_LAYERS[mapLayer].name}
                </button>
                {showLayerSelector && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[140px]">
                    {Object.entries(MAP_LAYERS).map(([key, layer]) => (
                      <button key={key} onClick={() => { setMapLayer(key); setShowLayerSelector(false); }}
                        className={`w-full px-4 py-2 text-left text-xs hover:bg-green-50 transition-colors ${mapLayer === key ? 'text-green-700 font-semibold bg-green-50' : 'text-gray-700'}`}>
                        {layer.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="absolute top-3 left-3 z-[1000] px-3 py-1.5 bg-green-800 text-white rounded-lg text-[10px] font-semibold shadow-md">
              Dagupan City, Pangasinan
            </div>

            <MapContainer
              center={DAGUPAN_CENTER} zoom={DAGUPAN_ZOOM}
              minZoom={13} maxZoom={19}
              maxBounds={DAGUPAN_BOUNDS} maxBoundsViscosity={1.0}
              style={{ height: '100%', width: '100%' }} ref={mapRef}
            >
              <TileLayer url={MAP_LAYERS[mapLayer].url} attribution={MAP_LAYERS[mapLayer].attribution} maxZoom={20} />
              <MapClickHandler onLocationSelect={handleLocationSelect} activeStopIndex={activeStopIndex} />
              <Rectangle bounds={DAGUPAN_BOUNDS} pathOptions={{ color: '#15803d', weight: 2, fillOpacity: 0.02, dashArray: '6 4' }} />

              {stops.map((stop, index) =>
                stop.lat && stop.lng ? (
                  <Marker key={index} position={[stop.lat, stop.lng]} icon={getMarkerIcon(stop.type)}>
                    <Popup>
                      <div className="text-xs min-w-[160px]">
                        <p className="font-bold text-gray-800 mb-1">{getStopLabel(stop.type, index)}</p>
                        <p className="font-medium text-gray-700">{stop.name}</p>
                        <p className="text-green-700 font-mono text-[10px] mt-1 bg-green-50 rounded px-1 py-0.5">
                          {Number(stop.lat).toFixed(5)}, {Number(stop.lng).toFixed(5)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              )}
            </MapContainer>

            {activeStopIndex !== null && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] px-5 py-2.5 bg-green-700 text-white rounded-full shadow-xl text-sm font-semibold animate-bounce">
                Click on the map to set {getStopLabel(stops[activeStopIndex]?.type, activeStopIndex)}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 flex-shrink-0 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</>
            ) : (
              <><Plus size={16} />Create Delivery</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanNewDeliveryModal;