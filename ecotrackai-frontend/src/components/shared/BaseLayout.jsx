import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Navigation from '../Navigation';
import NotificationCenter from './NotificationCenter';

export const BaseLayout = ({ children }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-800)] flex">
      <aside className="w-64 bg-[var(--bg-900)] border-r border-[var(--surface-700)] p-6 flex flex-col">
        <Navigation onLogout={handleLogout} />
      </aside>
      <main className="flex-1 p-6 text-[var(--text-100)]">
        {children}
      </main>
      <NotificationCenter />
    </div>
  );
};

export default BaseLayout;
