import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDashboardRoute } from '../utils/rolePermissions';

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 text-gray-800">
      <div className="max-w-md w-full border border-[var(--surface-700)] rounded-2xl p-8 bg-[var(--bg-800)] text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-900/40 border border-red-900/60 flex items-center justify-center">
          <ShieldAlert size={22} className="text-red-300" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Unauthorized access</h1>
        <p className="text-sm text-[var(--text-300)] mb-6">
          Your role does not have permission to open this page.
        </p>
        <button
          onClick={() => navigate(getDashboardRoute(role))}
          className="w-full rounded-lg px-4 py-2.5 bg-[var(--accent-500)] hover:bg-[var(--accent-400)] transition-colors font-semibold"
        >
          Go to my dashboard
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
