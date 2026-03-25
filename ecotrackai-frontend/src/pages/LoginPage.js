import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Search, X, TrendingUp, Leaf, Users, Award,
  ChevronRight, Shield, BarChart2, Truck, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDashboardRoute } from '../utils/rolePermissions';
import api from '../services/api';

// ─── EcoTrust level helpers ───────────────────────────────────────────────────
// SYNCED to ecotrust.service.js (backend) and useEcoTrust.js TRUST_LEVELS
const LEVELS     = ['Newcomer', 'Eco Warrior', 'Eco Champion', 'Eco Leader', 'Eco Legend'];
const THRESHOLDS = [0, 500, 1000, 2000, 4000];
const NEXT_AT    = [500, 1000, 2000, 4000, null];

const LEVEL_META = {
  'Newcomer':     { pill: '#ECFDF5', pillText: '#065F46', bar: '#6EE7B7', border: '#A7F3D0' },
  'Eco Warrior':  { pill: '#D1FAE5', pillText: '#065F46', bar: '#34D399', border: '#6EE7B7' },
  'Eco Champion': { pill: '#A7F3D0', pillText: '#065F46', bar: '#10B981', border: '#34D399' },
  'Eco Leader':   { pill: '#065F46', pillText: '#ECFDF5', bar: '#059669', border: '#047857' },
  'Eco Legend':   { pill: '#1a3d2b', pillText: '#86efac', bar: '#059669', border: '#065F46' },
};

const AVATARS = [
  { bg: '#ECFDF5', fg: '#065F46' },
  { bg: '#EFF6FF', fg: '#1E40AF' },
  { bg: '#F5F3FF', fg: '#4C1D95' },
  { bg: '#FFFBEB', fg: '#78350F' },
  { bg: '#FFF1F2', fg: '#881337' },
];

function levelOf(s) {
  if (s >= 4000) return 'Eco Legend';
  if (s >= 2000) return 'Eco Leader';
  if (s >= 1000) return 'Eco Champion';
  if (s >= 500)  return 'Eco Warrior';
  return 'Newcomer';
}
function progressTo(s) {
  const i    = LEVELS.indexOf(levelOf(s));
  const next = NEXT_AT[i];
  if (!next) return 100;
  return Math.round(((s - THRESHOLDS[i]) / (next - THRESHOLDS[i])) * 100);
}
function ini(n) {
  return (n || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ biz, onClose }) => {
  if (!biz) return null;
  const lv   = levelOf(biz.score);
  const meta = LEVEL_META[lv] || LEVEL_META['Newcomer'];
  const av   = AVATARS[(biz.business_id || biz.id || 0) % 5];
  const prog = progressTo(biz.score);
  const next = NEXT_AT[LEVELS.indexOf(lv)];

  // ── Counts from API (how many times each action occurred) ──────────────────
  const spoilageCount  = Number(biz.spoilage_actions)  || 0;
  const routeCount     = Number(biz.route_actions)     || 0;
  const carbonCount    = Number(biz.carbon_actions)    || 0;
  const deliveryCount  = Number(biz.delivery_actions)  || 0;

  // ── Actual points from API (SUM of real points_earned per category) ─────────
  // Falls back to count × default only if the pts fields are absent (old API).
  const spoilagePts    = Number(biz.spoilage_pts)  ?? (spoilageCount  * 25);
  const routePts       = Number(biz.route_pts)     ?? (routeCount     * 30);
  const carbonPts      = Number(biz.carbon_pts)    ?? (carbonCount    * 20);
  const deliveryPts    = Number(biz.delivery_pts)  ?? (deliveryCount  * 10);

  const rows = [
    { label: 'Spoilage prevention', n: spoilageCount,  pts: spoilagePts,  Icon: Shield     },
    { label: 'Optimised routes',    n: routeCount,     pts: routePts,     Icon: TrendingUp },
    { label: 'Carbon verified',     n: carbonCount,    pts: carbonPts,    Icon: BarChart2  },
    { label: 'On-time deliveries',  n: deliveryCount,  pts: deliveryPts,  Icon: Truck      },
  ];

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.35)', backdropFilter:'blur(4px)',
               zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
    >
      <div style={{ background:'#fff', borderRadius:20, padding:'28px', width:400, maxWidth:'95vw',
                    maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.12)' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:46, height:46, borderRadius:12, background:av.bg, color:av.fg,
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700 }}>
              {ini(biz.business_name || biz.name)}
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:'#111827' }}>{biz.business_name || biz.name}</div>
              <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>Rank #{biz.rank}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:'1px solid #E5E7EB',
            background:'#F9FAFB', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6B7280' }}>
            <X size={14} />
          </button>
        </div>

        {/* Level pill */}
        <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px',
          borderRadius:100, background:meta.pill, color:meta.pillText, fontSize:12, fontWeight:600, marginBottom:18 }}>
          <Leaf size={12} />{lv}
        </span>

        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
          {[
            { k:'EcoScore',         v: Number(biz.score).toLocaleString() },
            { k:'Platform rank',    v: `#${biz.rank}` },
            { k:'Spoilage actions', v: spoilageCount },
            { k:'Deliveries',       v: deliveryCount },
          ].map(s => (
            <div key={s.k} style={{ background:'#F9FAFB', border:'1px solid #F3F4F6', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ fontSize:22, fontWeight:800, color:'#111827' }}>{s.v}</div>
              <div style={{ fontSize:11, color:'#9CA3AF', marginTop:3 }}>{s.k}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#6B7280', marginBottom:8 }}>
            <span>Progress to {next ? LEVELS[LEVELS.indexOf(lv)+1] : 'Max level'}</span>
            <span style={{ fontWeight:700, color:'#2d6a4f' }}>{prog}%</span>
          </div>
          <div style={{ height:6, background:'#F3F4F6', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${prog}%`, background:meta.bar, borderRadius:3, transition:'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize:11, color:'#9CA3AF', marginTop:6 }}>
            {next ? `${(next - biz.score).toLocaleString()} pts to next level` : 'Maximum level achieved'}
          </div>
        </div>

        {/* Points breakdown — uses real pts from API */}
        <div style={{ borderTop:'1px solid #F3F4F6', paddingTop:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', letterSpacing:'0.7px', textTransform:'uppercase', marginBottom:10 }}>
            Points breakdown
          </div>
          {rows.map(r => (
            <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'9px 0', borderBottom:'1px solid #F9FAFB' }}>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <r.Icon size={13} color="#40916c" />
                <span style={{ fontSize:13, color:'#374151' }}>
                  {r.label} <span style={{ color:'#D1D5DB' }}>×{r.n}</span>
                </span>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:'#2d6a4f' }}>+{r.pts.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main LoginPage ───────────────────────────────────────────────────────────
const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData,  setFormData]  = useState({ identifier: '', password: '' });
  const [error,      setError]      = useState(null);   // { message, type, hint }
  const [fieldError, setFieldError] = useState('');     // 'identifier' | 'password' | ''
  const [loading,   setLoading]   = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [logoErr,   setLogoErr]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');
  const [selected,  setSelected]  = useState(null);

  const [businesses, setBusinesses] = useState([]);
  const [bizLoading, setBizLoading] = useState(true);
  const [bizError,   setBizError]   = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setBizLoading(true);
      setBizError('');
      try {
        const res  = await api.get('/ecotrust/public-leaderboard?limit=20');
        const data = res.data?.data || res.data || [];
        // Spread all fields — preserves spoilage_pts, route_pts, carbon_pts, delivery_pts
        const normalised = (Array.isArray(data) ? data : []).map((b, i) => ({
          ...b,
          id:    b.business_id || i,
          name:  b.business_name,
          score: parseInt(b.score) || 0,
          rank:  b.rank || i + 1,
        }));
        setBusinesses(normalised);
      } catch (e) {
        console.error('Failed to load public leaderboard:', e);
        setBizError('Could not load leaderboard data.');
        setBusinesses([]);
      } finally {
        setBizLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const SORTED   = [...businesses].sort((a, b) => b.score - a.score).map((b, i) => ({ ...b, rank: i + 1 }));
  const maxScore = SORTED[0]?.score || 1;

  const visible = SORTED.filter(b => {
    const q = search.toLowerCase();
    return (!q || (b.name || '').toLowerCase().includes(q))
        && (filter === 'all' || levelOf(b.score) === filter);
  });

  const totalPts = businesses.reduce((s, b) => s + (parseInt(b.score) || 0), 0);
  const FILTERS  = ['all', 'Eco Legend', 'Eco Leader', 'Eco Champion', 'Eco Warrior', 'Newcomer'];

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    setError(null);
    setFieldError('');
  };
  const handleSubmit = async e => {
    e.preventDefault();
   
    // Basic client-side guard
    if (!formData.identifier.trim()) {
      setError({ message: 'Please enter your email or username.', type: 'warn' });
      setFieldError('identifier');
      return;
    }
    if (!formData.password) {
      setError({ message: 'Please enter your password.', type: 'warn' });
      setFieldError('password');
      return;
    }
   
    setLoading(true);
    setError(null);
    setFieldError('');
   
    try {
      const result = await login({ identifier: formData.identifier.trim(), password: formData.password });
      navigate(getDashboardRoute(result?.data?.user?.role), { replace: true });
    } catch (err) {
      const status  = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || '';
   
      // Map known cases to helpful copy ─────────────────────────────────────────
      if (status === 401 || /invalid credentials/i.test(message)) {
        setError({
          message: 'Incorrect email/username or password. Please try again.',
          type: 'error',
        });
        setFieldError('password');
   
      } else if (status === 403 && /not been verified/i.test(message)) {
        setError({
          message: 'Your email has not been verified yet.',
          type: 'warn',
          hint: 'Please check your inbox for the verification code.',
          action: { label: 'Resend code', path: '/verify-otp' },
        });
   
      } else if (status === 403 && /web portal/i.test(message)) {
        setError({
          message: 'This account type cannot log in here.',
          type: 'info',
          hint: 'Driver accounts must use the EcoTrackAI mobile app.',
        });
   
      } else if (status === 403 && /deactivated/i.test(message)) {
        setError({
          message: 'Your account has been deactivated.',
          type: 'error',
          hint: 'Please contact your business administrator.',
        });
   
      } else if (!message || /login failed/i.test(message)) {
        setError({
          message: 'Unable to sign in right now. Please try again in a moment.',
          type: 'error',
        });
   
      } else {
        // Pass through any other backend message verbatim
        setError({ message, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F8FAF9', fontFamily:"'Poppins','Inter','Helvetica Neue',sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .inp-field:focus {
          border-color: #40916c !important;
          box-shadow: 0 0 0 3px rgba(45,106,79,0.12) !important;
          outline: none;
        }
        .sign-btn:hover:not(:disabled) { background: #1a3d2b !important; }
        .sign-btn:active:not(:disabled) { transform: scale(0.99); }
        .biz-row:hover { background: #d8f3dc !important; border-color: #95d5b2 !important; }
        .filter-chip:hover {
          border-color: #95d5b2 !important;
          color: #1a3d2b !important;
          background: #d8f3dc !important;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #b7e4c7; border-radius: 4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ══ Navbar ══ */}
      <nav style={{
        background: 'linear-gradient(130deg,#0f2419 0%,#1a3d2b 50%,#2d6a4f 100%)',
        borderBottom: '1px solid rgba(82,183,136,0.18)',
        padding: '0 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60, position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(26,61,43,0.18)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {logoErr
            ? <div style={{ width:34, height:34, borderRadius:9,
                            background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.18)',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Leaf size={17} color="#86efac" />
              </div>
            : <img src="/logo.jpg" alt="EcoTrackAI" onError={() => setLogoErr(true)}
                style={{ width:34, height:34, borderRadius:9, objectFit:'cover', border:'1px solid rgba(255,255,255,0.18)' }} />
          }
          <span style={{ fontSize:15, fontWeight:700, color:'#fff', letterSpacing:'-0.2px' }}>EcoTrackAI</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{
            width:7, height:7, borderRadius:'50%', background:'#4ade80',
            boxShadow:'0 0 0 3px rgba(74,222,128,0.2)', display:'inline-block',
          }} />
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.65)', fontWeight:500 }}>Live rankings</span>
        </div>
      </nav>

      {/* ══ Hero / Login section ══ */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'60px 24px 40px', display:'grid',
                    gridTemplateColumns:'1fr 420px', gap:64, alignItems:'flex-start' }}>

        {/* left copy */}
        <div>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:6,
            background:'#d8f3dc', border:'1px solid #95d5b2',
            borderRadius:100, padding:'5px 12px', marginBottom:22,
          }}>
            <Leaf size={11} color="#2d6a4f" />
            <span style={{ fontSize:11, fontWeight:600, color:'#2d6a4f', letterSpacing:'0.4px' }}>
              Environmental Intelligence Platform
            </span>
          </div>

          <h1 style={{ fontSize:42, fontWeight:800, color:'#111827', lineHeight:1.1,
                       letterSpacing:'-1px', marginBottom:18 }}>
            Every green action<br />
            <span style={{ color:'#2d6a4f' }}>counts.</span>
          </h1>

          <p style={{ fontSize:15, color:'#6B7280', lineHeight:1.7, maxWidth:440, marginBottom:32 }}>
            EcoTrackAI tracks spoilage prevention, optimised deliveries, and verified carbon records — turning real operational decisions into an environmental trust score.
          </p>

          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[
              { Icon:Users, val: bizLoading ? '…' : businesses.length,                                              lbl:'Businesses on platform' },
              { Icon:Award, val: bizLoading ? '…' : totalPts >= 1000 ? `${(totalPts/1000).toFixed(1)}k` : totalPts, lbl:'Total EcoTrust pts'      },
            ].map(c => (
              <div key={c.lbl} style={{
                display:'flex', alignItems:'center', gap:10, background:'#fff',
                border:'1px solid rgba(82,183,136,0.2)', borderRadius:14,
                padding:'14px 18px', minWidth:170,
                boxShadow:'0 2px 10px rgba(26,61,43,0.07)',
              }}>
                <div style={{
                  width:34, height:34, borderRadius:9,
                  background:'linear-gradient(145deg,#1a3d2b,#2d6a4f)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <c.Icon size={15} color="#86efac" />
                </div>
                <div>
                  <div style={{ fontSize:20, fontWeight:900, color:'#111827', lineHeight:1, letterSpacing:'-0.5px' }}>{c.val}</div>
                  <div style={{ fontSize:11, color:'#9CA3AF', marginTop:3 }}>{c.lbl}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* right — login card */}
        <div style={{
          background:'#fff', border:'1px solid rgba(82,183,136,0.18)', borderRadius:20,
          padding:'32px', boxShadow:'0 4px 24px rgba(26,61,43,0.1)',
        }}>
          <div style={{ marginBottom:24 }}>
            <div style={{
              height:4, width:48, borderRadius:4,
              background:'linear-gradient(90deg,#1a3d2b,#40916c)',
              marginBottom:16,
            }} />
            <h2 style={{ fontSize:20, fontWeight:800, color:'#111827', letterSpacing:'-0.4px' }}>Welcome back</h2>
            <p style={{ fontSize:13, color:'#9CA3AF', marginTop:4 }}>Sign in to your operations dashboard</p>
          </div>

          {error && (() => {
  const palette = {
    error: { bg: '#FEF2F2', border: '#FECACA', icon: '✕',  iconColor: '#DC2626', text: '#B91C1C' },
    warn:  { bg: '#FFFBEB', border: '#FDE68A', icon: '⚠',  iconColor: '#D97706', text: '#92400E' },
    info:  { bg: '#EFF6FF', border: '#BFDBFE', icon: 'ℹ',  iconColor: '#2563EB', text: '#1E40AF' },
  };
  const p = palette[error.type] || palette.error;
  return (
    <div style={{
      background: p.bg, border: `1px solid ${p.border}`, borderRadius: 10,
      padding: '10px 14px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 14, color: p.iconColor, lineHeight: 1.4, flexShrink: 0 }}>
          {p.icon}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: p.text, fontWeight: 600, margin: 0 }}>
            {error.message}
          </p>
          {error.hint && (
            <p style={{ fontSize: 12, color: p.text, opacity: 0.8, margin: '3px 0 0' }}>
              {error.hint}
            </p>
          )}
          {error.action && (
            <button
              type="button"
              onClick={() => navigate(error.action.path)}
              style={{
                marginTop: 6, background: 'none', border: 'none', padding: 0,
                fontSize: 12, fontWeight: 700, color: p.iconColor,
                cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              {error.action.label} →
            </button>
          )}
        </div>
        
      </div>
    </div>
  );
})()}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label htmlFor="identifier" style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
                Email or username
              </label>
              <input id="identifier" type="text" name="identifier" value={formData.identifier}
                onChange={handleChange} required autoComplete="username" placeholder="Enter your email"
                className="inp-field"
                style={{ width:'100%', height:44, padding:'0 14px', borderColor: fieldError === 'identifier' ? '#EF4444' : '#E5E7EB',
                  borderRadius:10, background:'#FAFAFA', color:'#111827', fontSize:14,
                  fontFamily:'inherit', boxSizing:'border-box', transition:'border-color 0.15s, box-shadow 0.15s' }} />
            </div>

            <div>
              <label htmlFor="password" style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <input id="password" type={showPass ? 'text' : 'password'} name="password"
                  value={formData.password} onChange={handleChange} required
                  placeholder="Enter your password" className="inp-field"
                  style={{ width:'100%', height:44, padding:'0 44px 0 14px', borderColor: fieldError === 'password'   ? '#EF4444' : '#E5E7EB',
                    borderRadius:10, background:'#FAFAFA', color:'#111827', fontSize:14,
                    fontFamily:'inherit', boxSizing:'border-box', transition:'border-color 0.15s, box-shadow 0.15s' }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'#9CA3AF',
                    display:'flex', alignItems:'center', padding:4 }}>
                  {showPass ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign:'right', marginTop:-6 }}>
              <button type="button" onClick={() => navigate('/forgot-password')}
                style={{ background:'none', border:'none', fontSize:12, color:'#2d6a4f', cursor:'pointer', fontWeight:600 }}>
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} className="sign-btn"
              style={{
                width:'100%', height:46,
                background:'linear-gradient(135deg,#1a3d2b,#2d6a4f)',
                border:'none', borderRadius:10,
                color:'#fff', fontSize:14, fontWeight:700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, fontFamily:'inherit',
                boxShadow:'0 2px 10px rgba(26,61,43,0.22)',
                transition:'background 0.15s, transform 0.1s, opacity 0.15s',
              }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:18, fontSize:13, color:'#9CA3AF' }}>
            New to EcoTrackAI?{' '}
            <button type="button" onClick={() => navigate('/register')}
              style={{ background:'none', border:'none', color:'#2d6a4f', fontWeight:700, cursor:'pointer', fontSize:13 }}>
              Register your business
            </button>
          </p>
        </div>
      </div>

      {/* ══ Leaderboard section ══ */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      borderTop:'1px solid rgba(82,183,136,0.18)', paddingTop:40, marginBottom:28 }}>
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, color:'#111827', letterSpacing:'-0.4px' }}>
              Environmental Leaderboard
            </h2>
            <p style={{ fontSize:13, color:'#9CA3AF', marginTop:4 }}>
              All registered businesses ranked by EcoTrust score
            </p>
          </div>
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            background:'#d8f3dc', border:'1px solid #95d5b2',
            borderRadius:100, padding:'6px 14px',
          }}>
            <span style={{
              width:7, height:7, borderRadius:'50%', background:'#40916c',
              boxShadow:'0 0 0 3px rgba(64,145,108,0.2)', display:'inline-block',
            }} />
            <span style={{ fontSize:12, color:'#2d6a4f', fontWeight:600 }}>Live data</span>
          </div>
        </div>

        {/* search + filters */}
        <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:220 }}>
            <Search size={14} color="#9CA3AF"
              style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
            <input placeholder="Search businesses…" value={search}
              onChange={e => setSearch(e.target.value)} className="inp-field"
              style={{ width:'100%', height:40, paddingLeft:36, paddingRight:14, border:'1.5px solid #E5E7EB',
                borderRadius:10, background:'#fff', color:'#111827', fontSize:13,
                fontFamily:'inherit', boxSizing:'border-box', transition:'border-color 0.15s, box-shadow 0.15s' }} />
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} className={filter===f ? '' : 'filter-chip'}
                onClick={() => setFilter(f)}
                style={{
                  height:36, padding:'0 14px', borderRadius:100,
                  border: filter===f ? '1.5px solid #2d6a4f' : '1.5px solid #E5E7EB',
                  background: filter===f ? 'linear-gradient(135deg,#1a3d2b,#2d6a4f)' : '#fff',
                  color: filter===f ? '#fff' : '#6B7280',
                  fontSize:12, fontWeight:600, cursor:'pointer',
                  fontFamily:'inherit', transition:'all 0.12s',
                  boxShadow: filter===f ? '0 2px 8px rgba(26,61,43,0.18)' : 'none',
                }}>
                {f === 'all' ? 'All levels' : f}
              </button>
            ))}
          </div>
        </div>

        {bizLoading && (
          <div style={{ textAlign:'center', padding:'3rem', color:'#9CA3AF' }}>
            <RefreshCw size={20} style={{ animation:'spin 0.8s linear infinite', margin:'0 auto 8px', display:'block', color:'#2d6a4f' }} />
            <p style={{ fontSize:13 }}>Loading leaderboard…</p>
          </div>
        )}
        {!bizLoading && bizError && (
          <div style={{ textAlign:'center', padding:'2rem', color:'#DC2626', fontSize:13 }}>
            {bizError}
          </div>
        )}

        {/* Table header — Type column removed */}
        {!bizLoading && !bizError && (
          <>
            <div style={{
              display:'grid',
              gridTemplateColumns:'44px 1fr 120px 130px 32px',
              gap:12, padding:'0 16px', marginBottom:8,
            }}>
              {['#', 'Business', 'Score', 'Level', ''].map((h, i) => (
                <div key={i} style={{
                  fontSize:11, fontWeight:700, color:'#9CA3AF',
                  letterSpacing:'0.5px', textTransform:'uppercase',
                  textAlign: i >= 2 ? 'right' : 'left',
                }}>
                  {h}
                </div>
              ))}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {visible.length === 0 && (
                <div style={{ textAlign:'center', padding:'3rem', color:'#D1D5DB', fontSize:14 }}>
                  {businesses.length === 0 ? 'No businesses registered yet.' : 'No businesses match your search.'}
                </div>
              )}
              {visible.map(b => {
                const lv   = levelOf(b.score);
                const meta = LEVEL_META[lv] || LEVEL_META['Newcomer'];
                const av   = AVATARS[(b.id || 0) % 5];
                const bar  = Math.round((b.score / maxScore) * 100);
                const rs   = b.rank === 1
                  ? { bg:'#FFFBEB', numBg:'#FEF3C7', numFg:'#92400E', numBorder:'#FDE68A' }
                  : b.rank === 2
                  ? { bg:'#FAFAFA', numBg:'#F3F4F6', numFg:'#374151', numBorder:'#E5E7EB' }
                  : b.rank === 3
                  ? { bg:'#FFFAF5', numBg:'#FEF3C7', numFg:'#9A3412', numBorder:'#FED7AA' }
                  : { bg:'#fff',    numBg:'transparent', numFg:'#9CA3AF', numBorder:'transparent' };

                return (
                  <div key={b.id} className="biz-row" onClick={() => setSelected(b)}
                    style={{
                      display:'grid',
                      gridTemplateColumns:'44px 1fr 120px 130px 32px',
                      gap:12, alignItems:'center', background:rs.bg,
                      border:'1px solid rgba(82,183,136,0.13)',
                      borderRadius:14, padding:'12px 16px', cursor:'pointer',
                      boxShadow:'0 1px 4px rgba(26,61,43,0.05)',
                      transition:'background 0.12s, border-color 0.12s',
                    }}>

                    <div style={{ width:26, height:26, borderRadius:'50%', background:rs.numBg,
                                  border:`1px solid ${rs.numBorder}`, display:'flex', alignItems:'center',
                                  justifyContent:'center', fontSize:12, fontWeight:700, color:rs.numFg }}>
                      {b.rank}
                    </div>

                    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:av.bg, color:av.fg,
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    fontSize:12, fontWeight:700, flexShrink:0 }}>
                        {ini(b.name)}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:'#111827',
                                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {b.name}
                        </div>
                        <div style={{ height:3, background:'#F3F4F6', borderRadius:2, overflow:'hidden', marginTop:5, maxWidth:200 }}>
                          <div style={{ height:'100%', width:`${bar}%`, background:meta.bar, borderRadius:2 }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize:15, fontWeight:800, color:'#111827', textAlign:'right' }}>
                      {Number(b.score).toLocaleString()}
                    </div>

                    <div style={{ textAlign:'right' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px',
                        borderRadius:100, background:meta.pill, color:meta.pillText, fontSize:11, fontWeight:600,
                        border:`1px solid ${meta.border}` }}>
                        {lv}
                      </span>
                    </div>

                    <div style={{ display:'flex', justifyContent:'center' }}>
                      <ChevronRight size={14} color="#95d5b2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* footer note */}
        <div style={{
          marginTop:32, padding:'16px 20px',
          background:'linear-gradient(to bottom,#d8f3dc,#f0fdf4)',
          border:'1px solid #95d5b2', borderRadius:14,
          display:'flex', alignItems:'center', gap:10,
          boxShadow:'0 1px 6px rgba(26,61,43,0.06)',
        }}>
          <div style={{ width:28, height:28, borderRadius:8,
                        background:'linear-gradient(135deg,#1a3d2b,#2d6a4f)',
                        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Leaf size={13} color="#86efac" />
          </div>
          <p style={{ fontSize:12, color:'#1a3d2b', lineHeight:1.6 }}>
            EcoTrust scores are calculated from verified spoilage prevention actions, optimised delivery routes, carbon record approvals, and on-time delivery completions. Scores update in real time.
          </p>
        </div>
      </div>

      <DetailModal biz={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default LoginPage;