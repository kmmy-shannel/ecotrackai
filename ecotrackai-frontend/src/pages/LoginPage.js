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
const LEVELS     = ['Newcomer', 'Eco Warrior', 'Eco Champion', 'Eco Leader'];
const THRESHOLDS = [0, 130, 500, 1000];
const NEXT_AT    = [130, 500, 1000, null];

const LEVEL_META = {
  'Newcomer':     { pill: '#ECFDF5', pillText: '#065F46', bar: '#6EE7B7', border: '#A7F3D0' },
  'Eco Warrior':  { pill: '#D1FAE5', pillText: '#065F46', bar: '#34D399', border: '#6EE7B7' },
  'Eco Champion': { pill: '#A7F3D0', pillText: '#065F46', bar: '#10B981', border: '#34D399' },
  'Eco Leader':   { pill: '#065F46', pillText: '#ECFDF5', bar: '#059669', border: '#047857' },
};

const AVATARS = [
  { bg: '#ECFDF5', fg: '#065F46' },
  { bg: '#EFF6FF', fg: '#1E40AF' },
  { bg: '#F5F3FF', fg: '#4C1D95' },
  { bg: '#FFFBEB', fg: '#78350F' },
  { bg: '#FFF1F2', fg: '#881337' },
];

function levelOf(s) {
  if (s >= 1000) return 'Eco Leader';
  if (s >= 500)  return 'Eco Champion';
  if (s >= 130)  return 'Eco Warrior';
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

// ─── Detail Modal (unchanged from original) ───────────────────────────────────
const DetailModal = ({ biz, onClose }) => {
  if (!biz) return null;
  const lv   = levelOf(biz.score);
  const meta = LEVEL_META[lv];
  const av   = AVATARS[(biz.business_id || biz.id || 0) % 5];
  const prog = progressTo(biz.score);
  const next = NEXT_AT[LEVELS.indexOf(lv)];

  // Map API field names → display rows
  const rows = [
    { label: 'Spoilage prevention', n: biz.spoilage_actions  || biz.actions?.spoilage  || 0, pts: (biz.spoilage_actions  || biz.actions?.spoilage  || 0) * 25, Icon: Shield     },
    { label: 'Optimised routes',    n: biz.route_actions     || biz.actions?.routes    || 0, pts: (biz.route_actions     || biz.actions?.routes    || 0) * 30, Icon: TrendingUp },
    { label: 'Carbon verified',     n: biz.carbon_actions    || biz.actions?.carbon    || 0, pts: (biz.carbon_actions    || biz.actions?.carbon    || 0) * 20, Icon: BarChart2  },
    { label: 'On-time deliveries',  n: biz.delivery_actions  || biz.actions?.delivery  || 0, pts: (biz.delivery_actions  || biz.actions?.delivery  || 0) * 10, Icon: Truck      },
  ];

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.35)', backdropFilter:'blur(4px)',
               zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
    >
      <div style={{ background:'#fff', borderRadius:20, padding:'28px', width:400, maxWidth:'95vw',
                    maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.12)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:46, height:46, borderRadius:12, background:av.bg, color:av.fg,
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700 }}>
              {ini(biz.business_name || biz.name)}
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:'#111827' }}>{biz.business_name || biz.name}</div>
              <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>
                {biz.business_type || biz.type} · Rank #{biz.rank}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:'1px solid #E5E7EB',
            background:'#F9FAFB', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6B7280' }}>
            <X size={14} />
          </button>
        </div>

        <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px',
          borderRadius:100, background:meta.pill, color:meta.pillText, fontSize:12, fontWeight:600, marginBottom:18 }}>
          <Leaf size={12} />{lv}
        </span>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
          {[
            { k:'EcoScore',         v: Number(biz.score).toLocaleString() },
            { k:'Platform rank',    v: `#${biz.rank}` },
            { k:'Spoilage actions', v: biz.spoilage_actions || biz.actions?.spoilage || 0 },
            { k:'Deliveries',       v: biz.delivery_actions || biz.actions?.delivery || 0 },
          ].map(s => (
            <div key={s.k} style={{ background:'#F9FAFB', border:'1px solid #F3F4F6', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ fontSize:22, fontWeight:800, color:'#111827' }}>{s.v}</div>
              <div style={{ fontSize:11, color:'#9CA3AF', marginTop:3 }}>{s.k}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#6B7280', marginBottom:8 }}>
            <span>Progress to {next ? LEVELS[LEVELS.indexOf(lv)+1] : 'Max level'}</span>
            <span style={{ fontWeight:700, color:'#059669' }}>{prog}%</span>
          </div>
          <div style={{ height:6, background:'#F3F4F6', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${prog}%`, background:meta.bar, borderRadius:3, transition:'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize:11, color:'#9CA3AF', marginTop:6 }}>
            {next ? `${(next - biz.score).toLocaleString()} pts to next level` : 'Maximum level achieved'}
          </div>
        </div>

        <div style={{ borderTop:'1px solid #F3F4F6', paddingTop:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', letterSpacing:'0.7px', textTransform:'uppercase', marginBottom:10 }}>
            Points breakdown
          </div>
          {rows.map(r => (
            <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'9px 0', borderBottom:'1px solid #F9FAFB' }}>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <r.Icon size={13} color="#10B981" />
                <span style={{ fontSize:13, color:'#374151' }}>{r.label} <span style={{ color:'#D1D5DB' }}>×{r.n}</span></span>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:'#059669' }}>+{r.pts.toLocaleString()}</span>
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

  const [formData,   setFormData]   = useState({ identifier: '', password: '' });
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [logoErr,    setLogoErr]    = useState(false);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all');
  const [selected,   setSelected]   = useState(null);

  // ── Real leaderboard data ─────────────────────────────────
  const [businesses,   setBusinesses]   = useState([]);
  const [bizLoading,   setBizLoading]   = useState(true);
  const [bizError,     setBizError]     = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setBizLoading(true);
      setBizError('');
      try {
        // Public endpoint — no auth token needed
        const res = await api.get('/ecotrust/public-leaderboard?limit=20');
        const data = res.data?.data || res.data || [];
        // Normalise: API returns business_name, score — map to what the UI expects
        const normalised = (Array.isArray(data) ? data : []).map((b, i) => ({
          ...b,
          id:    b.business_id || i,
          name:  b.business_name,
          type:  b.business_type || 'Business',
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

  // Sort by score descending (API already does this, but ensure it)
  const SORTED = [...businesses].sort((a, b) => b.score - a.score).map((b, i) => ({ ...b, rank: i + 1 }));
  const maxScore = SORTED[0]?.score || 1;

  const visible = SORTED.filter(b => {
    const q = search.toLowerCase();
    return (!q || (b.name || '').toLowerCase().includes(q) || (b.type || '').toLowerCase().includes(q))
        && (filter === 'all' || levelOf(b.score) === filter);
  });

  const totalPts   = businesses.reduce((s, b) => s + (parseInt(b.score) || 0), 0);
  const ecoLeaders = businesses.filter(b => levelOf(b.score) === 'Eco Leader').length;
  const FILTERS    = ['all', 'Eco Leader', 'Eco Champion', 'Eco Warrior', 'Newcomer'];

  // ── Login form ────────────────────────────────────────────
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login({ identifier: formData.identifier.trim(), password: formData.password });
      navigate(getDashboardRoute(result?.data?.user?.role), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F8FAF9', fontFamily:"'Inter','Helvetica Neue',sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .inp-field:focus { border-color: #10B981 !important; box-shadow: 0 0 0 3px rgba(16,185,129,0.1) !important; outline: none; }
        .sign-btn:hover:not(:disabled) { background: #047857 !important; }
        .sign-btn:active:not(:disabled) { transform: scale(0.99); }
        .biz-row:hover { background: #F0FDF4 !important; border-color: #A7F3D0 !important; }
        .filter-chip:hover { border-color: #A7F3D0 !important; color: #065F46 !important; background: #ECFDF5 !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #D1FAE5; border-radius: 4px; }
      `}</style>

      {/* ══ Navbar ══ */}
      <nav style={{ background:'#fff', borderBottom:'1px solid #F0F0F0', padding:'0 40px',
                    display:'flex', alignItems:'center', justifyContent:'space-between', height:60, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {logoErr
            ? <div style={{ width:34, height:34, borderRadius:9, background:'#ECFDF5', border:'1px solid #A7F3D0',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Leaf size={17} color="#059669" />
              </div>
            : <img src="/logo.jpg" alt="EcoTrackAI" onError={() => setLogoErr(true)}
                style={{ width:34, height:34, borderRadius:9, objectFit:'cover', border:'1px solid #E5E7EB' }} />
          }
          <span style={{ fontSize:15, fontWeight:700, color:'#111827', letterSpacing:'-0.2px' }}>EcoTrackAI</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'#10B981',
                         boxShadow:'0 0 0 3px rgba(16,185,129,0.2)', display:'inline-block' }} />
          <span style={{ fontSize:12, color:'#6B7280', fontWeight:500 }}>Live rankings</span>
        </div>
      </nav>

      {/* ══ Hero / Login section ══ */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'60px 24px 40px', display:'grid',
                    gridTemplateColumns:'1fr 420px', gap:64, alignItems:'flex-start' }}>

        {/* left copy */}
        <div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#ECFDF5',
                        border:'1px solid #A7F3D0', borderRadius:100, padding:'5px 12px', marginBottom:22 }}>
            <Leaf size={11} color="#059669" />
            <span style={{ fontSize:11, fontWeight:600, color:'#059669', letterSpacing:'0.4px' }}>
              Environmental Intelligence Platform
            </span>
          </div>

          <h1 style={{ fontSize:42, fontWeight:800, color:'#111827', lineHeight:1.1,
                       letterSpacing:'-1px', marginBottom:18 }}>
            Every green action<br />
            <span style={{ color:'#059669' }}>counts.</span>
          </h1>

          <p style={{ fontSize:15, color:'#6B7280', lineHeight:1.7, maxWidth:440, marginBottom:32 }}>
            EcoTrackAI tracks spoilage prevention, optimised deliveries, and verified carbon records — turning real operational decisions into an environmental trust score.
          </p>

          {/* summary stats — now from real data */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[
              { Icon:Users, val: bizLoading ? '…' : businesses.length,                                         lbl:'Businesses on platform' },
              { Icon:Award, val: bizLoading ? '…' : totalPts >= 1000 ? `${(totalPts/1000).toFixed(1)}k` : totalPts, lbl:'Total EcoTrust pts' },
              { Icon:Leaf,  val: bizLoading ? '…' : ecoLeaders,                                                lbl:'Eco Leader businesses'  },
            ].map(c => (
              <div key={c.lbl} style={{ display:'flex', alignItems:'center', gap:10, background:'#fff',
                border:'1px solid #E5E7EB', borderRadius:12, padding:'12px 16px', minWidth:160 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'#ECFDF5', border:'1px solid #A7F3D0',
                              display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <c.Icon size={14} color="#059669" />
                </div>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:'#111827', lineHeight:1 }}>{c.val}</div>
                  <div style={{ fontSize:11, color:'#9CA3AF', marginTop:3 }}>{c.lbl}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* right — login card (unchanged) */}
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:20,
                      padding:'32px', boxShadow:'0 2px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom:24 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:'#111827', letterSpacing:'-0.4px' }}>Welcome back</h2>
            <p style={{ fontSize:13, color:'#9CA3AF', marginTop:4 }}>Sign in to your operations dashboard</p>
          </div>

          {error && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10,
                          padding:'10px 14px', fontSize:13, color:'#B91C1C', marginBottom:16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label htmlFor="identifier" style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
                Email or username
              </label>
              <input id="identifier" type="text" name="identifier" value={formData.identifier}
                onChange={handleChange} required autoComplete="username" placeholder="you@company.com or admin_user"
                className="inp-field"
                style={{ width:'100%', height:44, padding:'0 14px', border:'1.5px solid #E5E7EB',
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
                  style={{ width:'100%', height:44, padding:'0 44px 0 14px', border:'1.5px solid #E5E7EB',
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
                style={{ background:'none', border:'none', fontSize:12, color:'#059669', cursor:'pointer', fontWeight:600 }}>
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} className="sign-btn"
              style={{ width:'100%', height:46, background:'#059669', border:'none', borderRadius:10,
                color:'#fff', fontSize:14, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, fontFamily:'inherit',
                transition:'background 0.15s, transform 0.1s, opacity 0.15s' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:18, fontSize:13, color:'#9CA3AF' }}>
            New to EcoTrackAI?{' '}
            <button type="button" onClick={() => navigate('/register')}
              style={{ background:'none', border:'none', color:'#059669', fontWeight:700, cursor:'pointer', fontSize:13 }}>
              Register your business
            </button>
          </p>
        </div>
      </div>

      {/* ══ Leaderboard section ══ */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      borderTop:'1px solid #E5E7EB', paddingTop:40, marginBottom:28 }}>
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, color:'#111827', letterSpacing:'-0.4px' }}>
              Environmental Leaderboard
            </h2>
            <p style={{ fontSize:13, color:'#9CA3AF', marginTop:4 }}>
              All registered businesses ranked by EcoTrust score
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'#ECFDF5',
                        border:'1px solid #A7F3D0', borderRadius:100, padding:'6px 14px' }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#10B981',
                           boxShadow:'0 0 0 3px rgba(16,185,129,0.2)', display:'inline-block' }} />
            <span style={{ fontSize:12, color:'#059669', fontWeight:600 }}>Live data</span>
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
                  border: filter===f ? '1.5px solid #059669' : '1.5px solid #E5E7EB',
                  background: filter===f ? '#059669' : '#fff',
                  color: filter===f ? '#fff' : '#6B7280',
                  fontSize:12, fontWeight:600, cursor:'pointer',
                  fontFamily:'inherit', transition:'all 0.12s',
                }}>
                {f === 'all' ? 'All levels' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Loading / Error states */}
        {bizLoading && (
          <div style={{ textAlign:'center', padding:'3rem', color:'#9CA3AF' }}>
            <RefreshCw size={20} style={{ animation:'spin 0.8s linear infinite', margin:'0 auto 8px', display:'block' }} />
            <p style={{ fontSize:13 }}>Loading leaderboard…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {!bizLoading && bizError && (
          <div style={{ textAlign:'center', padding:'2rem', color:'#DC2626', fontSize:13 }}>
            {bizError}
          </div>
        )}

        {/* table header */}
        {!bizLoading && !bizError && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'44px 1fr 140px 120px 130px 32px',
                          gap:12, padding:'0 16px', marginBottom:8 }}>
              {['#', 'Business', 'Type', 'Score', 'Level', ''].map((h, i) => (
                <div key={i} style={{ fontSize:11, fontWeight:700, color:'#9CA3AF',
                                      letterSpacing:'0.5px', textTransform:'uppercase',
                                      textAlign: i >= 3 ? 'right' : 'left' }}>
                  {h}
                </div>
              ))}
            </div>

            {/* rows */}
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {visible.length === 0 && (
                <div style={{ textAlign:'center', padding:'3rem', color:'#D1D5DB', fontSize:14 }}>
                  {businesses.length === 0 ? 'No businesses registered yet.' : 'No businesses match your search.'}
                </div>
              )}
              {visible.map(b => {
                const lv   = levelOf(b.score);
                const meta = LEVEL_META[lv];
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
                    style={{ display:'grid', gridTemplateColumns:'44px 1fr 140px 120px 130px 32px',
                      gap:12, alignItems:'center', background:rs.bg, border:'1px solid #F3F4F6',
                      borderRadius:12, padding:'12px 16px', cursor:'pointer',
                      transition:'background 0.12s, border-color 0.12s' }}>

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

                    <div style={{ fontSize:13, color:'#6B7280' }}>{b.type}</div>

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
                      <ChevronRight size={14} color="#D1D5DB" />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* footer note */}
        <div style={{ marginTop:32, padding:'16px 20px', background:'#ECFDF5',
                      border:'1px solid #A7F3D0', borderRadius:12,
                      display:'flex', alignItems:'center', gap:10 }}>
          <Leaf size={14} color="#059669" />
          <p style={{ fontSize:12, color:'#065F46', lineHeight:1.6 }}>
            EcoTrust scores are calculated from verified spoilage prevention actions, optimised delivery routes, carbon record approvals, and on-time delivery completions. Scores update in real time.
          </p>
        </div>
      </div>

      <DetailModal biz={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default LoginPage;
