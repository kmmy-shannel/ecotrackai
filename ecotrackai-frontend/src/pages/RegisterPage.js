import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth.service';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    username: '',
    email: '',
    password: '',
    fullName: ''
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

  console.log('📤 FRONTEND: Sending registration data:', formData);

  try {
    const result = await authService.register(formData);
    console.log('✅ FRONTEND: Registration successful:', result);
    navigate('/dashboard');
  } catch (err) {
    console.error('❌ FRONTEND: Registration error:', err);
    console.error('Error response:', err.response);
    console.error('Error data:', err.response?.data);
    setError(err.response?.data?.message || 'Registration failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <h1 className="text-2xl font-bold">ECO TRACK AI</h1>
        </div>

        <h2 className="text-2xl font-bold mb-6">Register Your Business</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="businessName"
              placeholder="Business Name *"
              value={formData.businessName}
              onChange={handleChange}
              className="px-6 py-4 bg-gray-100 rounded-full"
              required
            />
            <input
              type="text"
              name="businessType"
              placeholder="Business Type"
              value={formData.businessType}
              onChange={handleChange}
              className="px-6 py-4 bg-gray-100 rounded-full"
            />
          </div>

          <input
            type="text"
            name="address"
            placeholder="Business Address *"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-6 py-4 bg-gray-100 rounded-full"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <input
              type="email"
              name="contactEmail"
              placeholder="Contact Email *"
              value={formData.contactEmail}
              onChange={handleChange}
              className="px-6 py-4 bg-gray-100 rounded-full"
              required
            />
            <input
              type="tel"
              name="contactPhone"
              placeholder="Contact Phone *"
              value={formData.contactPhone}
              onChange={handleChange}
              className="px-6 py-4 bg-gray-100 rounded-full"
              required
            />
          </div>

          <div className="h-px bg-gray-300 my-6"></div>

          <input
            type="text"
            name="fullName"
            placeholder="Your Full Name *"
            value={formData.fullName}
            onChange={handleChange}
            className="w-full px-6 py-4 bg-gray-100 rounded-full"
            required
          />

          <input
            type="text"
            name="username"
            placeholder="Username *"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-6 py-4 bg-gray-100 rounded-full"
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Your Email *"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-6 py-4 bg-gray-100 rounded-full"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password (min 6 characters) *"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-6 py-4 bg-gray-100 rounded-full"
            required
            minLength={6}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-full transition-colors disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register Business'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-full transition-colors"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;