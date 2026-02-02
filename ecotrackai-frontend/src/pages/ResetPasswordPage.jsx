import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import authService from '../services/auth.service';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const validatePassword = (password) => {
    const errors = {};

    if (password.length > 0) {
      if (password.length < 8 || password.length > 16) {
        errors.password = 'Password must be 8-16 characters';
      } else if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
        errors.password = 'Password must contain both letters and numbers';
      }
      
      // Calculate password strength
      let strength = 0;
      if (password.length >= 8) strength++;
      if (password.length >= 12) strength++;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
      if (/[0-9]/.test(password)) strength++;
      if (/[^a-zA-Z0-9]/.test(password)) strength++;

      if (strength <= 2) setPasswordStrength('weak');
      else if (strength <= 3) setPasswordStrength('medium');
      else setPasswordStrength('strong');
    } else {
      setPasswordStrength('');
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });

    // Validate password
    if (name === 'password') {
      const errors = validatePassword(value);
      setValidationErrors(errors);
    }

    // Validate confirm password
    if (name === 'confirmPassword') {
      if (value && value !== formData.password) {
        setValidationErrors({ ...validationErrors, confirmPassword: 'Passwords do not match' });
      } else {
        const newErrors = { ...validationErrors };
        delete newErrors.confirmPassword;
        setValidationErrors(newErrors);
      }
    }

    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Final validation
    if (Object.keys(validationErrors).length > 0) {
      setError('Please fix all validation errors before submitting');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    console.log('📤 FRONTEND: Resetting password with token');

    try {
      await authService.resetPassword(token, formData.password);
      console.log('✅ FRONTEND: Password reset successful');
      
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      console.error('❌ FRONTEND: Reset password error:', err);
      setError(err.response?.data?.message || 'Password reset failed. The link may be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
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
              <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
              <p className="text-gray-600 text-sm">
                Enter your new password below
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password Field */}
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="New Password (8-16 characters) *"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-6 py-4 bg-gray-100 rounded-full pr-12 focus:outline-none focus:ring-2 focus:ring-green-400 ${
                      validationErrors.password ? 'border-2 border-red-500' : ''
                    }`}
                    required
                    minLength={8}
                    maxLength={16}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-red-500 text-xs mt-1 ml-4">{validationErrors.password}</p>
                )}

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="ml-4 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                          style={{ 
                            width: passwordStrength === 'weak' ? '33%' : 
                                   passwordStrength === 'medium' ? '66%' : 
                                   passwordStrength === 'strong' ? '100%' : '0%' 
                          }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium capitalize w-16">{passwordStrength}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Must be 8-16 characters with letters and numbers
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm New Password *"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-6 py-4 bg-gray-100 rounded-full pr-12 focus:outline-none focus:ring-2 focus:ring-green-400 ${
                      validationErrors.confirmPassword ? 'border-2 border-red-500' : ''
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 ml-4">{validationErrors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || Object.keys(validationErrors).length > 0}
                className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
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

            <h2 className="text-2xl font-bold mb-2">Password Reset Successful!</h2>
            <p className="text-gray-600 text-sm mb-6">
              Your password has been reset successfully.
            </p>
            <p className="text-gray-500 text-sm">
              Redirecting to login page in 3 seconds...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;