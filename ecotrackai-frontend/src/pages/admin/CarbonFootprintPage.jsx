import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../hooks/useAuth';
import useCarbon from '../../hooks/useCarbon';
import HowCalculatedModal from '../../components/HowCalculatedModal';
import MonthlyComparisonModal from '../../components/MonthlyComparisonModal';
import {
  ChevronRight, Leaf, Package, Truck, MapPin,
  RefreshCw, TrendingDown, TrendingUp, BarChart2,
  Zap, Clock, CheckCircle2
} from 'lucide-react';

/* ─── Styles — copied verbatim from AdminDashboardPage ──────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

  .db-root, .db-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  @keyframes db-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes db-slide { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
  @keyframes db-spin  { to{transform:rotate(360deg)} }
  @keyframes db-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

  .db-page { animation:db-in .3s ease both; }

  /* Banner */
  .db-banner {
    background:linear-gradient(130deg,#0f2419 0%,#1a3d2b 50%,#2d6a4f 100%);
    border-radius:20px; padding:20px 24px;
    display:flex; align-items:center; justify-content:space-between;
    box-shadow:0 6px 24px rgba(26,61,43,0.22);
    border:1px solid rgba(82,183,136,0.12);
    position:relative; overflow:hidden;
  }
  .db-banner::after {
    content:''; position:absolute; right:-50px; top:-50px;
    width:180px; height:180px; border-radius:50%;
    background:rgba(255,255,255,0.03); pointer-events:none;
  }
  .db-pulse-dot { width:7px; height:7px; border-radius:50%; background:#4ade80; flex-shrink:0; animation:db-pulse 2.5s ease infinite; box-shadow:0 0 0 3px rgba(74,222,128,0.18); }

  /* Buttons */
  .db-btn-ghost { display:inline-flex; align-items:center; gap:6px; padding:8px 15px; background:rgba(255,255,255,0.08); color:#fff; border-radius:11px; font-size:12.5px; font-weight:600; border:1px solid rgba(255,255,255,0.14); cursor:pointer; transition:background .15s,transform .13s; white-space:nowrap; }
  .db-btn-ghost:hover { background:rgba(255,255,255,0.15); transform:translateY(-1px); }
  .db-btn-solid { display:inline-flex; align-items:center; gap:6px; padding:8px 17px; background:#fff; color:#1a3d2b; border-radius:11px; font-size:12.5px; font-weight:800; border:none; cursor:pointer; transition:transform .13s,box-shadow .15s; box-shadow:0 2px 8px rgba(0,0,0,0.1); white-space:nowrap; }
  .db-btn-solid:hover { transform:translateY(-1px); box-shadow:0 5px 16px rgba(0,0,0,0.14); }

  /* Stat cards */
  .db-stat { border-radius:18px; border:1px solid rgba(82,183,136,0.18); box-shadow:0 2px 10px rgba(26,61,43,0.07); transition:transform .2s,box-shadow .2s; animation:db-in .3s ease both; overflow:hidden; }
  .db-stat:hover { transform:translateY(-3px); box-shadow:0 10px 26px rgba(26,61,43,0.13); }
  .db-stat-dk { background:linear-gradient(145deg,#1a3d2b,#2d6a4f); position:relative; overflow:hidden; }
  .db-stat-dk::after { content:''; position:absolute; right:-20px; top:-20px; width:80px; height:80px; border-radius:50%; background:rgba(255,255,255,0.05); pointer-events:none; }
  .db-stat-lt { background:#fff; }
  .db-stat-cell { padding:16px 18px; position:relative; z-index:1; }

  /* Badges */
  .db-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:99px; font-size:11px; font-weight:600; }
  .db-badge-hi  { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
  .db-badge-md  { background:#fffbeb; color:#b45309; border:1px solid #fde68a; }
  .db-badge-lo  { background:#d8f3dc; color:#2d6a4f; border:1px solid #86efac; }
  .db-badge-ora { background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; }

  /* Panels */
  .db-panel { background:#fff; border-radius:18px; padding:18px 20px; box-shadow:0 2px 12px rgba(26,61,43,0.07); border:1px solid rgba(82,183,136,0.14); animation:db-in .32s ease both; }

  /* Rows */
  .db-row { display:flex; align-items:center; gap:10px; padding:11px 12px; border-radius:13px; border:1px solid rgba(82,183,136,0.13); background:rgba(216,243,220,0.16); margin-bottom:7px; transition:border-color .15s,background .15s; animation:db-slide .22s ease both; }
  .db-row:hover { border-color:#52b788; background:rgba(216,243,220,0.42); }
  .db-row:nth-child(1){animation-delay:.03s} .db-row:nth-child(2){animation-delay:.06s} .db-row:nth-child(3){animation-delay:.09s}

  /* Nav btn */
  .db-nav-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:5px; font-size:12px; font-weight:600; color:#2d6a4f; background:none; border:none; border-radius:10px; cursor:pointer; padding:7px; margin-top:4px; transition:background .13s; }
  .db-nav-btn:hover { background:rgba(216,243,220,0.65); }

  .db-rule { height:1px; background:rgba(82,183,136,0.1); margin:13px 0; }
  .db-sh { display:flex; align-items:center; justify-content:space-between; margin-bottom:13px; }
  .db-sh-left { display:flex; align-items:center; gap:9px; }
  .db-sh-ico { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .db-spin { border-radius:50%; border:2.5px solid #95d5b2; border-top-color:#2d6a4f; animation:db-spin .65s linear infinite; }
  .db-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; height:160px; gap:9px; color:#9ca3af; text-align:center; }
`;

if (typeof document !== 'undefined' && !document.getElementById('db-styles')) {
  const el = document.createElement('style');
  el.id = 'db-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ─── StatCard — copied verbatim from AdminDashboardPage ────────────────────── */
const StatCard = ({ label, value, sub, icon: Icon, dark, delay = 0 }) => (
  <div className={`db-stat ${dark ? 'db-stat-dk' : 'db-stat-lt'}`} style={{ animationDelay:`${delay}s` }}>
    <div className="db-stat-cell">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', margin:0, color: dark ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>{label}</p>
        <div style={{ width:30, height:30, borderRadius:9, background: dark ? 'rgba(255,255,255,0.1)' : '#f0faf4', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={15} style={{ color: dark ? 'rgba(255,255,255,0.85)' : '#2d6a4f' }} />
        </div>
      </div>
      <p style={{ fontSize:38, fontWeight:900, lineHeight:1, margin:'0 0 6px', letterSpacing:'-1.5px', color: dark ? '#fff' : '#111827' }}>{value}</p>
      <p style={{ fontSize:11, margin:0, color: dark ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>{sub}</p>
    </div>
  </div>
);

/* ─── CarbonFootprintPage ───────────────────────────────────────────────────── */
const CarbonFootprintPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    loading, error, carbonData,
    showHowCalculated, showMonthlyComparison,
    decreaseAmount, loadCarbonData,
    setShowHowCalculated, setShowMonthlyComparison,
  } = useCarbon();

  if (!user) return null;

  const { thisMonth, comparison } = carbonData;
  const today = new Date().toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric', year:'numeric' });

  return (
    <Layout currentPage="Carbon Footprint" user={user}>

      {showHowCalculated && (
        <HowCalculatedModal onClose={() => setShowHowCalculated(false)} currentData={thisMonth} />
      )}
      {showMonthlyComparison && (
        <MonthlyComparisonModal
          onClose={() => setShowMonthlyComparison(false)}
          currentData={{ ...thisMonth, comparison }}
        />
      )}

      <div className="db-root db-page" style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* ── Banner ── */}
        <div className="db-banner">
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
              <div style={{ width:26, height:26, borderRadius:7, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Leaf size={13} style={{ color:'#86efac' }} />
              </div>
              <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.1em' }}>
                EcoTrackAI — Carbon Footprint
              </span>
            </div>
            <h1 style={{ color:'#fff', fontSize:20, fontWeight:900, margin:'0 0 7px', letterSpacing:'-.4px' }}>
              {thisMonth.month || 'This Month'}
            </h1>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div className="db-pulse-dot" />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:500 }}>Tracking Active</span>
              </div>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>|</span>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <Clock size={10} style={{ color:'rgba(255,255,255,0.35)' }} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>{today}</span>
              </div>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>|</span>
              {comparison.trend === 'decreased' ? (
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <TrendingDown size={11} style={{ color:'#86efac' }} />
                  <span style={{ fontSize:11, color:'#86efac', fontWeight:600 }}>↓ {decreaseAmount}% from last month</span>
                </div>
              ) : comparison.trend === 'increased' ? (
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <TrendingUp size={11} style={{ color:'#fca5a5' }} />
                  <span style={{ fontSize:11, color:'#fca5a5', fontWeight:600 }}>↑ {decreaseAmount}% from last month</span>
                </div>
              ) : (
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>No change from last month</span>
              )}
            </div>
          </div>

          <div style={{ display:'flex', gap:8, zIndex:1, flexWrap:'wrap', alignItems:'center' }}>
            <button className="db-btn-ghost" onClick={loadCarbonData} disabled={loading}>
              <RefreshCw size={12} style={loading ? { animation:'db-spin .7s linear infinite' } : {}} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button className="db-btn-ghost" onClick={() => setShowHowCalculated(true)}>
              <BarChart2 size={12} /> How it's calculated
            </button>
            <button className="db-btn-solid" onClick={() => setShowMonthlyComparison(true)}>
              <TrendingDown size={13} /> Monthly Comparison
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <StatCard dark  label="Total Emissions"  value={loading ? '—' : thisMonth.totalEmissions.toFixed(1)} sub="kg CO₂ this month"  icon={Leaf}    delay={0.04} />
          <StatCard       label="Delivery Trips"   value={loading ? '—' : thisMonth.deliveryTrips}             sub="This month"         icon={Truck}   delay={0.08} />
          <StatCard dark  label="KM Traveled"      value={loading ? '—' : thisMonth.distanceTraveled.toFixed(1)} sub="Total distance"   icon={MapPin}  delay={0.12} />
          <StatCard       label="Fuel Used"         value={loading ? '—' : thisMonth.litersOfFuelUsed.toFixed(1)} sub="Liters consumed" icon={Package} delay={0.16} />
        </div>

        {/* ── Two-Column Panels ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

          {/* LEFT — Emissions Summary */}
          <div className="db-panel">
            <div className="db-sh">
              <div className="db-sh-left">
                <div className="db-sh-ico" style={{ background:'#d8f3dc' }}>
                  <Leaf size={15} style={{ color:'#16a34a' }} />
                </div>
                <div>
                  <h3 style={{ fontSize:14, fontWeight:800, color:'#1a3d2b', margin:0 }}>Emissions Summary</h3>
                  <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>vs. previous month</p>
                </div>
              </div>
              {comparison.trend === 'decreased'
                ? <span className="db-badge db-badge-lo"><TrendingDown size={10} />−{decreaseAmount}%</span>
                : comparison.trend === 'increased'
                ? <span className="db-badge db-badge-hi"><TrendingUp size={10} />+{decreaseAmount}%</span>
                : <span className="db-badge db-badge-md">No change</span>
              }
            </div>

            <div className="db-rule" />

            {loading ? (
              <div className="db-empty">
                <div className="db-spin" style={{ width:24, height:24 }} />
                <p style={{ fontSize:13, margin:0 }}>Loading…</p>
              </div>
            ) : (
              <>
                {/* Big number */}
                <div style={{ background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)', borderRadius:13, padding:'20px', textAlign:'center', marginBottom:14 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'#2d6a4f', textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 6px' }}>Total CO₂ Emissions</p>
                  <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:6 }}>
                    <span style={{ fontSize:52, fontWeight:900, lineHeight:1, letterSpacing:'-2px', color:'#1a3d2b' }}>
                      {thisMonth.totalEmissions.toFixed(1)}
                    </span>
                    <span style={{ fontSize:18, fontWeight:600, color:'#2d6a4f', marginBottom:8 }}>kg CO₂</span>
                  </div>
                </div>

                {/* Breakdown rows */}
                <div className="db-row">
                  <div style={{ width:34, height:34, borderRadius:10, background:'#d8f3dc', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Truck size={16} style={{ color:'#1a3d2b' }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0 }}>Delivery Trips</p>
                    <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>This month</p>
                  </div>
                  <span style={{ fontSize:20, fontWeight:900, color:'#1a3d2b' }}>{thisMonth.deliveryTrips}</span>
                </div>
                <div className="db-row">
                  <div style={{ width:34, height:34, borderRadius:10, background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <MapPin size={16} style={{ color:'#1d4ed8' }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0 }}>KM Traveled</p>
                    <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>Total distance</p>
                  </div>
                  <span style={{ fontSize:20, fontWeight:900, color:'#1a3d2b' }}>{thisMonth.distanceTraveled.toFixed(1)}</span>
                </div>
                <div className="db-row">
                  <div style={{ width:34, height:34, borderRadius:10, background:'#fef9c3', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Package size={16} style={{ color:'#92400e' }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0 }}>Liters of Fuel Used</p>
                    <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>Total consumption</p>
                  </div>
                  <span style={{ fontSize:20, fontWeight:900, color:'#1a3d2b' }}>{thisMonth.litersOfFuelUsed.toFixed(1)}</span>
                </div>

                <button className="db-nav-btn" onClick={() => navigate('/deliveries')}>
                  View all deliveries <ChevronRight size={13} />
                </button>
              </>
            )}
          </div>

          {/* RIGHT — Tips */}
          <div className="db-panel">
            <div className="db-sh">
              <div className="db-sh-left">
                <div className="db-sh-ico" style={{ background:'#fef9c3' }}>
                  <Zap size={15} style={{ color:'#d97706' }} />
                </div>
                <div>
                  <h3 style={{ fontSize:14, fontWeight:800, color:'#1a3d2b', margin:0 }}>Tips to Reduce</h3>
                  <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>Actionable improvements</p>
                </div>
              </div>
              <span className="db-badge db-badge-lo">
                <CheckCircle2 size={10} /> 3 tips
              </span>
            </div>

            <div className="db-rule" />

            {[
              { tip:'Optimize delivery routes to reduce fuel consumption',  impact:'Can save up to 15% CO₂ emissions',  icon: Truck,      bg:'#d8f3dc', ic:'#1a3d2b' },
              { tip:'Consolidate deliveries to minimize trips',             impact:'Reduces emissions by 20–30%',        icon: Package,    bg:'#fef9c3', ic:'#92400e' },
              { tip:'Switch to eco-friendly vehicles when possible',        impact:'Can cut emissions by up to 50%',     icon: Leaf,       bg:'#d8f3dc', ic:'#166534' },
            ].map((t, i) => (
              <div key={i} className="db-row" style={{ animationDelay:`${i * 0.07}s`, alignItems:'flex-start' }}>
                <div style={{ width:34, height:34, borderRadius:10, background:t.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                  <t.icon size={16} style={{ color:t.ic }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:'0 0 2px' }}>{t.tip}</p>
                  <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>{t.impact}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default CarbonFootprintPage;
