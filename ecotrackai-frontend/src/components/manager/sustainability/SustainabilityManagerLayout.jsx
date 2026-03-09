import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../Navigation';
import authService from '../../../services/auth.service';

const SustainabilityManagerLayout = ({ children, currentPage, user }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const displayName    = user?.fullName || user?.full_name || 'Manager';
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex">

      {/* ── Sidebar — identical structure to Layout.js ───── */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col shadow-sm">

        {/* Logo — same as Layout.js */}
        <div className="flex items-center gap-3 mb-10">
          <img
            src="/logo.jpg"
            alt="EcoTrackAI Logo"
            className="w-10 h-10 rounded-xl shadow-md object-cover"
          />
          <h1 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            ECO-TRACKAI
          </h1>
        </div>

        {/* Shared Navigation component — reads sustainability_manager
            nav items from rolePermissions.js automatically */}
        <Navigation onLogout={handleLogout} />

      </aside>

      {/* ── Main Content ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
            {currentPage}
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-right mr-3">
              <p className="text-sm font-medium text-gray-700">{displayName}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-semibold text-sm">{displayInitial}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>

      </main>
    </div>
  );
};

export default SustainabilityManagerLayout;