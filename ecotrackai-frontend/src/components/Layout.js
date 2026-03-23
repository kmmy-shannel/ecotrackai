import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Navigation from './Navigation';
import UserProfileModal from './UserProfileModal';
import authService from '../services/auth.service';

const Layout = ({ children, currentPage, user }) => {
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutModal,  setShowLogoutModal]  = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const initials = (user?.fullName || user?.username || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'linear-gradient(135deg,#f0fdf4 0%,#fff 50%,#f0fdf4 100%)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: 'linear-gradient(180deg,#0f2419 0%,#1a3d2b 60%,#2d6a4f 100%)',
        display: 'flex', flexDirection: 'column', padding: '24px 16px',
        boxShadow: '4px 0 24px rgba(26,61,43,0.18)',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32, padding:'0 4px' }}>
          <img
            src="/logo.jpg"
            alt="EcoTrackAI Logo"
            style={{ width:38, height:38, borderRadius:11, objectFit:'cover',
              boxShadow:'0 2px 10px rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.12)' }}
          />
          <span style={{ fontSize:13, fontWeight:900, color:'#fff', letterSpacing:'.04em' }}>
            ECO-TRACKAI
          </span>
        </div>

        {/* Pass onLogoutRequest up so modal renders outside sidebar */}
        <Navigation
          onLogout={handleLogout}
          onLogoutRequest={() => setShowLogoutModal(true)}
        />
      </aside>

      {/* ── Main Content ── */}
      <main style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

        {/* Header */}
        <header style={{
          background: '#fff', borderBottom: '1px solid rgba(82,183,136,0.15)',
          padding: '16px 28px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(26,61,43,0.06)',
        }}>
          <h1 style={{ fontSize:18, fontWeight:900, color:'#1a3d2b', letterSpacing:'-.3px', margin:0, textTransform:'uppercase' }}>
            {currentPage}
          </h1>

          {/* Clickable profile */}
          <button
            onClick={() => setShowProfileModal(true)}
            style={{
              display:'flex', alignItems:'center', gap:12, padding:'6px 10px',
              borderRadius:14, border:'none', background:'none', cursor:'pointer',
              transition:'background .15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(216,243,220,0.5)'}
            onMouseOut={e => e.currentTarget.style.background = 'none'}
          >
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#1a3d2b', margin:0 }}>
                {user?.fullName || user?.username}
              </p>
              <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>{user?.email}</p>
            </div>
            <div style={{
              width:38, height:38, borderRadius:12,
              background:'linear-gradient(135deg,#1a3d2b,#2d6a4f)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:14, fontWeight:800, color:'#fff',
              boxShadow:'0 3px 10px rgba(26,61,43,0.25)', flexShrink:0,
            }}>
              {initials}
            </div>
          </button>
        </header>

        {/* Page Content */}
        <div style={{ flex:1, overflowY:'auto', padding:32 }}>
          {children}
        </div>
      </main>

      {/* ── Profile Modal — renders at root level, never clipped ── */}
      {showProfileModal && (
        <UserProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* ── Logout Modal — renders at root level, never clipped ── */}
      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={() => { setShowLogoutModal(false); handleLogout(); }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </div>
  );
};

/* ── Logout modal lives here now, outside sidebar DOM tree ── */
const LogoutConfirmModal = ({ onConfirm, onCancel }) => (
  <div style={{
    position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
    backdropFilter:'blur(4px)', display:'flex', alignItems:'center',
    justifyContent:'center', zIndex:9999, padding:16,
  }}>
    <div style={{
      background:'#fff', borderRadius:20, maxWidth:360, width:'100%',
      padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.2)',
      border:'1px solid rgba(82,183,136,0.1)',
    }}>
      <div style={{
        width:52, height:52, borderRadius:'50%', background:'#fef2f2',
        display:'flex', alignItems:'center', justifyContent:'center',
        margin:'0 auto 16px',
      }}>
        <LogOut size={24} style={{ color:'#dc2626' }} />
      </div>
      <p style={{ fontSize:16, fontWeight:800, color:'#1a3d2b', textAlign:'center', margin:'0 0 6px' }}>
        Log out
      </p>
      <p style={{ fontSize:12.5, color:'#9ca3af', textAlign:'center', margin:'0 0 24px' }}>
        Are you sure you want to end your session?
      </p>
      <div style={{ display:'flex', gap:10 }}>
        <button
          onClick={onCancel}
          style={{
            flex:1, padding:11, border:'1.5px solid #e5e7eb', background:'#fff',
            color:'#374151', fontSize:13, fontWeight:700, borderRadius:12,
            cursor:'pointer', fontFamily:'Poppins,sans-serif',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex:1, padding:11, background:'#dc2626', color:'#fff',
            fontSize:13, fontWeight:700, borderRadius:12, border:'none',
            cursor:'pointer', fontFamily:'Poppins,sans-serif',
            boxShadow:'0 2px 8px rgba(220,38,38,0.25)',
          }}
        >
          Log out
        </button>
      </div>
    </div>
  </div>
);

export default Layout;