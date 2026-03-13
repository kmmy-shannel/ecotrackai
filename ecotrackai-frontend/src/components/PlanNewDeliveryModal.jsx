import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, Trash2, MapPin, Search, Navigation, X, Layers, Truck, AlertCircle, CheckCircle, Zap, Package } from 'lucide-react';
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

// ── Reverse geocode ───────────────────────────────────────────────────────────
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

// ── Batch Picker Modal ────────────────────────────────────────────────────────
// Shows inventory items with their real-time remaining qty.
// User picks a batch → it gets added to the stop's product list.
const BatchPickerModal = ({ inventory, stops, stopIndex, onAdd, onClose }) => {
  const [search, setSearch] = useState('');

  // Compute how much of each batch is already allocated across ALL stops
  const getAllocated = (inventoryId) =>
    stops.reduce((sum, stop) => {
      const found = (stop.products || []).find(p => p.inventoryId === inventoryId);
      return sum + (found ? parseFloat(found.quantityAssigned) || 0 : 0);
    }, 0);

  // Already added to THIS stop
  const alreadyInStop = (inventoryId) =>
    (stops[stopIndex]?.products || []).some(p => p.inventoryId === inventoryId);

  const filtered = inventory.filter(item => {
    const remaining = item.quantity - getAllocated(item.inventory_id);
    return remaining > 0 && !alreadyInStop(item.inventory_id) &&
      item.product_name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-green-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-green-700">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-white" />
            <span className="text-sm font-bold text-white">Add Batch to Stop {stopIndex}</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Search fruit…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="p-6 text-center">
              <Package size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No available batches</p>
              <p className="text-[10px] text-gray-300 mt-1">All inventory has been fully allocated or already added to this stop.</p>
            </div>
          ) : (
            filtered.map(item => {
              const allocated = getAllocated(item.inventory_id);
              const remaining = item.quantity - allocated;
              const pct = Math.round((remaining / item.quantity) * 100);
              return (
                <button
                  key={item.inventory_id}
                  onClick={() => onAdd(item, remaining)}
                  className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.product_name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Batch {item.batch_number} · Expires {item.expected_expiry_date ? new Date(item.expected_expiry_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : 'N/A'}
                      </p>
                      {/* Remaining bar */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct > 50 ? 'bg-green-400' : pct > 20 ? 'bg-yellow-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-semibold ${pct > 50 ? 'text-green-600' : pct > 20 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {remaining} {item.unit_of_measure} left
                        </span>
                      </div>
                    </div>
                    <div className="ml-3 w-7 h-7 rounded-full bg-green-100 group-hover:bg-green-600 flex items-center justify-center transition-colors flex-shrink-0">
                      <Plus size={13} className="text-green-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Modal ────────────────────────────────────────────────────────────────
const PlanNewDeliveryModal = ({ onClose, onSuccess, prefill = null }) => {
  const [formData, setFormData] = useState({
    deliveryDate: new Date().toISOString().split('T')[0],
    vehicleType:  'van',
  });
  const [inventory,        setInventory]        = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [stops, setStops] = useState([
    { name: '', fullAddress: '', lat: null, lng: null, type: 'origin',      products: [] },
    { name: '', fullAddress: '', lat: null, lng: null, type: 'destination', products: [] }
  ]);
  const [activeStopIndex,   setActiveStopIndex]   = useState(null);
  // batchPickerStopIndex: which stop is currently opening the picker
  const [batchPickerStopIndex, setBatchPickerStopIndex] = useState(null);
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

  useEffect(() => {
    inventoryService.getAllInventory()
      .then(res => {
        const list = res?.data || res || [];
        setInventory(Array.isArray(list) ? list : []);
      })
      .catch(() => setInventory([]))
      .finally(() => setInventoryLoading(false));
  }, []);

  // Prevent background scroll while modal is open
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Auto-computed total load from all stops ───────────────────────────────
  const totalLoad = stops.reduce((sum, stop) =>
    sum + (stop.products || []).reduce((s2, p) => s2 + (parseFloat(p.quantityAssigned) || 0), 0)
  , 0);

  // ── Route calculation ─────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calculateRoute = useCallback(async () => {
    const valid = stops.filter(s => s.lat && s.lng);
    if (valid.length < 2) { setEstimatedDistance(null); return; }
    setRouteError(null);
    try {
      const data = await deliveryService.calculateRoute(valid.map(s => [s.lng, s.lat]));
      // ORS v2 response is wrapped by backend sendSuccess: { success, message, data: <ORS_data> }
      const orsData = data?.data ?? data;
      const route   = orsData?.routes?.[0];
      if (route) {
        const summary = route.summary ?? route.segments?.[0]?.steps?.reduce(
          (acc, s) => ({ distance: acc.distance + s.distance, duration: acc.duration + s.duration }),
          { distance: 0, duration: 0 }
        ) ?? { distance: 0, duration: 0 };

        const orsDistKm = summary.distance / 1000;
        const orsDurMin = Math.round(summary.duration / 60);

        // Sanity check: reject ORS result if avg speed < 5 km/h (unrealistic road detour)
        // Fall back to haversine distance + 25 km/h urban estimate
        const orsSpeedKmh = orsDurMin > 0 ? (orsDistKm / orsDurMin) * 60 : 999;
        let finalDistKm, finalDurMin;

        if (orsDistKm > 0 && orsSpeedKmh >= 5) {
          finalDistKm = orsDistKm;
          finalDurMin = orsDurMin;
        } else {
          // Haversine straight-line fallback
          const R = 6371;
          let hvTotal = 0;
          for (let i = 0; i < valid.length - 1; i++) {
            const [lng1, lat1] = [valid[i].lng, valid[i].lat];
            const [lng2, lat2] = [valid[i+1].lng, valid[i+1].lat];
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
            hvTotal += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          }
          finalDistKm = hvTotal;
          finalDurMin = Math.max(1, Math.round((hvTotal / 25) * 60)); // 25 km/h urban
        }

        const distKm   = finalDistKm.toFixed(2);
        const durHours = Math.floor(finalDurMin / 60);
        const durMins  = finalDurMin % 60;
        const durLabel = durHours > 0 ? `${durHours}h ${durMins}m` : `${finalDurMin} min`;
        setEstimatedDistance({ distance: distKm, duration: finalDurMin, durationLabel: durLabel });
      }
    } catch { setRouteError('Could not calculate route distance.'); }
  }, [stops]);

  useEffect(() => { calculateRoute(); }, [calculateRoute]);

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

  // ── Batch picker handlers ─────────────────────────────────────────────────
  const handleAddBatchToStop = (item, remainingQty, stopIndex) => {
    const ns = [...stops];
    const products = [...(ns[stopIndex].products || [])];
    // Don't add if already present
    if (products.find(p => p.inventoryId === item.inventory_id)) return;
    products.push({
      inventoryId:       item.inventory_id,
      productName:       item.product_name,
      quantityAssigned:  '', // user will fill in
      maxQty:            remainingQty,
      unit:              item.unit_of_measure,
      batchNumber:       item.batch_number,
    });
    ns[stopIndex] = { ...ns[stopIndex], products };
    setStops(ns);
    setBatchPickerStopIndex(null);
  };

  // Update qty for a product in a stop — real-time, with clamping
  const handleQtyChange = (stopIndex, inventoryId, rawValue) => {
    const ns = [...stops];
    const products = [...(ns[stopIndex].products || [])];
    const idx = products.findIndex(p => p.inventoryId === inventoryId);
    if (idx < 0) return;

    const item = inventory.find(i => i.inventory_id === inventoryId);
    if (!item) return;

    // Compute remaining excluding this stop's current value
    const otherAllocated = stops.reduce((sum, stop, si) => {
      if (si === stopIndex) return sum;
      const found = (stop.products || []).find(p => p.inventoryId === inventoryId);
      return sum + (found ? parseFloat(found.quantityAssigned) || 0 : 0);
    }, 0);
    const maxAllowed = item.quantity - otherAllocated;

    let qty = rawValue === '' ? '' : parseFloat(rawValue);
    if (qty !== '' && qty > maxAllowed) qty = maxAllowed;
    if (qty !== '' && qty < 0) qty = 0;

    products[idx] = { ...products[idx], quantityAssigned: qty, maxQty: maxAllowed };
    ns[stopIndex] = { ...ns[stopIndex], products };
    setStops(ns);
  };

  const handleRemoveProductFromStop = (stopIndex, inventoryId) => {
    const ns = [...stops];
    ns[stopIndex] = {
      ...ns[stopIndex],
      products: (ns[stopIndex].products || []).filter(p => p.inventoryId !== inventoryId)
    };
    setStops(ns);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateForm = () => {
    const errs = {};
    stops.forEach((s, i) => { if (!s.lat || !s.lng) errs[`stop_${i}`] = 'Set this location on the map'; });

    // Check no stop has over-allocated
    stops.forEach((stop, si) => {
      (stop.products || []).forEach(p => {
        const item = inventory.find(i => i.inventory_id === p.inventoryId);
        if (!item) return;
        const otherAllocated = stops.reduce((sum, s2, si2) => {
          if (si2 === si) return sum;
          const found = (s2.products || []).find(x => x.inventoryId === p.inventoryId);
          return sum + (found ? parseFloat(found.quantityAssigned) || 0 : 0);
        }, 0);
        const maxAllowed = item.quantity - otherAllocated;
        if ((parseFloat(p.quantityAssigned) || 0) > maxAllowed) {
          errs[`qty_${si}_${p.inventoryId}`] = `Exceeds available for ${p.productName}`;
        }
      });
    });

    if (totalLoad <= 0) errs.totalLoad = 'Assign at least one batch with quantity > 0';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Fuel & carbon estimation per vehicle type ─────────────────────────────
  // Consumption rates (liters/km): van 0.10, refrigerated_truck 0.18, truck 0.14, motorcycle 0.04
  // Carbon factor: diesel ≈ 2.68 kg CO₂/liter
  const FUEL_RATES = { van: 0.10, refrigerated_truck: 0.18, truck: 0.14, motorcycle: 0.04 };
  const CARBON_PER_LITER = 2.68;

  const computeFuelAndCarbon = (distKm, vehicleType) => {
    const rate = FUEL_RATES[vehicleType] ?? 0.10;
    const fuel = parseFloat((distKm * rate).toFixed(2));
    const carbon = parseFloat((fuel * CARBON_PER_LITER).toFixed(2));
    return { fuel, carbon };
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      setLoading(true);
      const distKm = parseFloat(estimatedDistance?.distance ?? 0);
      const { fuel, carbon } = computeFuelAndCarbon(distKm, formData.vehicleType);
      await deliveryService.createDelivery({
        routeName:    `Route-${Date.now()}`,
        deliveryDate: formData.deliveryDate,
        vehicleType:  formData.vehicleType,
        estimatedLoad: totalLoad,
        driverUserId: null, // assigned by Logistics Manager later
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
        totalDistance:     distKm || null,
        estimatedDuration: estimatedDistance?.duration ?? null,
        estimatedFuelConsumption: fuel,
        estimatedCarbon:  carbon,
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

  if (typeof document === 'undefined') return null;

  // Render at document.body level so the backdrop covers sidebar/header; blur whole viewport
  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[2000] p-4">
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
            {/* Total Load Badge */}
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-white/15 rounded-xl border border-white/20 text-center">
                <p className="text-[10px] text-green-200 uppercase tracking-wide">Total Load</p>
                <p className="text-base font-bold text-white">{totalLoad > 0 ? `${totalLoad} kg` : '—'}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex min-h-0">

            {/* Left — form panel */}
            <div className="w-2/5 flex-shrink-0 overflow-y-auto p-5 space-y-5 bg-white border-r border-gray-100">

              {errors.submit && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs">
                  <AlertCircle size={14} /> {errors.submit}
                </div>
              )}

              {errors.totalLoad && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 text-orange-600 rounded-lg text-xs">
                  <AlertCircle size={14} /> {errors.totalLoad}
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

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Vehicle *</label>
                    <select value={formData.vehicleType}
                      onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
                      {vehicleTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  {/* Total load — read-only, auto-computed */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Estimated Load (kg)</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Auto-computed from assigned batches</p>
                    </div>
                    <p className={`text-lg font-bold ${totalLoad > 0 ? 'text-green-700' : 'text-gray-300'}`}>
                      {totalLoad > 0 ? totalLoad : '—'}
                    </p>
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

                      {/* ── Batch Assignment (non-origin stops) ── */}
                      {stop.type !== 'origin' && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Batches for this Stop</p>
                            {!inventoryLoading && (
                              <button
                                onClick={() => setBatchPickerStopIndex(index)}
                                className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-[10px] font-semibold transition-colors"
                              >
                                <Plus size={10} /> Add Batch
                              </button>
                            )}
                          </div>

                          {inventoryLoading ? (
                            <p className="text-[10px] text-gray-400 flex items-center gap-1">
                              <span className="w-2.5 h-2.5 border border-green-500 border-t-transparent rounded-full animate-spin inline-block" /> Loading…
                            </p>
                          ) : (stop.products || []).length === 0 ? (
                            <div className="flex flex-col items-center py-3 px-2 bg-white border border-dashed border-gray-200 rounded-lg">
                              <Package size={18} className="text-gray-300 mb-1" />
                              <p className="text-[10px] text-gray-400">No batches added yet</p>
                              <p className="text-[10px] text-gray-300">Click "+ Add Batch" to assign inventory</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {(stop.products || []).map(product => {
                                const item = inventory.find(i => i.inventory_id === product.inventoryId);
                                const otherAllocated = stops.reduce((sum, s2, si2) => {
                                  if (si2 === index) return sum;
                                  const found = (s2.products || []).find(p => p.inventoryId === product.inventoryId);
                                  return sum + (found ? parseFloat(found.quantityAssigned) || 0 : 0);
                                }, 0);
                                const maxAllowed = item ? item.quantity - otherAllocated : 0;
                                const currentQty = parseFloat(product.quantityAssigned) || 0;
                                const isOver = currentQty > maxAllowed;

                                return (
                                  <div key={product.inventoryId}
                                    className={`bg-white rounded-lg border px-2.5 py-2 ${isOver ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                                    <div className="flex items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <p className="text-[11px] font-semibold text-gray-700 truncate">{product.productName}</p>
                                          <button
                                            onClick={() => handleRemoveProductFromStop(index, product.inventoryId)}
                                            className="text-gray-300 hover:text-red-500 transition-colors ml-1 flex-shrink-0"
                                          >
                                            <X size={11} />
                                          </button>
                                        </div>
                                        <p className="text-[10px] text-gray-400">Batch {product.batchNumber}</p>

                                        {/* Qty input + remaining indicator */}
                                        <div className="flex items-center gap-2 mt-1.5">
                                          <input
                                            type="number"
                                            min="0"
                                            max={maxAllowed}
                                            placeholder="0"
                                            value={product.quantityAssigned}
                                            onChange={e => handleQtyChange(index, product.inventoryId, e.target.value)}
                                            className={`w-20 px-2 py-1 border rounded-md text-[11px] text-center font-semibold focus:outline-none focus:ring-1 ${
                                              isOver
                                                ? 'border-red-300 text-red-600 focus:ring-red-400'
                                                : 'border-gray-200 text-gray-700 focus:border-green-400 focus:ring-green-400'
                                            }`}
                                          />
                                          <span className="text-[10px] text-gray-400">{product.unit}</span>
                                          <span className={`text-[10px] font-semibold ml-auto ${maxAllowed > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {maxAllowed} {product.unit} avail.
                                          </span>
                                        </div>

                                        {isOver && (
                                          <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                                            <AlertCircle size={9} /> Exceeds available quantity
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
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
                    <p className="text-[11px] text-green-600">
                      {estimatedDistance.distance} km · {estimatedDistance.durationLabel ?? `${estimatedDistance.duration} min`}
                      {stops.filter(s => s.lat && s.lng).length > 0 && (
                        <span className="ml-1 text-green-500">· {stops.filter(s => s.lat && s.lng).length} stop{stops.filter(s => s.lat && s.lng).length !== 1 ? 's' : ''}</span>
                      )}
                    </p>
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
                          {(stop.products || []).length > 0 && (
                            <div className="mt-2 border-t pt-2">
                              {stop.products.map(p => (
                                <p key={p.inventoryId} className="text-[10px] text-gray-600">
                                  {p.productName}: {p.quantityAssigned || 0} {p.unit}
                                </p>
                              ))}
                            </div>
                          )}
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

      {/* Batch Picker rendered outside modal to avoid z-index issues */}
      {batchPickerStopIndex !== null && (
        <BatchPickerModal
          inventory={inventory}
          stops={stops}
          stopIndex={batchPickerStopIndex}
          onAdd={(item, remaining) => handleAddBatchToStop(item, remaining, batchPickerStopIndex)}
          onClose={() => setBatchPickerStopIndex(null)}
        />
      )}
    </>,
    typeof document !== 'undefined' ? document.body : null
  );
};

export default PlanNewDeliveryModal;
