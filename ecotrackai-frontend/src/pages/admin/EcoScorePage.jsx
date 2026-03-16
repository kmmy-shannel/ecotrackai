import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import authService from '../../services/auth.service';
import useEcoTrust from '../../hooks/useEcoTrust';
import {
  Award, TrendingUp, Zap, RefreshCw, AlertCircle,
  CheckCircle, Leaf, Truck, Package, Star, Clock,
  Crown, Shield, Sparkles
} from 'lucide-react';

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .ec-root,.ec-root *{font-family:'Poppins',sans-serif;box-sizing:border-box}

  @keyframes ec-in    {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes ec-slide {from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
  @keyframes ec-spin  {to{transform:rotate(360deg)}}
  @keyframes ec-pulse {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}

  .ec-page{animation:ec-in .3s ease both}

  /* Banner */
  .ec-banner{background:linear-gradient(130deg,#0f2419 0%,#1a3d2b 50%,#2d6a4f 100%);border-radius:20px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 6px 24px rgba(26,61,43,0.22);border:1px solid rgba(82,183,136,0.12);position:relative;overflow:hidden}
  .ec-banner::after{content:'';position:absolute;right:-50px;top:-50px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.03);pointer-events:none}
  .ec-pulse-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;flex-shrink:0;animation:ec-pulse 2.5s ease infinite;box-shadow:0 0 0 3px rgba(74,222,128,0.18)}
  .ec-btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:8px 15px;background:rgba(255,255,255,0.08);color:#fff;border-radius:11px;font-size:12.5px;font-weight:600;border:1px solid rgba(255,255,255,0.14);cursor:pointer;transition:background .15s,transform .13s;white-space:nowrap}
  .ec-btn-ghost:hover{background:rgba(255,255,255,0.15);transform:translateY(-1px)}
  .ec-btn-ghost:disabled{opacity:.5;cursor:not-allowed;transform:none}

  /* Hero card */
  .ec-hero{background:#fff;border-radius:20px;border:1px solid rgba(82,183,136,.14);box-shadow:0 3px 18px rgba(26,61,43,.07);overflow:hidden;animation:ec-in .3s ease both}
  .ec-hero-hd{background:linear-gradient(135deg,#1a3d2b 0%,#2d6a4f 60%,#40916c 100%);padding:22px 24px;position:relative;overflow:hidden}
  .ec-hero-hd::before{content:'';position:absolute;right:-40px;top:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.04);pointer-events:none}
  .ec-hero-hd::after{content:'';position:absolute;right:60px;bottom:-30px;width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,0.03);pointer-events:none}

  /* Progress bar */
  .ec-prog-track{height:8px;background:rgba(255,255,255,.18);border-radius:99px;overflow:hidden}
  .ec-prog-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#86efac,#fff);transition:width .9s cubic-bezier(.34,1.2,.64,1)}

  /* Level badge in hero */
  .ec-lvl-badge{display:inline-flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);border-radius:14px}

  /* Panels */
  .ec-panel{background:#fff;border-radius:18px;border:1px solid rgba(82,183,136,.14);box-shadow:0 2px 12px rgba(26,61,43,.07);overflow:hidden;animation:ec-in .32s ease both}
  .ec-panel-hd{padding:13px 18px;background:linear-gradient(to right,#f8fdf9,#edfaf2);border-bottom:1px solid rgba(82,183,136,.1);display:flex;align-items:center;justify-content:space-between}

  /* Transaction rows */
  .ec-tx{display:flex;align-items:center;gap:10px;padding:11px 18px;border-bottom:1px solid rgba(82,183,136,.07);transition:background .13s;animation:ec-slide .22s ease both}
  .ec-tx:last-child{border-bottom:none}
  .ec-tx:hover{background:linear-gradient(to right,#f8fdf9,#fafffe)}
  .ec-tx:nth-child(1){animation-delay:.03s}.ec-tx:nth-child(2){animation-delay:.06s}
  .ec-tx:nth-child(3){animation-delay:.09s}.ec-tx:nth-child(4){animation-delay:.12s}
  .ec-tx-av{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}

  /* Action rows */
  .ec-action{display:flex;align-items:center;justify-content:space-between;padding:11px 18px;border-bottom:1px solid rgba(82,183,136,.07);transition:background .13s}
  .ec-action:last-child{border-bottom:none}
  .ec-action:hover{background:#f8fdf9}

  /* Breakdown cells */
  .ec-bk-cell{background:#f8fdf9;border-radius:12px;padding:10px 12px;border:1px solid rgba(82,183,136,.1);display:flex;align-items:center;gap:9px;transition:border-color .14s,transform .14s}
  .ec-bk-cell:hover{border-color:#52b788;transform:translateY(-2px)}

  /* Level list */
  .ec-lvl-row{padding:12px 16px;border-bottom:1px solid rgba(82,183,136,.07);display:flex;align-items:start;gap:11px;transition:background .13s}
  .ec-lvl-row:last-child{border-bottom:none}
  .ec-lvl-row-active{background:linear-gradient(135deg,#f0fdf4,#e6f7ee)}
  .ec-lvl-row-done{background:#fafffe}
  .ec-lvl-icon{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px}

  /* Mini progress bar */
  .ec-mini-track{height:5px;background:rgba(82,183,136,.15);border-radius:99px;overflow:hidden;margin-top:6px}
  .ec-mini-fill{height:100%;border-radius:99px;transition:width .7s ease}

  /* Badges */
  .ec-cur-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;background:linear-gradient(135deg,#d8f3dc,#b7e4c7);color:#1a3d2b;border-radius:99px;font-size:10px;font-weight:800}
  .ec-pts{display:inline-flex;align-items:center;padding:3px 10px;background:linear-gradient(135deg,#d8f3dc,#b7e4c7);color:#1a3d2b;border-radius:99px;font-size:12px;font-weight:800;flex-shrink:0}

  /* Category icon wrappers */
  .ec-ico-orange{background:linear-gradient(135deg,#fff7ed,#fed7aa)}
  .ec-ico-blue  {background:linear-gradient(135deg,#eff6ff,#bfdbfe)}
  .ec-ico-green {background:linear-gradient(135deg,#f0fdf4,#bbf7d0)}
  .ec-ico-purple{background:linear-gradient(135deg,#f5f3ff,#ddd6fe)}
  .ec-ico-teal  {background:linear-gradient(135deg,#f0fdfa,#99f6e4)}

  /* Spinner / Empty */
  .ec-spin{border-radius:50%;border:2.5px solid #95d5b2;border-top-color:#2d6a4f;animation:ec-spin .65s linear infinite}
  .ec-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:9px;text-align:center}
  .ec-err{background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:10px 14px;font-size:12.5px;color:#dc2626;display:flex;align-items:center;justify-content:space-between;gap:7px}
`;

if (typeof document !== 'undefined' && !document.getElementById('ec-styles')) {
  const el = document.createElement('style');
  el.id = 'ec-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const TRUST_LEVELS = [
  { level: 1, name: 'Newcomer',     min: 0,    max: 499,  color: 'gray',   icon: '🌱', desc: 'Just getting started' },
  { level: 2, name: 'Eco Warrior',  min: 500,  max: 999,  color: 'blue',   icon: '⚡', desc: 'Consistently preventing waste' },
  { level: 3, name: 'Eco Champion', min: 1000, max: 1999, color: 'green',  icon: '🏆', desc: 'Strong environmental leadership' },
  { level: 4, name: 'Eco Leader',   min: 2000, max: 3999, color: 'yellow', icon: '🌟', desc: 'Top-tier sustainable business' },
  { level: 5, name: 'Eco Legend',   min: 4000, max: null, color: 'purple', icon: '👑', desc: 'Pinnacle of sustainable distribution' },
];

const LEVEL_COLORS = {
  gray:   { iconBg:'#f3f4f6', iconBorder:'rgba(156,163,175,.3)', text:'#6b7280', barFrom:'#9ca3af', barTo:'#6b7280' },
  blue:   { iconBg:'#eff6ff', iconBorder:'rgba(59,130,246,.2)',  text:'#1d4ed8', barFrom:'#60a5fa', barTo:'#3b82f6' },
  green:  { iconBg:'#f0fdf4', iconBorder:'rgba(34,197,94,.2)',   text:'#166534', barFrom:'#4ade80', barTo:'#16a34a' },
  yellow: { iconBg:'#fefce8', iconBorder:'rgba(234,179,8,.2)',   text:'#92400e', barFrom:'#fbbf24', barTo:'#f97316' },
  purple: { iconBg:'#f5f3ff', iconBorder:'rgba(139,92,246,.2)',  text:'#5b21b6', barFrom:'#a78bfa', barTo:'#7c3aed' },
};

const getCategoryMeta = (cat) => {
  const c = String(cat || '').toLowerCase();
  if (c.includes('spoil') || c.includes('prevention'))   return { bg:'ec-ico-orange', ic:'#f97316', Icon: Package     };
  if (c.includes('optim') || c.includes('delivery opt')) return { bg:'ec-ico-purple', ic:'#7c3aed', Icon: Zap         };
  if (c.includes('carbon') || c.includes('verif'))       return { bg:'ec-ico-teal',   ic:'#0d9488', Icon: Leaf        };
  if (c.includes('complet') || c.includes('on time'))    return { bg:'ec-ico-green',  ic:'#16a34a', Icon: CheckCircle };
  if (c.includes('truck') || c.includes('deliver'))      return { bg:'ec-ico-blue',   ic:'#3b82f6', Icon: Truck       };
  return { bg:'ec-ico-green', ic:'#2d6a4f', Icon: Star };
};

/* ─── EcoScorePage ──────────────────────────────────────────────────────────── */
const EcoScorePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    setUser(currentUser);
  }, [navigate]);

  const businessId = user?.businessId || user?.business_id;
  const {
    score, level, levelNumber,
    nextLevel, pointsToNext, progressPct,
    transactions, breakdown, actions,
    loading, error, refresh
  } = useEcoTrust(businessId);

  if (!user) return null;

  const currentLevelConfig = TRUST_LEVELS.find(l => l.name === level) || TRUST_LEVELS[0];
  const levelColors = LEVEL_COLORS[currentLevelConfig.color];
  const today = new Date().toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric', year:'numeric' });

  /* use DB actions if available, else static fallback */
  const HOW_TO_EARN_STATIC = [
    { action_name:'Spoilage Alert Approved',     category:'spoilage prevention',  points_value:50 },
    { action_name:'Route Optimization Approved', category:'delivery optimization', points_value:30 },
    { action_name:'Carbon Record Verified',      category:'carbon verification',   points_value:20 },
    { action_name:'Delivery Completed On Time',  category:'delivery completion',   points_value:10 },
  ];
  const earnList = actions.length > 0 ? actions : HOW_TO_EARN_STATIC;

  return (
    <Layout currentPage="EcoTrust" user={user}>
      <div className="ec-root ec-page" style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* ── Error ── */}
        {error && (
          <div className="ec-err">
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <AlertCircle size={13} style={{ flexShrink:0 }} /> {error}
            </div>
            <button onClick={refresh} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', color:'#dc2626' }}>
              <RefreshCw size={14} />
            </button>
          </div>
        )}

        {/* ── Banner ── */}
        <div className="ec-banner">
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
              <div style={{ width:26, height:26, borderRadius:7, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Award size={13} style={{ color:'#86efac' }} />
              </div>
              <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.1em' }}>
                EcoTrackAI — Sustainability Score
              </span>
            </div>
            <h1 style={{ color:'#fff', fontSize:20, fontWeight:900, margin:'0 0 7px', letterSpacing:'-.4px' }}>EcoTrust Score</h1>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div className="ec-pulse-dot" />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:500 }}>Live Tracking</span>
              </div>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>|</span>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <Clock size={10} style={{ color:'rgba(255,255,255,0.35)' }} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>{today}</span>
              </div>
              {!loading && levelNumber && (
                <>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>|</span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:500 }}>
                    {currentLevelConfig.icon} {level} · Lv {levelNumber}
                  </span>
                </>
              )}
            </div>
          </div>
          <button className="ec-btn-ghost" onClick={refresh} disabled={loading}>
            <RefreshCw size={12} style={loading ? { animation:'ec-spin .7s linear infinite' } : {}} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {/* ── Body: two-column ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:14, alignItems:'start' }}>

          {/* ══ LEFT ══ */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Score Hero */}
            <div className="ec-hero">
              <div className="ec-hero-hd">
                {/* Score + Level badge */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, position:'relative', zIndex:1 }}>
                  <div>
                    <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.09em', margin:'0 0 6px' }}>Current Score</p>
                    <div style={{ display:'flex', alignItems:'end', gap:8 }}>
                      <p style={{ fontSize:58, fontWeight:900, color:'#fff', lineHeight:1, margin:0, letterSpacing:'-2px' }}>
                        {loading ? '—' : (score || 0).toLocaleString()}
                      </p>
                      <p style={{ fontSize:18, fontWeight:600, color:'rgba(255,255,255,.5)', marginBottom:7 }}>pts</p>
                    </div>
                  </div>
                  <div className="ec-lvl-badge">
                    <span style={{ fontSize:28 }}>{currentLevelConfig.icon}</span>
                    <div>
                      <p style={{ fontSize:10.5, fontWeight:700, color:'rgba(255,255,255,.5)', margin:0, textTransform:'uppercase', letterSpacing:'.06em' }}>Level {levelNumber}</p>
                      <p style={{ fontSize:15, fontWeight:900, color:'#fff', margin:'1px 0' }}>{level}</p>
                      <p style={{ fontSize:10, color:'rgba(255,255,255,.4)', margin:0, fontStyle:'italic' }}>{currentLevelConfig.desc}</p>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ position:'relative', zIndex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                    <span style={{ fontSize:10.5, color:'rgba(255,255,255,.5)', fontWeight:600 }}>{level}</span>
                    <span style={{ fontSize:10.5, color:'rgba(255,255,255,.5)', fontWeight:600 }}>
                      {nextLevel ? `${pointsToNext} pts to ${nextLevel}` : '🏆 Max Level Reached'}
                    </span>
                  </div>
                  <div className="ec-prog-track">
                    <div className="ec-prog-fill" style={{ width:`${progressPct}%` }} />
                  </div>
                  <p style={{ fontSize:10, color:'rgba(255,255,255,.3)', margin:'5px 0 0', textAlign:'right' }}>{progressPct}% complete</p>
                </div>
              </div>

              {/* Breakdown by category */}
              {breakdown.length > 0 && (
                <div style={{ padding:'16px 18px', borderBottom:'1px solid rgba(82,183,136,.1)' }}>
                  <p style={{ fontSize:10, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 11px', display:'flex', alignItems:'center', gap:6 }}>
                    <TrendingUp size={11} style={{ color:'#2d6a4f' }} /> Points by Category
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                    {breakdown.map((b, i) => {
                      const { bg, ic, Icon } = getCategoryMeta(b.category);
                      return (
                        <div key={i} className="ec-bk-cell">
                          <div className={`ec-tx-av ${bg}`} style={{ width:30, height:30, borderRadius:9, flexShrink:0 }}>
                            <Icon size={13} style={{ color:ic }} />
                          </div>
                          <div style={{ minWidth:0 }}>
                            <p style={{ fontSize:11, fontWeight:700, color:'#374151', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textTransform:'capitalize' }}>{b.category || 'Other'}</p>
                            <p style={{ fontSize:12, fontWeight:800, color:'#2d6a4f', margin:0 }}>{b.total_points} pts</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent transactions */}
              <div>
                <div className="ec-panel-hd">
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Zap size={13} style={{ color:'#1a3d2b' }} />
                    </div>
                    <p style={{ fontSize:11, fontWeight:800, color:'#1a3d2b', textTransform:'uppercase', letterSpacing:'.07em', margin:0 }}>Recent Points Earned</p>
                  </div>
                  <button onClick={refresh} disabled={loading}
                    style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:600, color:'#9ca3af', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', transition:'color .13s' }}
                    onMouseOver={e => e.currentTarget.style.color='#2d6a4f'}
                    onMouseOut={e => e.currentTarget.style.color='#9ca3af'}>
                    <RefreshCw size={11} style={loading ? { animation:'ec-spin .65s linear infinite' } : {}} /> Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="ec-empty">
                    <div className="ec-spin" style={{ width:26, height:26 }} />
                    <p style={{ fontSize:13, color:'#9ca3af', margin:0 }}>Loading…</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="ec-empty">
                    <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4 }}>
                      <Star size={24} style={{ color:'#1a3d2b' }} />
                    </div>
                    <p style={{ fontWeight:800, fontSize:14, color:'#1a3d2b', margin:0 }}>No transactions yet</p>
                    <p style={{ fontSize:12, color:'#9ca3af', margin:0, maxWidth:220 }}>Complete sustainable actions to earn your first points!</p>
                  </div>
                ) : (
                  transactions.map((tx, i) => {
                    const { bg, ic, Icon } = getCategoryMeta(tx.category || tx.action_type);
                    return (
                      <div key={i} className="ec-tx" style={{ animationDelay:`${i * 0.04}s` }}>
                        <div className={`ec-tx-av ${bg}`}>
                          <Icon size={14} style={{ color:ic }} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:12.5, fontWeight:700, color:'#111827', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {tx.action_type || 'Points earned'}
                          </p>
                          <p style={{ fontSize:10.5, color:'#9ca3af', margin:0 }}>
                            {tx.description || tx.related_record_type || ''}
                            {tx.transaction_date ? ` · ${new Date(tx.transaction_date).toLocaleDateString('en-PH', { month:'short', day:'numeric' })}` : ''}
                          </p>
                        </div>
                        <span className="ec-pts">+{tx.points_earned}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* How to Earn */}
            <div className="ec-panel">
              <div className="ec-panel-hd">
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#fef9c3,#fde68a)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Sparkles size={13} style={{ color:'#92400e' }} />
                  </div>
                  <p style={{ fontSize:11, fontWeight:800, color:'#1a3d2b', textTransform:'uppercase', letterSpacing:'.07em', margin:0 }}>How to Earn Points</p>
                </div>
              </div>
              {earnList.map((a, i) => {
                const { bg, ic, Icon } = getCategoryMeta(a.category);
                return (
                  <div key={i} className="ec-action">
                    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                      <div className={`ec-tx-av ${bg}`} style={{ width:34, height:34, borderRadius:10, flexShrink:0 }}>
                        <Icon size={14} style={{ color:ic }} />
                      </div>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:12.5, fontWeight:700, color:'#111827', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {a.action_name || a.name}
                        </p>
                        <p style={{ fontSize:10.5, color:'#9ca3af', margin:0, textTransform:'capitalize' }}>
                          {a.category || ''}
                          {a.times_earned > 0 ? ` · ${a.times_earned}× earned` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="ec-pts">+{a.points_value}</span>
                  </div>
                );
              })}
            </div>

          </div>{/* end LEFT */}

          {/* ══ RIGHT ══ */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* EcoTrust Levels */}
            <div className="ec-panel">
              <div className="ec-panel-hd">
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Crown size={13} style={{ color:'#1a3d2b' }} />
                  </div>
                  <p style={{ fontSize:11, fontWeight:800, color:'#1a3d2b', textTransform:'uppercase', letterSpacing:'.07em', margin:0 }}>EcoTrust Levels</p>
                </div>
              </div>

              {TRUST_LEVELS.map((lvl) => {
                const c       = LEVEL_COLORS[lvl.color];
                const active  = lvl.name === level;
                const achieved = !loading && (score || 0) >= lvl.min;
                return (
                  <div key={lvl.level} className={`ec-lvl-row ${active ? 'ec-lvl-row-active' : achieved ? 'ec-lvl-row-done' : ''}`}>
                    <div className="ec-lvl-icon" style={{ background: achieved ? c.iconBg : '#f3f4f6', border:`1.5px solid ${achieved ? c.iconBorder : 'rgba(0,0,0,.06)'}` }}>
                      {lvl.icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
                        <p style={{ fontSize:12.5, fontWeight:800, color: achieved ? '#111827' : '#9ca3af', margin:0 }}>
                          Lv {lvl.level} · {lvl.name}
                        </p>
                        {active && <span className="ec-cur-badge"><Shield size={8}/> Current</span>}
                      </div>
                      <p style={{ fontSize:10.5, color:'#9ca3af', margin:'0 0 2px', fontWeight:500 }}>
                        {lvl.max ? `${lvl.min.toLocaleString()} – ${lvl.max.toLocaleString()} pts` : `${lvl.min.toLocaleString()}+ pts`}
                      </p>
                      <p style={{ fontSize:10.5, color: achieved ? '#6b7280' : '#d1d5db', margin:0, fontStyle:'italic' }}>"{lvl.desc}"</p>

                      {active && nextLevel && (
                        <div style={{ marginTop:7 }}>
                          <div className="ec-mini-track">
                            <div className="ec-mini-fill" style={{ width:`${progressPct}%`, background:`linear-gradient(90deg,${c.barFrom},${c.barTo})` }} />
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                            <span style={{ fontSize:9.5, color:'#9ca3af' }}>{progressPct}% to {nextLevel}</span>
                            <span style={{ fontSize:9.5, color:'#9ca3af' }}>{pointsToNext} pts left</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Score Summary */}
            {!loading && (
              <div className="ec-panel" style={{ padding:'16px 18px' }}>
                <p style={{ fontSize:10, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 12px', display:'flex', alignItems:'center', gap:6 }}>
                  <Award size={11} style={{ color:'#2d6a4f' }} /> Score Summary
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    ['Total Points',    (score || 0).toLocaleString() + ' pts', '#1a3d2b'],
                    ['Current Level',   `${currentLevelConfig.icon} ${level}`,  '#374151'],
                    ['Transactions',    transactions.length + ' recorded',       '#6b7280'],
                    ['Next Milestone',  nextLevel ? `${pointsToNext} pts away` : 'Max reached', nextLevel ? '#2d6a4f' : '#9ca3af'],
                  ].map(([label, value, col]) => (
                    <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', background:'#f8fdf9', borderRadius:10, border:'1px solid rgba(82,183,136,.1)' }}>
                      <span style={{ fontSize:11.5, color:'#9ca3af', fontWeight:600 }}>{label}</span>
                      <span style={{ fontSize:12.5, fontWeight:800, color:col }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>{/* end RIGHT */}
        </div>

      </div>
    </Layout>
  );
};

export default EcoScorePage;