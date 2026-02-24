import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import authService from '../services/auth.service';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setFieldError({ email: false, password: false });
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
      console.log('FRONTEND: Login successful:', result);

      // 
     const roleRoutes = {
  admin: '/dashboard',
  inventory_manager: '/inventory-manager',
  logistics_manager: '/logistics-manager',
  sustainability_manager: '/sustainability-manager',
  finance_manager: '/finance-manager'
};
      const userRole = result.data?.user?.role || result.user?.role || result.role;
      const redirectPath = roleRoutes[userRole] ?? '/dashboard';

      console.log('User role:', userRole);
      console.log('Redirecting to:', redirectPath);

      navigate(redirectPath);

    } catch (err) {
      console.error('FRONTEND: Login error:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      
      if (err.response?.data?.error) {
        console.error('VALIDATION ERRORS:', err.response.data.error);
      }
      
      const serverMessage = err.response?.data?.message || '';

      if (serverMessage.toLowerCase().includes('invalid credentials')) {
        // We don't know if it's email or password, so highlight password
        // and show a helpful specific message
        setFieldError({ email: false, password: true });
        setError('Incorrect password. Please try again or reset your password.');
      } else if (serverMessage.toLowerCase().includes('not found') || serverMessage.toLowerCase().includes('no user')) {
        setFieldError({ email: true, password: false });
        setError('No account found with this email address.');
      } else if (serverMessage.toLowerCase().includes('inactive')) {
        setFieldError({ email: false, password: false });
        setError('This account has been deactivated. Contact your administrator.');
      } else if (err.response?.data?.error && Array.isArray(err.response.data.error)) {
        setError(err.response.data.error.join(', '));
      } else if (serverMessage) {
        setError(serverMessage);
      } else {
        setError('Login failed. Please check your connection and try again.');
      }
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
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm flex items-start gap-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <p className="font-semibold text-red-700">Login failed</p>
                <p className="text-red-600 mt-0.5">{error}</p>
                {fieldError.password && (
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="mt-1.5 text-red-700 underline font-medium hover:text-red-900 transition-colors"
                  >
                    Reset your password →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
           <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-6 py-4 bg-gray-100 rounded-full border-2 focus:outline-none focus:ring-2 transition-all ${
                fieldError.email
                  ? 'border-red-400 bg-red-50 focus:ring-red-300'
                  : 'border-transparent focus:ring-green-400'
              }`}
              required
            />
            {fieldError.email && (
              <p className="text-red-500 text-xs mt-1 pl-4">No account found with this email</p>
            )}
            
       {/* Password Field with Eye Icon */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-6 py-4 bg-gray-100 rounded-full border-2 focus:outline-none focus:ring-2 pr-12 transition-all ${
                  fieldError.password
                    ? 'border-red-400 bg-red-50 focus:ring-red-300'
                    : 'border-transparent focus:ring-green-400'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                  fieldError.password ? 'text-red-400 hover:text-red-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
            {fieldError.password && (
              <p className="text-red-500 text-xs mt-1 pl-4">Incorrect password</p>
            )}
            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-green-600 hover:text-green-700 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

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