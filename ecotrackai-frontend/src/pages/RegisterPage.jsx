

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import authService from '../services/auth.service';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const validateField = (name, value) => {
    const errors = { ...validationErrors };

    switch (name) {
      case 'firstName':
        if (value.length > 0 && value.length < 2) {
          errors.firstName = 'First name must be at least 2 characters';
        } else {
          delete errors.firstName;
        }
        break;
      
      case 'lastName':
        if (value.length > 0 && value.length < 2) {
          errors.lastName = 'Last name must be at least 2 characters';
        } else {
          delete errors.lastName;
        }
        break;
      
      case 'username':
        if (value.length > 0 && value.length < 5) {
          errors.username = 'Username must be at least 5 characters';
        } else {
          delete errors.username;
        }
        break;
      
      case 'password':
        if (value.length > 0) {
          if (value.length < 8 || value.length > 16) {
            errors.password = 'Password must be 8-16 characters';
          } else if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(value)) {
            errors.password = 'Password must contain both letters and numbers';
          } else {
            delete errors.password;
          }
          
          // Calculate password strength
          calculatePasswordStrength(value);
        } else {
          setPasswordStrength('');
          delete errors.password;
        }
        break;
      
      case 'confirmPassword':
        if (value.length > 0 && value !== formData.password) {
          errors.confirmPassword = 'Passwords do not match';
        } else {
          delete errors.confirmPassword;
        }
        break;
      case 'businessName':
  if (value.length > 0 && value.length < 2) {
    errors.businessName = 'Business name must be at least 2 characters';
  } else {
    delete errors.businessName;
  }
  break;

case 'address':
  if (value.length > 0 && value.length < 2) {
    errors.address = 'Address must be at least 2 characters';
  } else {
    delete errors.address;
  }
  break;

case 'contactPhone':
  if (value.length > 0 && !/^\d+$/.test(value)) {
    errors.contactPhone = 'Contact phone must contain numbers only';
  } else {
    delete errors.contactPhone;
  }
  break;
      default:
        break;
    }

    setValidationErrors(errors);
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) setPasswordStrength('weak');
    else if (strength <= 3) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Auto-generate fullName when firstName or lastName changes
    if (name === 'firstName' || name === 'lastName') {
      const firstName = name === 'firstName' ? value : formData.firstName;
      const lastName = name === 'lastName' ? value : formData.lastName;
      setFormData(prev => ({
        ...prev,
        [name]: value,
        fullName: `${firstName} ${lastName}`.trim()
      }));
    }
    
    validateField(name, value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Final validation check
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

    console.log('📤 FRONTEND: Sending registration data:', {
      ...formData,
      password: '***hidden***',
      confirmPassword: '***hidden***'
    });

    try {
      const result = await authService.register(formData);
      console.log('✅ FRONTEND: Registration successful:', result);
      
      // Navigate to OTP verification page
      navigate('/verify-otp', { 
        state: { 
          email: formData.email,
          message: 'Please check your email for the verification code'
        } 
      });
    } catch (err) {
      console.error('❌ FRONTEND: Registration error:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
          {/* Business Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
  <input
    type="text"
    name="businessName"
    placeholder="Business Name *"
    value={formData.businessName}
    onChange={handleChange}
    className={`w-full px-6 py-4 bg-gray-100 rounded-full ${
      validationErrors.businessName ? 'border-2 border-red-500' : ''
    }`}
    required
  />
  {validationErrors.businessName && (
    <p className="text-red-500 text-xs mt-1 ml-4">{validationErrors.businessName}</p>
  )}
</div>
            <div>
              <input
                type="text"
                name="businessType"
                placeholder="Business Type"
                value={formData.businessType}
                onChange={handleChange}
                className="w-full px-6 py-4 bg-gray-100 rounded-full"
              />
            </div>
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
            <div>
              <input
                type="email"
                name="contactEmail"
                placeholder="Contact Email *"
                value={formData.contactEmail}
                onChange={handleChange}
                className="w-full px-6 py-4 bg-gray-100 rounded-full"
                required
              />
            </div>
            <div>
  <input
    type="tel"
    name="contactPhone"
    placeholder="Contact Phone *"
    value={formData.contactPhone}
    onChange={handleChange}
    onKeyDown={(e) => {
      // Allow: backspace, delete, tab, escape, enter, arrow keys
      const allowedKeys = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','Home','End'];
      if (allowedKeys.includes(e.key)) return;
      // Block non-numeric keys
      if (!/^\d$/.test(e.key)) e.preventDefault();
    }}
    className={`w-full px-6 py-4 bg-gray-100 rounded-full ${
      validationErrors.contactPhone ? 'border-2 border-red-500' : ''
    }`}
    required
  />
  {validationErrors.contactPhone && (
    <p className="text-red-500 text-xs mt-1 ml-4">{validationErrors.contactPhone}</p>
  )}
</div>
          </div>

          <div className="h-px bg-gray-300 my-6"></div>

          {/* Personal Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                name="firstName"
                placeholder="First Name *"
                value={formData.firstName}
                onChange={handleChange}
                className={`w-full px-6 py-4 bg-gray-100 rounded-full ${
                  validationErrors.firstName ? 'border-2 border-red-500' : ''
                }`}
                required
                minLength={2}
              />
              {validationErrors.firstName && (
                <p className="text-red-500 text-xs mt-1 ml-4">{validationErrors.firstName}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                name="lastName"
                placeholder="Last Name *"
                value={formData.lastName}
                onChange={handleChange}
                className={`w-full px-6 py-4 bg-gray-100 rounded-full ${
                  validationErrors.lastName ? 'border-2 border-red-500' : ''
                }`}
                required
                minLength={2}
              />
              {validationErrors.lastName && (
                <p className="text-red-500 text-xs mt-1 ml-4">{validationErrors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <input
              type="text"
              name="username"
              placeholder="Username (min 5 characters) *"
              value={formData.username}
              onChange={handleChange}
              className={`w-full px-6 py-4 bg-gray-100 rounded-full ${
                validationErrors.username ? 'border-2 border-red-500' : ''
              }`}
              required
              minLength={5}
            />
            {validationErrors.username && (
              <p className="text-red-500 text-xs mt-1 ml-4">{validationErrors.username}</p>
            )}
          </div>

          <input
            type="email"
            name="email"
            placeholder="Your Email *"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-6 py-4 bg-gray-100 rounded-full"
            required
          />

          {/* Password Field with Eye Icon */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password (8-16 characters, alphanumeric) *"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-6 py-4 bg-gray-100 rounded-full pr-12 ${
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
            <div className="ml-4">
              <div className="flex items-center gap-2 mb-1">
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
                <span className="text-xs font-medium capitalize">{passwordStrength}</span>
              </div>
            </div>
          )}

          {/* Confirm Password Field with Eye Icon */}
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm Password *"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full px-6 py-4 bg-gray-100 rounded-full pr-12 ${
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

          <button
            type="submit"
            disabled={loading || Object.keys(validationErrors).length > 0}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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