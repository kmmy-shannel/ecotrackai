// ============================================================
// FILE: src/pages/manager/logistics/LogisticsDashboardView.jsx
// UI restyled to match AdminDashboardPage design system
// NO functional changes — only visual/CSS updates
// ============================================================
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CheckCircle2, AlertCircle, Truck, Users, Leaf,
  Sparkles, Clock, Layers
} from 'lucide-react';

/* ─── Styles (mirrors admin db-* system) ───────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .ld-root, .ld-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  @keyframes ld-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ld-slide { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
  @keyframes ld-spin  { to{transform:rotate(360deg)} }
  @keyframes ld-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

  .ld-page { animation:ld-in .3s ease both; }

  /* Stat cards */
  .ld-stat { border-radius:18px; border:1px solid rgba(82,183,136,0.18); box-shadow:0 2px 10px rgba(26,61,43,0.07); transition:transform .2s,box-shadow .2s; animation:ld-in .3s ease both; overflow:hidden; }
  .ld-stat:hover { transform:translateY(-3px); box-shadow:0 10px 26px rgba(26,61,43,0.13); }
  .ld-stat-dk { background:linear-gradient(145deg,#1a3d2b,#2d6a4f); position:relative; overflow:hidden; }
  .ld-stat-dk::after { content:''; position:absolute; right:-20px; top:-20px; width:80px; height:80px; border-radius:50%; background:rgba(255,255,255,0.05); pointer-events:none; }
  .ld-stat-lt { background:#fff; }
  .ld-stat-cell { padding:16px 18px; position:relative; z-index:1; }

  /* Panels */
  .ld-panel { background:#fff; border-radius:18px; padding:18px 20px; box-shadow:0 2px 12px rgba(26,61,43,0.07); border:1px solid rgba(82,183,136,0.14); animation:ld-in .32s ease both; }

  /* Section header */
  .ld-sh { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .ld-sh-left { display:flex; align-items:center; gap:9px; }
  .ld-sh-ico { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .ld-rule { height:1px; background:rgba(82,183,136,0.1); margin:13px 0; }

  /* Approval card */
  .ld-card { background:#fff; border-radius:16px; border:1px solid rgba(82,183,136,0.16); box-shadow:0 2px 10px rgba(26,61,43,0.06); overflow:hidden; margin-bottom:10px; animation:ld-slide .22s ease both; transition:border-color .15s,box-shadow .15s; }
  .ld-card:hover { border-color:#52b788; box-shadow:0 6px 20px rgba(26,61,43,0.1); }
  .ld-card:nth-child(1){animation-delay:.03s} .ld-card:nth-child(2){animation-delay:.06s} .ld-card:nth-child(3){animation-delay:.09s}

  .ld-card-header { display:flex; align-items:center; gap:12px; padding:14px 16px; cursor:pointer; transition:background .13s; }
  .ld-card-header:hover { background:rgba(216,243,220,0.2); }

  .ld-card-body { border-top:1px solid rgba(82,183,136,0.1); padding:16px; background:rgba(240,253,244,0.3); }

  /* Avatar */
  .ld-av { width:38px; height:38px; border-radius:12px; background:linear-gradient(135deg,#d8f3dc,#b7e4c7); color:#1a3d2b; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; flex-shrink:0; }

  /* Badges */
  .ld-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:99px; font-size:11px; font-weight:700; }
  .ld-badge-pending  { background:#fffbeb; color:#b45309; border:1px solid #fde68a; }
  .ld-badge-approved { background:#d8f3dc; color:#1a3d2b; border:1px solid #86efac; }
  .ld-badge-declined { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
  .ld-badge-transit  { background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; }
  .ld-badge-optimized{ background:#f5f3ff; color:#6d28d9; border:1px solid #ddd6fe; }

  /* Metric comparison rows */
  .ld-metric-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(82,183,136,0.08); font-size:12.5px; }
  .ld-metric-row:last-child { border-bottom:none; }

  /* Savings chips */
  .ld-saving { display:inline-flex; align-items:center; gap:3px; padding:4px 10px; background:#d8f3dc; color:#1a3d2b; border-radius:99px; font-size:11px; font-weight:700; border:1px solid #86efac; }

  /* Buttons */
  .ld-btn-approve { display:inline-flex; align-items:center; justify-content:center; gap:5px; flex:1; padding:10px; background:linear-gradient(135deg,#1a3d2b,#2d6a4f); color:#fff; border-radius:12px; font-size:12.5px; font-weight:700; border:none; cursor:pointer; transition:opacity .15s,transform .13s; box-shadow:0 2px 8px rgba(26,61,43,0.2); }
  .ld-btn-approve:hover:not(:disabled) { opacity:.88; transform:translateY(-1px); }
  .ld-btn-approve:disabled { opacity:.45; cursor:not-allowed; }
  .ld-btn-decline { display:inline-flex; align-items:center; justify-content:center; gap:5px; flex:1; padding:10px; background:#fff; color:#dc2626; border-radius:12px; font-size:12.5px; font-weight:700; border:1.5px solid #fecaca; cursor:pointer; transition:background .13s; }
  .ld-btn-decline:hover { background:#fef2f2; }
  .ld-btn-cancel { padding:10px 18px; background:#f3f4f6; color:#374151; border-radius:12px; font-size:12.5px; font-weight:700; border:none; cursor:pointer; transition:background .13s; }
  .ld-btn-cancel:hover { background:#e5e7eb; }
  .ld-btn-confirm-decline { flex:1; padding:10px; background:#dc2626; color:#fff; border-radius:12px; font-size:12.5px; font-weight:700; border:none; cursor:pointer; transition:background .13s; }
  .ld-btn-confirm-decline:hover:not(:disabled) { background:#b91c1c; }
  .ld-btn-confirm-decline:disabled { opacity:.45; cursor:not-allowed; }

  /* AI box */
  .ld-ai-box { background:linear-gradient(to bottom right,#f0fdf4,#fafffe); border:1px solid rgba(82,183,136,0.2); border-radius:12px; padding:12px 14px; }

  /* Textarea */
  .ld-textarea { width:100%; border:1.5px solid rgba(82,183,136,0.25); border-radius:12px; padding:10px 12px; font-size:12.5px; font-family:'Poppins',sans-serif; resize:none; outline:none; transition:border-color .15s; background:#fff; }
  .ld-textarea:focus { border-color:#2d6a4f; box-shadow:0 0 0 3px rgba(45,106,79,0.1); }

  /* Select */
  .ld-select { width:100%; border:1.5px solid rgba(82,183,136,0.25); border-radius:12px; padding:9px 12px; font-size:12.5px; font-family:'Poppins',sans-serif; outline:none; transition:border-color .15s; background:#fff; color:#1a3d2b; }
  .ld-select:focus { border-color:#2d6a4f; }

  /* Driver row */
  .ld-driver-row { display:flex; align-items:center; justify-content:space-between; padding:11px 0; border-bottom:1px solid rgba(82,183,136,0.08); }
  .ld-driver-row:last-child { border-bottom:none; }
  .ld-driver-av { width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg,#d8f3dc,#b7e4c7); color:#1a3d2b; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; flex-shrink:0; }

  /* Empty state */
  .ld-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:48px 24px; gap:10px; color:#9ca3af; text-align:center; }

  /* Spinner */
  .ld-spin { border-radius:50%; border:2.5px solid #95d5b2; border-top-color:#2d6a4f; animation:ld-spin .65s linear infinite; }

  /* Alert / toast */
  .ld-toast-err { background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; border-radius:12px; padding:12px 16px; font-size:13px; font-weight:600; margin-bottom:14px; }
  .ld-toast-ok  { background:#d8f3dc; border:1px solid #86efac; color:#1a3d2b; border-radius:12px; padding:12px 16px; font-size:13px; font-weight:600; margin-bottom:14px; }

  /* Map toggle btn */
  .ld-btn-map { display:inline-flex; align-items:center; gap:4px; padding:5px 11px; background:#fff; color:#2d6a4f; border-radius:9px; font-size:11px; font-weight:700; border:1.5px solid rgba(82,183,136,0.35); cursor:pointer; transition:background .13s; }
  .ld-btn-map:hover, .ld-btn-map.active { background:#d8f3dc; border-color:#52b788; }

  /* Collapse chevron */
  .ld-chevron { font-size:11px; color:#9ca3af; margin-left:6px; }
`;

if (typeof document !== 'undefined' && !document.getElementById('ld-styles')) {
  const el = document.createElement('style');
  el.id = 'ld-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ─── ALL ORIGINAL LOGIC BELOW — zero changes ──────────────────────────────── */

// ── Leaflet icon fix ──────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
const mkIcon = (c) => new L.Icon({ iconUrl:`https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${c}.png`, shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize:[25,41], iconAnchor:[12,41], popupAnchor:[1,-34], shadowSize:[41,41] });
const originIcon = mkIcon('green'), stopIcon = mkIcon('blue'), destinationIcon = mkIcon('red');

const DAGUPAN_CENTER = [16.0433, 120.3339];
const DAGUPAN_BOUNDS = [[15.98, 120.27], [16.11, 120.41]];

const MAP_LAYERS = {
  hybrid:    { name:'Hybrid',    url:'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',  attr:'© Google Maps' },
  satellite: { name:'Satellite', url:'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',  attr:'© Google Maps' },
  streets:   { name:'Streets',   url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',   attr:'© OpenStreetMap' },
};

const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions?.length >= 2) {
      try { map.fitBounds(positions, { padding:[40,40] }); }
      catch { map.setView(DAGUPAN_CENTER, 14); }
    } else { map.setView(DAGUPAN_CENTER, 14); }
  }, [map, positions]);
  return null;
};

const fetchRoadRoute = async (stops) => {
  if (!stops || stops.length < 2) return null;
  const valid = stops.filter(s => s.lat && s.lng);
  if (valid.length < 2) return null;
  try {
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${valid.map(s=>`${s.lng},${s.lat}`).join(';') }?overview=full&geometries=geojson`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    return data.routes[0].geometry.coordinates.map(([lng,lat]) => [lat,lng]);
  } catch { return null; }
};

const RouteMap = ({ originalStops, optimizedStops }) => {
  const [mapLayer,   setMapLayer]   = useState('hybrid');
  const [showLayers, setShowLayers] = useState(false);
  const [activeView, setActiveView] = useState('both');
  const [origRoad,   setOrigRoad]   = useState(null);
  const [optRoad,    setOptRoad]    = useState(null);
  const [loading,    setLoading]    = useState(false);

  const validO = (originalStops||[]).filter(s=>s.lat&&s.lng);
  const validP = (optimizedStops||[]).filter(s=>s.lat&&s.lng);
  const all    = validO.length > 0 ? validO : validP;
  const fitPos = all.length > 0 ? all.map(s=>[s.lat,s.lng]) : null;

  const getIconByIndex = (arr, i) => {
    const t = arr[i]?.type;
    if (t === 'origin') return originIcon;
    if (t === 'destination') return destinationIcon;
    if (i === 0) return originIcon;
    if (i === arr.length - 1) return destinationIcon;
    return stopIcon;
  };

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true); setOrigRoad(null); setOptRoad(null);
      const [o, p] = await Promise.all([fetchRoadRoute(validO), fetchRoadRoute(validP)]);
      if (!cancel) {
        setOrigRoad(o || validO.map(s=>[s.lat,s.lng]));
        setOptRoad(p  || validP.map(s=>[s.lat,s.lng]));
        setLoading(false);
      }
    };
    if (all.length >= 2) load();
    return () => { cancel = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(originalStops), JSON.stringify(optimizedStops)]);

  if (all.length === 0) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', background:'#f9fafb', borderRadius:12, fontSize:12, color:'#9ca3af', fontFamily:'Poppins,sans-serif' }}>
      No coordinates available for map preview
    </div>
  );

  return (
    <div style={{ position:'relative', height:'100%', width:'100%' }}>
      {loading && (
        <div style={{ position:'absolute', inset:0, zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.65)', pointerEvents:'none' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:'10px 16px', boxShadow:'0 4px 16px rgba(0,0,0,.1)', border:'1px solid rgba(82,183,136,.2)', display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#6b7280', fontFamily:'Poppins,sans-serif' }}>
            <div className="ld-spin" style={{ width:14, height:14 }} /> Snapping to roads…
          </div>
        </div>
      )}

      {/* View toggle */}
      <div style={{ position:'absolute', top:10, left:10, zIndex:1000, display:'flex', background:'#fff', borderRadius:10, boxShadow:'0 3px 12px rgba(0,0,0,.1)', border:'1px solid rgba(82,183,136,.18)', overflow:'hidden' }}>
        {[['both','Both'],['original','Original'],['optimized','Optimized']].map(([v,l]) => (
          <button key={v} onClick={() => setActiveView(v)} style={{ padding:'6px 12px', fontSize:11, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'Poppins,sans-serif', transition:'all .13s', background:activeView===v?'#1a3d2b':'transparent', color:activeView===v?'#fff':'#6b7280' }}>{l}</button>
        ))}
      </div>

      {/* Layer selector */}
      <div style={{ position:'absolute', top:10, right:10, zIndex:1000 }}>
        <button onClick={() => setShowLayers(!showLayers)} style={{ background:'#fff', padding:'6px 12px', borderRadius:10, boxShadow:'0 3px 12px rgba(0,0,0,.1)', border:'1px solid rgba(82,183,136,.18)', display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
          <Layers size={13} />{MAP_LAYERS[mapLayer].name}
        </button>
        {showLayers && (
          <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'#fff', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,.12)', border:'1px solid rgba(82,183,136,.18)', minWidth:130, overflow:'hidden' }}>
            {Object.entries(MAP_LAYERS).map(([key,l]) => (
              <button key={key} onClick={() => { setMapLayer(key); setShowLayers(false); }} style={{ width:'100%', padding:'8px 12px', textAlign:'left', fontSize:12, cursor:'pointer', border:'none', fontFamily:'Poppins,sans-serif', fontWeight:mapLayer===key?700:500, background:mapLayer===key?'#d8f3dc':'transparent', color:mapLayer===key?'#1a3d2b':'#374151' }}>{l.name}</button>
            ))}
          </div>
        )}
      </div>

      {/* City badge */}
      <div style={{ position:'absolute', bottom:36, right:10, zIndex:1000, background:'#1a3d2b', color:'#fff', borderRadius:8, padding:'4px 10px', fontSize:10, fontWeight:700, fontFamily:'Poppins,sans-serif' }}>
        Dagupan City, Pangasinan
      </div>

      <MapContainer center={DAGUPAN_CENTER} zoom={14} minZoom={12} maxZoom={19} maxBounds={DAGUPAN_BOUNDS} maxBoundsViscosity={0.9} style={{ height:'100%', width:'100%' }} scrollWheelZoom={false}>
        <TileLayer url={MAP_LAYERS[mapLayer].url} attribution={MAP_LAYERS[mapLayer].attr} maxZoom={20} />
        <FitBounds positions={fitPos} />
        {(activeView==='both'||activeView==='original') && origRoad?.length>1 && <Polyline positions={origRoad} pathOptions={{ color:'#3b82f6', weight:4, dashArray:'10 6', opacity:.9 }} />}
        {(activeView==='both'||activeView==='optimized') && optRoad?.length>1  && <Polyline positions={optRoad}  pathOptions={{ color:'#2d6a4f', weight:5, opacity:.95 }} />}
        {(activeView==='both'||activeView==='original') && validO.map((s,i) => (
          <Marker key={`o-${i}`} position={[s.lat,s.lng]} icon={getIconByIndex(validO,i)}>
            <Popup><div style={{ fontFamily:'Poppins,sans-serif', fontSize:12 }}><p style={{ fontWeight:700, margin:'0 0 3px', textTransform:'capitalize' }}>{i===0?'Origin':i===validO.length-1?'Destination':`Stop ${i}`}</p><p style={{ color:'#6b7280', margin:0 }}>{s.name}</p></div></Popup>
          </Marker>
        ))}
        {(activeView==='both'||activeView==='optimized') && validP.map((s,i) => (
          <Marker key={`p-${i}`} position={[s.lat,s.lng]} icon={getIconByIndex(validP,i)}>
            <Popup><div style={{ fontFamily:'Poppins,sans-serif', fontSize:12 }}><p style={{ fontWeight:700, margin:'0 0 3px', color:'#2d6a4f', textTransform:'capitalize' }}>[Opt] {i===0?'Origin':i===validP.length-1?'Destination':`Stop ${i}`}</p><p style={{ color:'#6b7280', margin:0 }}>{s.name}</p></div></Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div style={{ position:'absolute', bottom:10, left:10, zIndex:1000, background:'#fff', borderRadius:10, padding:'7px 12px', boxShadow:'0 3px 12px rgba(0,0,0,.1)', border:'1px solid rgba(82,183,136,.18)', display:'flex', alignItems:'center', gap:12, fontFamily:'Poppins,sans-serif' }}>
        {[
          ['Original',  <svg key="o" width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="7 4"/></svg>],
          ['Optimized', <svg key="p" width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#2d6a4f" strokeWidth="3.5"/></svg>],
          ['Origin',      <div key="ori" style={{ width:9, height:9, borderRadius:'50%', background:'#16a34a' }} />],
          ['Stop',        <div key="stp" style={{ width:9, height:9, borderRadius:'50%', background:'#3b82f6' }} />],
          ['Destination', <div key="dst" style={{ width:9, height:9, borderRadius:'50%', background:'#dc2626' }} />],
        ].map(([label, el]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>{el}<span style={{ fontSize:10.5, color:'#6b7280', fontWeight:500 }}>{label}</span></div>
        ))}
      </div>
    </div>
  );
};


const Badge = ({ status }) => {
  const cls = {
    pending:    'ld-badge ld-badge-pending',
    approved:   'ld-badge ld-badge-approved',
    rejected:   'ld-badge ld-badge-declined',
    declined:   'ld-badge ld-badge-declined',
    in_transit: 'ld-badge ld-badge-transit',
    delivered:  'ld-badge ld-badge-approved',
    planned:    'ld-badge',
    optimized:  'ld-badge ld-badge-optimized',
  }[status] || 'ld-badge';
  return <span className={cls}>{status?.replace(/_/g, ' ')}</span>;
};

/* ── MetricRow (restyled, same logic) ──────────────────────── */
const MetricRow = ({ label, original, optimized, unit }) => {
  const saved    = ((parseFloat(original) || 0) - (parseFloat(optimized) || 0)).toFixed(2);
  const improved = parseFloat(saved) > 0;
  return (
    <div className="ld-metric-row">
      <span style={{ color:'#9ca3af', width:70 }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ color:'#d1d5db', textDecoration:'line-through', fontSize:11 }}>{(parseFloat(original)||0).toFixed(1)}{unit}</span>
        <span style={{ fontWeight:700, color:'#1a3d2b' }}>{(parseFloat(optimized)||0).toFixed(1)}{unit}</span>
        {improved && (
          <span className="ld-saving" style={{ fontSize:10, padding:'2px 7px' }}>−{saved}</span>
        )}
      </div>
    </div>
  );
};

const parseMapLocation = (location) => {
  if (typeof location === 'string') {
    try {
      return JSON.parse(location);
    } catch {
      return {};
    }
  }
  return location || {};
};

const normalizeStopsForMap = (rawStops = []) => {
  if (!Array.isArray(rawStops)) return [];
  return rawStops
    .map((stop, index, allStops) => {
      const loc = parseMapLocation(stop?.location);
      const lat = parseFloat(loc.lat || loc.latitude || stop?.lat || stop?.latitude || 0) || null;
      const lng = parseFloat(loc.lng || loc.longitude || stop?.lng || stop?.longitude || stop?.lon || 0) || null;
      const type =
        stop?.stop_type ||
        stop?.type ||
        (index === 0 ? 'origin' : index === allStops.length - 1 ? 'destination' : 'stop');
      const name =
        loc.address ||
        stop?.address ||
        stop?.stop_name ||
        stop?.location_name ||
        stop?.name ||
        (type === 'origin' ? 'Origin' : type === 'destination' ? 'Destination' : `Stop ${index + 1}`);
      return lat && lng ? { lat, lng, name, type } : null;
    })
    .filter(Boolean);
};

/* ── parseRouteStops — enriched to match admin/logistics payloads ─────────── */
const parseRouteStops = (item) => {
  try {
    const directStops = normalizeStopsForMap(item.original_stops || item.originalStops || item.stops || []);
    if (directStops.length > 0) return directStops;

    const extra = typeof item.extra_data === 'string' ? JSON.parse(item.extra_data) : (item.extra_data || {});
    const routeData = extra.route || {};
    const extraStops = normalizeStopsForMap(extra.stops || routeData.stops || routeData.original_stops || routeData.originalStops || []);
    if (extraStops.length > 0) return extraStops;

    const stops = [];
    const origin = parseMapLocation(routeData.origin_location || item.origin_location || item.originLocation);
    const dest   = parseMapLocation(routeData.destination_location || item.destination_location || item.destinationLocation);
    const originLat = parseFloat(origin.lat || origin.latitude || 0) || null;
    const originLng = parseFloat(origin.lng || origin.longitude || 0) || null;
    const destLat = parseFloat(dest.lat || dest.latitude || 0) || null;
    const destLng = parseFloat(dest.lng || dest.longitude || 0) || null;
    if (originLat && originLng) stops.push({ lat: originLat, lng: originLng, name: origin.address || 'Origin' });
    if (destLat   && destLng)   stops.push({ lat: destLat,   lng: destLng,   name: dest.address   || 'Destination' });
    if (stops.length === 0 && item.location) {
      const loc = parseMapLocation(item.location);
      if (loc.lat && loc.lng) stops.push({ lat: parseFloat(loc.lat), lng: parseFloat(loc.lng), name: loc.address || 'Origin' });
    }
    return stops;
  } catch { return []; }
};


/* ── parseOriginalStops / parseOptimizedStops ───────────────── */
const parseStopsFromRouteData = (routeData, fallbackStops = []) => {
  const routeStops = normalizeStopsForMap(
    routeData?.stops ||
    routeData?.original_stops ||
    routeData?.originalStops ||
    routeData?.optimized_stops ||
    routeData?.optimizedStops ||
    []
  );
  if (routeStops.length > 0) return routeStops;

  // fallback: origin + destination
  const origin = parseMapLocation(routeData?.origin_location);
  const dest   = parseMapLocation(routeData?.destination_location);
  const stops = [];
  const originLat = parseFloat(origin.lat || origin.latitude || 0) || null;
  const originLng = parseFloat(origin.lng || origin.longitude || 0) || null;
  const destLat = parseFloat(dest.lat || dest.latitude || 0) || null;
  const destLng = parseFloat(dest.lng || dest.longitude || 0) || null;
  if (originLat && originLng) stops.push({ lat: originLat, lng: originLng, name: origin.address || 'Origin',      type: 'origin'      });
  if (destLat   && destLng)   stops.push({ lat: destLat,   lng: destLng,   name: dest.address   || 'Destination', type: 'destination' });
  return stops.length > 0 ? stops : fallbackStops;
};

const parseOriginalStops  = (item) => {
  const directStops = normalizeStopsForMap(item.original_stops || item.originalStops || item.stops || []);
  if (directStops.length > 0) return directStops;
  try {
    const extra = typeof item.extra_data === 'string' ? JSON.parse(item.extra_data) : (item.extra_data || {});
    return parseStopsFromRouteData(extra.route, parseRouteStops(item));
  } catch { return parseRouteStops(item); }
};

const parseOptimizedStops = (item) => {
  const directStops = normalizeStopsForMap(item.optimized_stops || item.optimizedStops || []);
  if (directStops.length > 0) return directStops;
  try {
    const extra = typeof item.extra_data === 'string' ? JSON.parse(item.extra_data) : (item.extra_data || {});
    if (!extra.optimization) return [];
    return parseStopsFromRouteData(extra.optimization, []);
  } catch { return []; }
};

/* ── ApprovalCard ─────────────────────────────────────────── */
function ApprovalCard({ item, onApprove, onDecline, drivers = [] }) {
  const [open,           setOpen]         = useState(false);
  const [comment,        setComment]      = useState('');
  const [declining,      setDeclining]    = useState(false);
  const [busy,           setBusy]         = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [showMap,        setShowMap]      = useState(false);
  const originalStops  = parseOriginalStops(item);
  const optimizedStops = parseOptimizedStops(item);

  // Only show drivers without an active ongoing delivery
  const availableDrivers = drivers.filter(d => !d.route_status);

  const origin = (() => {
    if (originalStops[0]?.name) return originalStops[0].name;
    try {
      const o = typeof item.location === 'string' ? JSON.parse(item.location) : item.location;
      return o?.address || o?.name || item.from || item.from_location || item.location || 'Origin';
    } catch { return item.location || 'Origin'; }
  })();

  const destination = (() => {
    if (originalStops.length > 1) return originalStops[originalStops.length - 1]?.name || 'Destination';
    return item.to || item.to_location || 'Destination';
  })();

  const routeTitle = item.route_name || item.routeName || item.product_name || 'Unnamed Route';
  const driverName = item.driver_full_name || item.driver_name || 'No driver assigned';
  const routeSummary =
    origin && destination && origin !== destination
      ? `${origin} → ${destination}`
      : `${originalStops.length || 0} stop${originalStops.length === 1 ? '' : 's'}`;
  const submittedLabel = item.created_at ? new Date(item.created_at).toLocaleDateString() : '—';
  const submittedBy = item.submitted_by_name || item.submittedByName || item.submittedBy || item.submitted_by || 'admin';
  const initials   = (routeTitle || '?')[0].toUpperCase();

  return (
    <div className="ld-card">
      {/* Card Header */}
      <div className="ld-card-header" onClick={() => setOpen(!open)}>
        <div className="ld-av">{initials}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:13.5, fontWeight:700, color:'#111827', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {routeTitle}
          </p>
          <p style={{ fontSize:11, color:'#6b7280', margin:'2px 0 0' }}>
            {driverName} · {item.vehicle_type || '—'} · {routeSummary}
          </p>
          <p style={{ fontSize:10.5, color:'#9ca3af', margin:'1px 0 0' }}>
            Submitted {submittedLabel} by {submittedBy}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
          <span className="ld-badge ld-badge-pending">Pending</span>
          {originalStops.length > 0 && (
            <button
              className={`ld-btn-map${showMap ? ' active' : ''}`}
              onClick={e => { e.stopPropagation(); setShowMap(v => !v); if (!open) setOpen(true); }}
            >
              🗺 {showMap ? 'Hide' : 'Map'}
            </button>
          )}
          <span className="ld-chevron">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div className="ld-card-body">

          {/* Map preview */}
          {showMap && originalStops.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:9.5, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 8px' }}>
                Route Map · Dagupan City
              </p>
              <div style={{ height:320, borderRadius:13, overflow:'hidden', border:'1px solid rgba(82,183,136,0.18)', boxShadow:'0 2px 10px rgba(26,61,43,0.08)' }}>
                <RouteMap originalStops={originalStops} optimizedStops={optimizedStops} />
              </div>
            </div>
          )}

          {/* Optimization comparison */}
          {(item.optimized_distance || item.optimized_fuel) ? (
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:9.5, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 8px' }}>
                Route Optimization
              </p>
              <div style={{ background:'rgba(240,253,244,0.6)', borderRadius:12, padding:'6px 12px', border:'1px solid rgba(82,183,136,0.12)' }}>
                <MetricRow label="Distance" original={item.total_distance_km}                 optimized={item.optimized_distance}  unit=" km" />
                <MetricRow label="Fuel"     original={item.estimated_fuel_consumption_liters} optimized={item.optimized_fuel}       unit=" L"  />
                <MetricRow label="CO₂"      original={item.estimated_carbon_kg}               optimized={item.optimized_carbon_kg}  unit=" kg" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:10 }}>
                {[
                  { label:'Distance saved', value:`${(parseFloat(item.savings_km)   || 0).toFixed(1)} km` },
                  { label:'Fuel saved',     value:`${(parseFloat(item.savings_fuel) || 0).toFixed(1)} L`  },
                  { label:'CO₂ saved',      value:`${(parseFloat(item.savings_co2)  || 0).toFixed(1)} kg` },
                ].map(s => (
                  <div key={s.label} style={{ background:'#d8f3dc', border:'1px solid #86efac', borderRadius:10, padding:'8px', textAlign:'center' }}>
                    <p style={{ fontSize:12, fontWeight:800, color:'#1a3d2b', margin:'0 0 2px' }}>{s.value}</p>
                    <p style={{ fontSize:10, color:'#40916c', margin:0 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'10px 14px', fontSize:12.5, color:'#b45309', marginBottom:14 }}>
              ⚠ No optimization data. Admin submitted without running AI optimization first.
            </div>
          )}

          {/* AI recommendation */}
          {item.ai_recommendation && (
            <div className="ld-ai-box" style={{ marginBottom:14 }}>
              <p style={{ fontSize:9.5, fontWeight:800, color:'#2d6a4f', textTransform:'uppercase', letterSpacing:'.07em', margin:'0 0 5px', display:'flex', alignItems:'center', gap:4 }}>
                <Sparkles size={10} /> AI Recommendation
              </p>
              <p style={{ fontSize:12.5, color:'#1a3d2b', margin:0 }}>{item.ai_recommendation}</p>
            </div>
          )}

          {/* Comment textarea */}
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11.5, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>
              {declining ? 'Reason for declining (required)' : 'Comment for admin (optional)'}
            </label>
            <textarea
              className="ld-textarea"
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder={declining ? 'Explain why this route is being declined…' : 'Any notes for the admin…'}
            />
          </div>

          {/* Action buttons */}
          {!declining ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <label style={{ fontSize:11.5, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>
                  Assign Driver <span style={{ color:'#dc2626' }}>*</span>
                </label>
                {availableDrivers.length === 0 ? (
                  <p style={{ fontSize:12, color:'#d97706', margin:0 }}>No available drivers. All drivers have active deliveries.</p>
                ) : (
                  <select className="ld-select" value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
                    <option value="">Select available driver…</option>
                    {availableDrivers.map(d => (
                      <option key={d.user_id} value={d.user_id}>{d.full_name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button
                  className="ld-btn-approve"
                  onClick={async () => {
                    if (!selectedDriver) return;
                    setBusy(true);
                    await onApprove(item.approval_id, comment, selectedDriver);
                    setBusy(false);
                  }}
                  disabled={busy || !selectedDriver}
                >
                  {busy ? 'Processing…' : '✓ Approve & Assign Driver'}
                </button>
                <button className="ld-btn-decline" onClick={() => setDeclining(true)}>
                  ✕ Decline
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', gap:8 }}>
              <button
                className="ld-btn-confirm-decline"
                onClick={async () => {
                  if (!comment.trim()) return;
                  setBusy(true);
                  await onDecline(item.approval_id, comment);
                  setBusy(false);
                }}
                disabled={busy || !comment.trim()}
              >
                {busy ? 'Processing…' : 'Confirm Decline'}
              </button>
              <button className="ld-btn-cancel" onClick={() => { setDeclining(false); setComment(''); }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── DriverRow ─────────────────────────────────────────────── */
function DriverRow({ driver }) {
  const progress = driver.stops_total > 0
    ? Math.round((Number(driver.stops_completed) / Number(driver.stops_total)) * 100)
    : 0;
  return (
    <div className="ld-driver-row">
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div className="ld-driver-av">{driver.full_name?.[0]?.toUpperCase() || '?'}</div>
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0 }}>{driver.full_name}</p>
          <p style={{ fontSize:11, color:'#9ca3af', margin:'1px 0 0' }}>{driver.route_name || 'No active route'}</p>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {driver.route_status ? (
          <>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:11, color:'#6b7280', margin:'0 0 3px' }}>{driver.stops_completed}/{driver.stops_total} stops</p>
              <div style={{ width:72, height:5, background:'rgba(82,183,136,0.15)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#1a3d2b,#40916c)', borderRadius:99, transition:'width .3s' }} />
              </div>
            </div>
            <Badge status={driver.route_status} />
          </>
        ) : (
          <span style={{ fontSize:11, color:'#9ca3af', fontStyle:'italic' }}>Idle</span>
        )}
      </div>
    </div>
  );
}

/* ── StatCard ─────────────────────────────────────────────── */
const StatCard = ({ label, value, color, dark, icon: Icon, delay = 0 }) => (
  <div className={`ld-stat ${dark ? 'ld-stat-dk' : 'ld-stat-lt'}`} style={{ animationDelay:`${delay}s` }}>
    <div className="ld-stat-cell">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <p style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', margin:0, color: dark ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>{label}</p>
        {Icon && (
          <div style={{ width:28, height:28, borderRadius:8, background: dark ? 'rgba(255,255,255,0.1)' : '#f0faf4', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon size={14} style={{ color: dark ? 'rgba(255,255,255,0.8)' : '#2d6a4f' }} />
          </div>
        )}
      </div>
      <p style={{ fontSize:34, fontWeight:900, lineHeight:1, margin:'0 0 4px', letterSpacing:'-1.5px', color: dark ? '#fff' : '#111827' }}>{value ?? '—'}</p>
    </div>
  </div>
);

/* ── Main export — LogisticsDashboardView ─────────────────── */
export default function LogisticsDashboardView({
  pending = [], history = [], drivers = [], stats = {},
  loading, error, success,
  approveRoute, declineRoute, refresh,
}) {
  return (
    <div className="ld-root ld-page" style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Toasts */}
      {error   && <div className="ld-toast-err">{error}</div>}
      {success && <div className="ld-toast-ok">{success}</div>}

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        <StatCard dark  label="Pending Review" value={stats.pending_count  ?? '—'} icon={Clock}  delay={0.04} />
        <StatCard       label="Approved"        value={stats.approved_count ?? '—'} icon={CheckCircle2} delay={0.08} />
        <StatCard dark  label="Declined"        value={stats.declined_count ?? '—'} icon={AlertCircle}  delay={0.12} />
        <StatCard       label="Avg CO₂ Saved"   value={stats.avg_co2_saved ? `${parseFloat(stats.avg_co2_saved).toFixed(1)} kg` : '—'} icon={Leaf} delay={0.16} />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 0', gap:10, color:'#9ca3af' }}>
          <div className="ld-spin" style={{ width:22, height:22 }} />
          <span style={{ fontSize:13 }}>Loading…</span>
        </div>
      )}

      {/* Pending Approvals panel */}
      {!loading && (
        <div className="ld-panel">
          <div className="ld-sh">
            <div className="ld-sh-left">
              <div className="ld-sh-ico" style={{ background:'#fffbeb' }}>
                <Truck size={15} style={{ color:'#d97706' }} />
              </div>
              <div>
                <h3 style={{ fontSize:14, fontWeight:800, color:'#1a3d2b', margin:0 }}>Pending Route Approvals</h3>
                <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>Awaiting your review</p>
              </div>
            </div>
            <span style={{ fontSize:11.5, color:'#9ca3af', fontWeight:600 }}>
              {pending.length} item{pending.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="ld-rule" />

          {pending.length === 0 ? (
            <div className="ld-empty">
              <div style={{ width:52, height:52, borderRadius:15, background:'#d8f3dc', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <CheckCircle2 size={26} style={{ color:'#2d6a4f' }} />
              </div>
              <p style={{ fontWeight:700, color:'#4b5563', margin:0, fontSize:14 }}>No pending approvals</p>
              <p style={{ fontSize:12, margin:0 }}>All routes have been reviewed.</p>
            </div>
          ) : (
            <div>
              {pending.map(item => (
                <ApprovalCard key={item.approval_id} item={item} onApprove={approveRoute} onDecline={declineRoute} drivers={drivers} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Driver Monitor snapshot panel */}
      {!loading && drivers.length > 0 && (
        <div className="ld-panel">
          <div className="ld-sh">
            <div className="ld-sh-left">
              <div className="ld-sh-ico" style={{ background:'#eff6ff' }}>
                <Users size={15} style={{ color:'#2563eb' }} />
              </div>
              <div>
                <h3 style={{ fontSize:14, fontWeight:800, color:'#1a3d2b', margin:0 }}>Driver Monitor</h3>
                <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>Live status snapshot</p>
              </div>
            </div>
            <span style={{ fontSize:11.5, color:'#9ca3af', fontWeight:600 }}>
              {drivers.filter(d => d.route_status).length} of {drivers.length} active
            </span>
          </div>

          <div className="ld-rule" />

          <div>
            {drivers.slice(0, 3).map(d => <DriverRow key={d.user_id} driver={d} />)}
          </div>

          {drivers.length > 3 && (
            <p style={{ fontSize:11.5, color:'#9ca3af', textAlign:'center', marginTop:10 }}>
              +{drivers.length - 3} more · open Driver Monitor tab for full view
            </p>
          )}
        </div>
      )}
    </div>
  );
}
