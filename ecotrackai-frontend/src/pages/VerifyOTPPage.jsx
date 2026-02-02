import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/auth.service';

const VerifyOTPPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  // Get email from navigation state
  const email = location.state?.email;
  const message = location.state?.message;

  useEffect(() => {
    // Redirect if no email provided
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setOtp(value);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    if (otp.length !== 6) {
      setError('Please enter a 6-digit verification code');
      setLoading(false);
      return;
    }

    console.log('📤 FRONTEND: Verifying OTP for:', email);

    try {
      const result = await authService.verifyOTP(email, otp);
      console.log('✅ FRONTEND: OTP verified successfully:', result);
      
      setSuccessMessage('Email verified successfully! Redirecting to dashboard...');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('❌ FRONTEND: OTP verification error:', err);
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setError('');
    setSuccessMessage('');

    console.log('📧 FRONTEND: Resending OTP to:', email);

    try {
      await authService.sendOTP(email);
      console.log('✅ FRONTEND: OTP resent successfully');
      
      setSuccessMessage('A new verification code has been sent to your email!');
      setResendCooldown(60); // 60 second cooldown
      setOtp(''); // Clear the input
    } catch (err) {
      console.error('❌ FRONTEND: Resend OTP error:', err);
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
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

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Verify Your Email</h2>
          <p className="text-gray-600 text-sm">
            {message || 'We sent a 6-digit code to'}
          </p>
          <p className="font-medium text-green-600 mt-1">{email}</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm text-center">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OTP Input */}
          <div>
            <input
              type="text"
              value={otp}
              onChange={handleChange}
              placeholder="000000"
              className="w-full px-6 py-4 bg-gray-100 rounded-full text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-green-400"
              maxLength={6}
              pattern="\d{6}"
              autoFocus
              required
            />
            <p className="text-xs text-gray-500 text-center mt-2">
              Enter the 6-digit code
            </p>
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          {/* Resend Code */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resendLoading || resendCooldown > 0}
              className="text-green-600 hover:text-green-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading ? 'Sending...' : 
               resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 
               'Resend Code'}
            </button>
          </div>

          {/* Back to Login */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-full transition-colors"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyOTPPage;