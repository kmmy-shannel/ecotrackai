import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Leaf } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDashboardRoute } from '../utils/rolePermissions';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login({
        email: formData.email.trim(),
        password: formData.password,
      });

      const role = result?.data?.user?.role;
      navigate(getDashboardRoute(role), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--surface-700)] bg-[var(--bg-900)]/95 shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-[var(--accent-500)]/20 border border-[var(--accent-500)]/40 flex items-center justify-center">
            <Leaf size={20} className="text-[var(--accent-400)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-[var(--text-100)]">EcoTrackAI</h1>
            <p className="text-xs text-[var(--text-300)]">Role-based operations platform</p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-[var(--text-300)] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] text-[var(--text-100)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-[var(--text-300)] mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] text-[var(--text-100)] px-4 py-3 pr-11 focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-300)] hover:text-[var(--text-100)]"
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-[var(--accent-400)] hover:text-[var(--text-100)]"
            >
              Forgot password
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-4 py-3 font-semibold text-[var(--text-100)] bg-[var(--accent-500)] hover:bg-[var(--accent-400)] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/register')}
            className="text-sm text-[var(--text-300)] hover:text-[var(--text-100)]"
          >
            Register new business
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
