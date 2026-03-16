import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Leaf, Building2, User, Lock, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
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
    fullName: '',
    role: 'admin',
  });

  const [error,               setError]               = useState('');
  const [loading,             setLoading]             = useState(false);
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength,    setPasswordStrength]    = useState('');
  const [validationErrors,    setValidationErrors]    = useState({});
  const [logoErr,             setLogoErr]             = useState(false);

  /* ── validation (original logic untouched) ── */
  const validateField = (name, value) => {
    const errors = { ...validationErrors };
    switch (name) {
      case 'firstName':
        if (value.length > 0 && value.length < 2) errors.firstName = 'First name must be at least 2 characters';
        else delete errors.firstName;
        break;
      case 'lastName':
        if (value.length > 0 && value.length < 2) errors.lastName = 'Last name must be at least 2 characters';
        else delete errors.lastName;
        break;
      case 'username':
        if (value.length > 0 && value.length < 5) errors.username = 'Username must be at least 5 characters';
        else delete errors.username;
        break;
      case 'password':
        if (value.length > 0) {
          if (value.length < 8 || value.length > 16) errors.password = 'Password must be 8–16 characters';
          else if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(value)) errors.password = 'Password must contain both letters and numbers';
          else delete errors.password;
          calculatePasswordStrength(value);
        } else {
          setPasswordStrength('');
          delete errors.password;
        }
        break;
      case 'confirmPassword':
        if (value.length > 0 && value !== formData.password) errors.confirmPassword = 'Passwords do not match';
        else delete errors.confirmPassword;
        break;
      case 'businessName':
        if (value.length > 0 && value.length < 2) errors.businessName = 'Business name must be at least 2 characters';
        else delete errors.businessName;
        break;
      case 'address':
        if (value.length > 0 && value.length < 2) errors.address = 'Address must be at least 2 characters';
        else delete errors.address;
        break;
      case 'contactPhone':
        if (value.length > 0 && !/^\d+$/.test(value)) errors.contactPhone = 'Contact phone must contain numbers only';
        else delete errors.contactPhone;
        break;
      default:
        break;
    }
    setValidationErrors(errors);
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8)  strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    if (strength <= 2) setPasswordStrength('weak');
    else if (strength <= 3) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  };

  /* ── handleChange (original logic untouched) ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'firstName' || name === 'lastName') {
      const firstName = name === 'firstName' ? value : formData.firstName;
      const lastName  = name === 'lastName'  ? value : formData.lastName;
      setFormData(prev => ({ ...prev, [name]: value, fullName: `${firstName} ${lastName}`.trim() }));
    }
    validateField(name, value);
    setError('');
  };

  /* ── handleSubmit (original logic untouched) ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
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
    console.log('📤 FRONTEND: Sending registration data:', { ...formData, password: '***hidden***', confirmPassword: '***hidden***' });
    try {
      const result = await authService.register(formData);
      console.log('✅ FRONTEND: Registration successful:', result);
      navigate('/verify-otp', { state: { email: formData.email, message: 'Please check your email for the verification code' } });
    } catch (err) {
      console.error('❌ FRONTEND: Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── password strength bar ── */
  const strengthMeta = {
    weak:   { width: '33%', color: '#EF4444', label: 'Weak'   },
    medium: { width: '66%', color: '#F59E0B', label: 'Medium' },
    strong: { width: '100%',color: '#10B981', label: 'Strong' },
  };

  /* ── shared input style ── */
  const inp = (hasErr) => ({
    width: '100%', height: 44, padding: '0 14px',
    border: `1.5px solid ${hasErr ? '#FCA5A5' : '#E5E7EB'}`,
    borderRadius: 10, background: hasErr ? '#FFF5F5' : '#FAFAFA',
    color: '#111827', fontSize: 14, fontFamily: 'inherit',
    boxSizing: 'border-box', outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  });

  const lbl = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: '#374151', marginBottom: 5,
  };

  const errMsg = (msg) => msg ? (
    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:5 }}>
      <AlertCircle size={11} color="#EF4444" />
      <span style={{ fontSize:11, color:'#EF4444' }}>{msg}</span>
    </div>
  ) : null;

  const sectionHeading = (icon, text) => (
    <div style={{ display:'flex', alignItems:'center', gap:8, margin:'8px 0 16px' }}>
      <div style={{ width:28, height:28, borderRadius:8, background:'#ECFDF5', border:'1px solid #A7F3D0',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {icon}
      </div>
      <span style={{ fontSize:13, fontWeight:700, color:'#374151', letterSpacing:'-0.1px' }}>{text}</span>
      <div style={{ flex:1, height:1, background:'#F3F4F6' }} />
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#F8FAF9', fontFamily:"'Inter','Helvetica Neue',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .reg-inp:focus { border-color: #10B981 !important; box-shadow: 0 0 0 3px rgba(16,185,129,0.1) !important; }
        .reg-inp.err:focus { border-color: #EF4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.1) !important; }
        .submit-btn:hover:not(:disabled) { background: #047857 !important; }
        .submit-btn:active:not(:disabled) { transform: scale(0.99); }
        .back-btn:hover { background: #F3F4F6 !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #D1FAE5; border-radius: 4px; }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{ background:'#fff', borderBottom:'1px solid #F0F0F0', padding:'0 40px',
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    height:60, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {logoErr
            ? <div style={{ width:34, height:34, borderRadius:9, background:'#ECFDF5',
                            border:'1px solid #A7F3D0', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Leaf size={17} color="#059669" />
              </div>
            : <img src="/logo.jpg" alt="EcoTrackAI" onError={() => setLogoErr(true)}
                style={{ width:34, height:34, borderRadius:9, objectFit:'cover', border:'1px solid #E5E7EB' }} />
          }
          <span style={{ fontSize:15, fontWeight:700, color:'#111827', letterSpacing:'-0.2px' }}>EcoTrackAI</span>
        </div>
        <button type="button" onClick={() => navigate('/')}
          style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'1px solid #E5E7EB',
                   borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, color:'#6B7280',
                   cursor:'pointer', fontFamily:'inherit', transition:'background 0.12s' }}
          className="back-btn">
          <ChevronLeft size={14} />
          Back to Login
        </button>
      </nav>

      {/* ── Page content ── */}
      <div style={{ maxWidth:780, margin:'0 auto', padding:'48px 24px 80px' }}>

        {/* page heading */}
        <div style={{ marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#ECFDF5',
                        border:'1px solid #A7F3D0', borderRadius:100, padding:'5px 12px', marginBottom:16 }}>
            <Leaf size={11} color="#059669" />
            <span style={{ fontSize:11, fontWeight:600, color:'#059669', letterSpacing:'0.4px' }}>
              New business registration
            </span>
          </div>
          <h1 style={{ fontSize:30, fontWeight:800, color:'#111827', letterSpacing:'-0.6px', lineHeight:1.15 }}>
            Register your business
          </h1>
          <p style={{ fontSize:14, color:'#6B7280', marginTop:6, lineHeight:1.6 }}>
            Create your EcoTrackAI account and start tracking your environmental impact.
          </p>
        </div>

        {/* form card */}
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:20,
                      padding:'36px', boxShadow:'0 2px 20px rgba(0,0,0,0.06)' }}>

          {error && (
            <div style={{ display:'flex', alignItems:'flex-start', gap:10, background:'#FEF2F2',
                          border:'1px solid #FECACA', borderRadius:10, padding:'12px 16px', marginBottom:24 }}>
              <AlertCircle size={15} color="#EF4444" style={{ flexShrink:0, marginTop:1 }} />
              <span style={{ fontSize:13, color:'#B91C1C', lineHeight:1.5 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:20 }}>

            {/* ── Business Information ── */}
            {sectionHeading(<Building2 size={14} color="#059669" />, 'Business Information')}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label style={lbl}>Business Name <span style={{ color:'#EF4444' }}>*</span></label>
                <input type="text" name="businessName" placeholder="e.g. Dela Cruz Trading"
                  value={formData.businessName} onChange={handleChange} required
                  className={`reg-inp${validationErrors.businessName ? ' err' : ''}`}
                  style={inp(!!validationErrors.businessName)} />
                {errMsg(validationErrors.businessName)}
              </div>
              <div>
                <label style={lbl}>Business Type</label>
                <input type="text" name="businessType" placeholder="e.g. Distributor, Retailer"
                  value={formData.businessType} onChange={handleChange}
                  className="reg-inp" style={inp(false)} />
              </div>
            </div>

            <div>
              <label style={lbl}>Business Address <span style={{ color:'#EF4444' }}>*</span></label>
              <input type="text" name="address" placeholder="Full business address"
                value={formData.address} onChange={handleChange} required
                className={`reg-inp${validationErrors.address ? ' err' : ''}`}
                style={inp(!!validationErrors.address)} />
              {errMsg(validationErrors.address)}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label style={lbl}>Contact Email <span style={{ color:'#EF4444' }}>*</span></label>
                <input type="email" name="contactEmail" placeholder="contact@business.com"
                  value={formData.contactEmail} onChange={handleChange} required
                  className="reg-inp" style={inp(false)} />
              </div>
              <div>
                <label style={lbl}>Contact Phone <span style={{ color:'#EF4444' }}>*</span></label>
                <input type="tel" name="contactPhone" placeholder="Numbers only"
                  value={formData.contactPhone} onChange={handleChange} required
                  onKeyDown={(e) => {
                    const allowed = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','Home','End'];
                    if (allowed.includes(e.key)) return;
                    if (!/^\d$/.test(e.key)) e.preventDefault();
                  }}
                  className={`reg-inp${validationErrors.contactPhone ? ' err' : ''}`}
                  style={inp(!!validationErrors.contactPhone)} />
                {errMsg(validationErrors.contactPhone)}
              </div>
            </div>

            {/* ── divider ── */}
            <div style={{ height:1, background:'#F3F4F6', margin:'4px 0' }} />

            {/* ── Personal Information ── */}
            {sectionHeading(<User size={14} color="#059669" />, 'Account Owner')}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label style={lbl}>First Name <span style={{ color:'#EF4444' }}>*</span></label>
                <input type="text" name="firstName" placeholder="First name"
                  value={formData.firstName} onChange={handleChange} required minLength={2}
                  className={`reg-inp${validationErrors.firstName ? ' err' : ''}`}
                  style={inp(!!validationErrors.firstName)} />
                {errMsg(validationErrors.firstName)}
              </div>
              <div>
                <label style={lbl}>Last Name <span style={{ color:'#EF4444' }}>*</span></label>
                <input type="text" name="lastName" placeholder="Last name"
                  value={formData.lastName} onChange={handleChange} required minLength={2}
                  className={`reg-inp${validationErrors.lastName ? ' err' : ''}`}
                  style={inp(!!validationErrors.lastName)} />
                {errMsg(validationErrors.lastName)}
              </div>
            </div>

            <div>
              <label style={lbl}>Username <span style={{ color:'#EF4444' }}>*</span></label>
              <input type="text" name="username" placeholder="Minimum 5 characters"
                value={formData.username} onChange={handleChange} required minLength={5}
                className={`reg-inp${validationErrors.username ? ' err' : ''}`}
                style={inp(!!validationErrors.username)} />
              {errMsg(validationErrors.username)}
            </div>

            <div>
              <label style={lbl}>Your Email <span style={{ color:'#EF4444' }}>*</span></label>
              <input type="email" name="email" placeholder="you@example.com"
                value={formData.email} onChange={handleChange} required
                className="reg-inp" style={inp(false)} />
            </div>

            {/* ── divider ── */}
            <div style={{ height:1, background:'#F3F4F6', margin:'4px 0' }} />

            {/* ── Security ── */}
            {sectionHeading(<Lock size={14} color="#059669" />, 'Security')}

            {/* password */}
            <div>
              <label style={lbl}>Password <span style={{ color:'#EF4444' }}>*</span></label>
              <div style={{ position:'relative' }}>
                <input type={showPassword ? 'text' : 'password'} name="password"
                  placeholder="8–16 characters, letters & numbers"
                  value={formData.password} onChange={handleChange} required minLength={8} maxLength={16}
                  className={`reg-inp${validationErrors.password ? ' err' : ''}`}
                  style={{ ...inp(!!validationErrors.password), paddingRight:44 }} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                           background:'none', border:'none', cursor:'pointer', color:'#9CA3AF',
                           display:'flex', alignItems:'center', padding:4 }}>
                  {showPassword ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
              {errMsg(validationErrors.password)}

              {/* strength bar */}
              {formData.password && passwordStrength && (
                <div style={{ marginTop:10 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:11, color:'#9CA3AF' }}>Password strength</span>
                    <span style={{ fontSize:11, fontWeight:600, color: strengthMeta[passwordStrength]?.color }}>
                      {strengthMeta[passwordStrength]?.label}
                    </span>
                  </div>
                  <div style={{ height:4, background:'#F3F4F6', borderRadius:2, overflow:'hidden' }}>
                    <div style={{
                      height:'100%', borderRadius:2,
                      width: strengthMeta[passwordStrength]?.width || '0%',
                      background: strengthMeta[passwordStrength]?.color || '#E5E7EB',
                      transition:'width 0.3s ease, background 0.3s ease',
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* confirm password */}
            <div>
              <label style={lbl}>Confirm Password <span style={{ color:'#EF4444' }}>*</span></label>
              <div style={{ position:'relative' }}>
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword} onChange={handleChange} required
                  className={`reg-inp${validationErrors.confirmPassword ? ' err' : ''}`}
                  style={{ ...inp(!!validationErrors.confirmPassword), paddingRight:44 }} />
                <button type="button" onClick={() => setShowConfirmPassword(p => !p)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                           background:'none', border:'none', cursor:'pointer', color:'#9CA3AF',
                           display:'flex', alignItems:'center', padding:4 }}>
                  {showConfirmPassword ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
              {errMsg(validationErrors.confirmPassword)}

              {/* match indicator */}
              {formData.confirmPassword && !validationErrors.confirmPassword && formData.password === formData.confirmPassword && (
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:6 }}>
                  <CheckCircle2 size={12} color="#10B981" />
                  <span style={{ fontSize:11, color:'#10B981', fontWeight:500 }}>Passwords match</span>
                </div>
              )}
            </div>

            {/* ── actions ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:4 }}>
              <button type="submit" disabled={loading || Object.keys(validationErrors).length > 0}
                className="submit-btn"
                style={{
                  width:'100%', height:46, background:'#059669', border:'none', borderRadius:10,
                  color:'#fff', fontSize:14, fontWeight:700, fontFamily:'inherit',
                  cursor: (loading || Object.keys(validationErrors).length > 0) ? 'not-allowed' : 'pointer',
                  opacity: (loading || Object.keys(validationErrors).length > 0) ? 0.6 : 1,
                  transition:'background 0.15s, transform 0.1s, opacity 0.15s',
                }}>
                {loading ? 'Registering…' : 'Register Business'}
              </button>

              <button type="button" onClick={() => navigate('/')} className="back-btn"
                style={{ width:'100%', height:46, background:'#F9FAFB', border:'1px solid #E5E7EB',
                         borderRadius:10, color:'#6B7280', fontSize:14, fontWeight:600,
                         fontFamily:'inherit', cursor:'pointer', transition:'background 0.12s' }}>
                Back to Login
              </button>
            </div>

          </form>
        </div>

        {/* footer note */}
        <div style={{ marginTop:24, padding:'14px 18px', background:'#ECFDF5', border:'1px solid #A7F3D0',
                      borderRadius:12, display:'flex', alignItems:'flex-start', gap:10 }}>
          <Leaf size={13} color="#059669" style={{ flexShrink:0, marginTop:1 }} />
          <p style={{ fontSize:12, color:'#065F46', lineHeight:1.6 }}>
            By registering, your business will receive an EcoTrust score of 0 (Newcomer level). Scores increase as your team logs verified deliveries, prevents spoilage, and completes carbon record approvals.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;