import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth.service';

const LoginPage = () => {

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  console.log('📤 FRONTEND: Sending login data:', {
    email: formData.email,
    password: '***hidden***'
  });

  try {
    const result = await authService.login({
      email: formData.email,
      password: formData.password
    });
    console.log('✅ FRONTEND: Login successful:', result);
    navigate('/dashboard');
  } catch (err) {
    console.error('❌ FRONTEND: Login error:', err);
    console.error('Error response:', err.response);
    console.error('Error data:', err.response?.data);
    setError(err.response?.data?.message || 'Login failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex">
        {/* Left Side - Login Form */}
        <div className="w-full lg:w-1/2 p-12 flex flex-col justify-center">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <h1 className="text-2xl font-bold tracking-wide">ECO TRACK AI</h1>
          </div>

          {/* Tagline */}
          <p className="text-gray-600 text-center mb-10 px-8">
            A decision-support system for eco-friendly<br />
            supply chain management.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-6 py-4 bg-gray-100 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
            
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-6 py-4 bg-gray-100 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500 text-sm">New to EcoTrack ?</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Register Button */}
          <button
            onClick={() => navigate('/register')}
            className="w-full max-w-xs mx-auto py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-full transition-colors"
          >
            Register Business
          </button>
        </div>

        {/* Right Side - Image Placeholder */}
        <div className="hidden lg:block lg:w-1/2 bg-gray-200 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* X pattern like in your design */}
            <svg className="w-full h-full" viewBox="0 0 400 400">
              <line x1="0" y1="0" x2="400" y2="400" stroke="#999" strokeWidth="1" />
              <line x1="400" y1="0" x2="0" y2="400" stroke="#999" strokeWidth="1" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;