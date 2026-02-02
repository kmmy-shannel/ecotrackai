import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth.service';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    console.log('📤 FRONTEND: Requesting password reset for:', email);

    try {
      await authService.forgotPassword(email);
      console.log('✅ FRONTEND: Password reset email sent');
      
      setSuccess(true);
    } catch (err) {
      console.error('❌ FRONTEND: Forgot password error:', err);
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-12">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <h1 className="text-2xl font-bold">ECO TRACK AI</h1>
        </div>

        {!success ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Forgot Password?</h2>
              <p className="text-gray-600 text-sm">
                Enter your email address and we'll send you instructions to reset your password.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="w-full px-6 py-4 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-full transition-colors"
              >
                Back to Login
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            {/* Success Icon */}
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
            <p className="text-gray-600 text-sm mb-6">
              If an account with that email exists, we've sent password reset instructions to:
            </p>
            <p className="font-medium text-green-600 mb-6">{email}</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-700">
                <strong>What to do next:</strong>
              </p>
              <ol className="text-sm text-gray-600 mt-2 space-y-1 list-decimal list-inside">
                <li>Check your email inbox</li>
                <li>Click the reset link in the email</li>
                <li>Create a new password</li>
              </ol>
              <p className="text-xs text-gray-500 mt-3">
                ⏰ The reset link will expire in 1 hour
              </p>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-full transition-colors"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;