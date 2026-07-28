/**
 * Register.jsx
 * ─────────────────────────────────────────────────────────────
 * New user registration page — OTP-first flow.
 *
 * Step flow:
 *   'form'    → user fills registration details
 *   'otp'     → OTP verification (email OTP sent)
 *   'success' → account created
 *
 * Business Client enhancements:
 *   • Company Information section (existing)
 *   • Business Website URL (NEW, required, URL-validated)
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Eye, EyeOff, UserPlus, ChevronDown,
  CheckCircle2, AlertCircle, Building2, Globe,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roleConfig';
import { analysePassword, isPasswordStrong } from '../utils/passwordUtils';
import OtpVerificationStep from '../components/register/OtpVerificationStep';

// ── Constants ──────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: ROLES.ADMIN,           label: 'Administrator'   },
  { value: ROLES.DISPATCHER,      label: 'Dispatcher'      },
  { value: ROLES.DRIVER,          label: 'Driver'          },
  { value: ROLES.CUSTOMER,        label: 'Customer'        },
  { value: ROLES.BUSINESS_CLIENT, label: 'Business Client' },
];

// roleId mapping matches the roles table in the database
const ROLE_ID_MAP = {
  ADMIN:           1,
  CUSTOMER:        2,
  BUSINESS_CLIENT: 3,
  DISPATCHER:      4,
  DRIVER:          5,
};

const COUNTRY_CODES = ['+91', '+1', '+44', '+61', '+49', '+33', '+81', '+86'];
const COUNTRIES = [
  'India', 'Australia', 'Bangladesh', 'Brazil', 'Canada', 'China', 'France',
  'Germany', 'Indonesia', 'Italy', 'Japan', 'Malaysia', 'Netherlands',
  'New Zealand', 'Singapore', 'South Africa', 'Sri Lanka', 'Thailand',
  'United Arab Emirates', 'United Kingdom', 'United States',
];
const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const RequiredAsterisk = () => <span style={{ color: '#ef4444' }}>*</span>;

// ── URL validator ──────────────────────────────────────────────
const isValidUrl = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
};

// ══════════════════════════════════════════════════════════════
// Register Component
// ══════════════════════════════════════════════════════════════
const Register = () => {
  const navigate = useNavigate();
  const { register, sendRegistrationOtp, verifyRegistrationOtp } = useAuth();

  // ── Step state ────────────────────────────────────────────
  /** 'form' | 'otp' | 'success' */
  const [step, setStep] = useState('form');

  // ── Saved OTP-send response ───────────────────────────────
  const [maskedEmail,   setMaskedEmail]   = useState('');
  const [pendingPayload, setPendingPayload] = useState(null);
  /**
   * expiresAt — epoch-ms timestamp of when the current OTP expires.
   * Comes directly from the backend so it reflects real server time.
   * Passed to OtpVerificationStep for timestamp-based countdown.
   */
  const [expiresAt, setExpiresAt] = useState(Date.now() + 5 * 60 * 1000);

  // ── Shared Account Credentials ────────────────────────────
  const [form, setForm] = useState({
    name:            '',
    email:           '',
    role:            ROLES.ADMIN,
    password:        '',
    confirmPassword: '',
  });

  // ── Business Client Specific Data ─────────────────────────
  const [company, setCompany] = useState({
    companyName:         '',
    businessWebsiteUrl:  '',   // NEW — required for Business Client
    phoneCode:           '+91',
    businessPhone:       '',
    address:             '',
    city:                '',
    state:               '',
    country:             '',
    postalCode:          '',
    confirmAccurate:     false,
    agreeTerms:          false,
  });

  const [showPw,   setShowPw]   = useState(false);
  const [showCfPw, setShowCfPw] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // ── Formatters ────────────────────────────────────────────
  const formatName = (val) => {
    const lettersOnly = val.replace(/[^A-Za-z\s]/g, '');
    return lettersOnly
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // ── Change handlers ───────────────────────────────────────
  const handleChange = (field) => (e) => {
    let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (field === 'name') value = formatName(value);
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleCompanyChange = (field) => (e) => {
    let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (field === 'country' && value !== 'India') {
      setCompany((prev) => ({ ...prev, [field]: value, state: '' }));
    } else {
      setCompany((prev) => ({ ...prev, [field]: value }));
    }
    setError('');
  };

  // ── Derived flags ─────────────────────────────────────────
  const isBusinessClient = form.role === ROLES.BUSINESS_CLIENT;
  const analysis         = analysePassword(form.password);
  const passwordsMatch   = form.confirmPassword && form.password === form.confirmPassword;
  const isEmailValid     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const isPhoneValid     = company.businessPhone.length >= 7;
  const isUrlValid       = !isBusinessClient || isValidUrl(company.businessWebsiteUrl);
  const isStateValid     = company.country === 'India' ? company.state.trim() !== '' : true;

  const isStandardValid =
    (isBusinessClient || form.name.trim() !== '') &&
    form.email.trim() !== '' &&
    isPasswordStrong(form.password) &&
    passwordsMatch;

  const isCompanyValid =
    company.companyName.trim()    !== '' &&
    company.businessPhone.trim()  !== '' &&
    isUrlValid                           &&
    company.businessWebsiteUrl.trim() !== '' &&
    company.address.trim()        !== '' &&
    company.city.trim()           !== '' &&
    isStateValid                         &&
    company.country.trim()        !== '' &&
    company.postalCode.trim()     !== '' &&
    company.confirmAccurate              &&
    company.agreeTerms;

  const isValid = isBusinessClient
    ? isStandardValid && isCompanyValid && isEmailValid
    : isStandardValid;

  // ── Construct backend payload ─────────────────────────────
  const buildPayload = () => {
    const names     = form.name.trim().split(' ');
    const firstName = isBusinessClient ? (names[0] || company.companyName) : names[0];
    const lastName  = isBusinessClient ? (names.slice(1).join(' ') || 'Client') : (names.slice(1).join(' ') || 'User');

    const payload = {
      firstName,
      lastName,
      email:    form.email.trim().toLowerCase(),
      phone:    '',
      password: form.password,
      roleId:   ROLE_ID_MAP[form.role] || 2,
    };

    if (isBusinessClient) {
      payload.phone        = `${company.phoneCode} ${company.businessPhone}`.trim();
      payload.companyName  = company.companyName;
      payload.gstNumber    = '';
      payload.businessType = '';
      // website stores businessWebsiteUrl — mapped to BusinessClient.website column
      payload.website      = company.businessWebsiteUrl;
    }

    return payload;
  };

  // ── STEP 1: Submit form → send OTP ────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordStrong(form.password)) {
      setError('Password does not meet all requirements.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (isBusinessClient && (!company.confirmAccurate || !company.agreeTerms)) {
      setError('Please agree to the terms and verify your company information.');
      return;
    }
    if (isBusinessClient && !isValidUrl(company.businessWebsiteUrl)) {
      setError('Please enter a valid business website URL (e.g. https://yourcompany.com).');
      return;
    }

    setLoading(true);
    const payload = buildPayload();
    const result  = await sendRegistrationOtp(form.email);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setPendingPayload(payload);
    setMaskedEmail(result.data?.maskedEmail || form.email);
    // Store the real server expiry timestamp for the countdown timer
    const serverExpiresAt = result.data?.expiresAt
      ? parseInt(result.data.expiresAt, 10)
      : Date.now() + 5 * 60 * 1000; // 5-min fallback if not provided
    setExpiresAt(serverExpiresAt);
    setStep('otp');
  };

  // ── STEP 2: OTP verified → register ──────────────────────
  const handleOtpVerified = async (otpValue) => {
    // Verify the OTP
    const verifyResult = await verifyRegistrationOtp(form.email, otpValue);
    if (!verifyResult.success) {
      throw new Error(verifyResult.error);
    }

    // OTP ok → create account
    const regResult = await register(pendingPayload);
    if (!regResult.success) {
      throw new Error(regResult.error);
    }

    // Small pause to show success tick inside the OTP component before transitioning
    await new Promise((res) => setTimeout(res, 1200));
    setStep('success');
  };

  // ── STEP 2b: Resend OTP — update expiresAt from new response ─
  const handleResend = async (email) => {
    const result = await sendRegistrationOtp(email);
    if (result.success && result.data?.expiresAt) {
      // Update the countdown reference to the NEW OTP's expiry time
      setExpiresAt(parseInt(result.data.expiresAt, 10));
    }
    return result;
  };

  // ─────────────────────────────────────────────────────────────
  //  Render: success screen
  // ─────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 24 }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            width: '100%', maxWidth: isBusinessClient ? 480 : 440,
            background: '#ffffff', borderRadius: 16,
            border: '1px solid #e2e8f0', padding: 40,
            textAlign: 'center',
            boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
          }}
        >
          <div style={{ width: 64, height: 64, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle2 size={32} color="#16a34a" />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
            {isBusinessClient ? 'Registration Successful ✅' : 'Registration Successful'}
          </h2>
          {isBusinessClient && (
            <p style={{ margin: '0 0 8px', fontSize: 18, color: '#4f46e5', fontWeight: 800 }}>
              {company.companyName}
            </p>
          )}
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
            Your account has been created and your email has been verified.
            {!isBusinessClient && form.role !== ROLES.CUSTOMER && (
              <><br /><br />Your request is awaiting <strong>Admin approval</strong>.</>
            )}
          </p>
          <button
            onClick={() => navigate(`/login?email=${encodeURIComponent(form.email)}`, { replace: true })}
            style={{
              width: '100%', padding: 14, borderRadius: 8, border: 'none',
              background: 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
            }}
          >
            Continue to Login
          </button>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  Render: OTP step
  // ─────────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', background: '#f8fafc', paddingTop: 48, paddingBottom: 64, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{
          width: '100%', maxWidth: 480,
          background: '#ffffff', borderRadius: 16,
          border: '1px solid #e2e8f0', padding: 36,
          boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
          height: 'fit-content',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #6366f1, #818cf8)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
              <Package size={22} color="#ffffff" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Shipment Tracker Pro</p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>Enterprise Logistics Platform</p>
            </div>
          </div>

          <OtpVerificationStep
            email={form.email}
            maskedEmail={maskedEmail}
            expiresAt={expiresAt}
            onVerified={handleOtpVerified}
            onResend={handleResend}
            onBack={() => { setStep('form'); setError(''); }}
          />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  Render: Registration form
  // ─────────────────────────────────────────────────────────────

  const SubmitButton = (
    <button
      type="submit"
      disabled={loading || !isValid}
      style={{
        marginTop: 0, padding: 14, borderRadius: 8, border: 'none',
        background: (loading || !isValid) ? '#e2e8f0' : 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)',
        color: (loading || !isValid) ? '#94a3b8' : '#fff',
        fontSize: 15, fontWeight: 700,
        cursor: (loading || !isValid) ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all 0.2s',
        boxShadow: (loading || !isValid) ? 'none' : '0 4px 12px rgba(79,70,229,0.3)',
      }}
    >
      <UserPlus size={18} />
      {loading ? 'Sending OTP…' : 'Send Verification Code'}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', background: '#f8fafc', paddingTop: 48, paddingBottom: 64, paddingLeft: 24, paddingRight: 24 }}>
      <div style={{
        width: '100%',
        maxWidth: isBusinessClient ? 1200 : 720,
        background: '#ffffff', borderRadius: 16,
        border: '1px solid #e2e8f0', padding: 36,
        boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
        transition: 'max-width 0.3s ease',
        height: 'fit-content',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #6366f1, #818cf8)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
            <Package size={22} color="#ffffff" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Shipment Tracker Pro</p>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>Enterprise Logistics Platform</p>
          </div>
        </div>

        <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Create Account
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b' }}>
          A verification code will be sent to your email to confirm your identity.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Role selector ── */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Select Account Role <RequiredAsterisk />
            </label>
            <div style={{ position: 'relative', maxWidth: isBusinessClient ? 400 : '100%' }}>
              <select
                value={form.role}
                onChange={handleChange('role')}
                style={{ width: '100%', height: 58, padding: '0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, appearance: 'none', background: '#f8fafc', cursor: 'pointer', outline: 'none', fontWeight: 600, color: '#0f172a' }}
                onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
              >
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />

          {/* ── Error ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}
              >
                <AlertCircle size={14} color="#ef4444" />
                <span style={{ fontSize: 13, color: '#b91c1c', fontWeight: 500 }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Business Client layout ── */}
          <AnimatePresence mode="wait">
            {isBusinessClient ? (
              <motion.div
                key="business-fields"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 32, alignItems: 'start' }}
              >
                {/* ── LEFT: Company Information ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={18} color="#6366f1" /> Company Information
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Provide your registered company details.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Company Name */}
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Company Name <RequiredAsterisk /></label>
                        <input type="text" placeholder="Enter registered company name" value={company.companyName} onChange={handleCompanyChange('companyName')} style={{ width: '100%', height: 58, padding: '0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
                      </div>

                      {/* Business Website URL — NEW */}
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                          Business Website URL <RequiredAsterisk />
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Globe size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                          <input
                            type="url"
                            placeholder="https://yourcompany.com"
                            value={company.businessWebsiteUrl}
                            onChange={handleCompanyChange('businessWebsiteUrl')}
                            style={{
                              width: '100%', height: 58,
                              padding: '0 40px 0 38px',
                              fontSize: 14, border: '1px solid #cbd5e1',
                              borderRadius: 8, outline: 'none', boxSizing: 'border-box',
                            }}
                            onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                          />
                          {company.businessWebsiteUrl && (
                            isValidUrl(company.businessWebsiteUrl)
                              ? <CheckCircle2 size={16} color="#10b981" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
                              : <AlertCircle  size={16} color="#ef4444" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
                          )}
                        </div>
                        {company.businessWebsiteUrl && !isValidUrl(company.businessWebsiteUrl) && (
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>
                            Enter a valid URL starting with http:// or https://
                          </p>
                        )}
                      </div>

                      {/* Official Business Email */}
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Official Business Email <RequiredAsterisk /></label>
                        <div style={{ position: 'relative' }}>
                          <input type="email" placeholder="company@example.com" value={form.email} onChange={handleChange('email')} style={{ width: '100%', height: 58, padding: '0 36px 0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
                          {form.email && (
                            isEmailValid
                              ? <CheckCircle2 size={16} color="#10b981" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
                              : <AlertCircle  size={16} color="#ef4444" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
                          )}
                        </div>
                      </div>

                      {/* Business Phone */}
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Business Phone Number <RequiredAsterisk /></label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ position: 'relative', width: 85 }}>
                            <select value={company.phoneCode} onChange={handleCompanyChange('phoneCode')} style={{ width: '100%', height: 58, padding: '0 8px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, appearance: 'none', outline: 'none', cursor: 'pointer' }}>
                              {COUNTRY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                          </div>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input type="tel" placeholder="Enter phone number" value={company.businessPhone} onChange={handleCompanyChange('businessPhone')} style={{ width: '100%', height: 58, padding: '0 36px 0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
                            {company.businessPhone && (
                              isPhoneValid
                                ? <CheckCircle2 size={16} color="#10b981" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                : <AlertCircle  size={16} color="#ef4444" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Company Address */}
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Company Address <RequiredAsterisk /></label>
                        <textarea placeholder="Enter complete registered address..." value={company.address} onChange={handleCompanyChange('address')} rows={2} style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                      </div>

                      {/* Country / State */}
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Country <RequiredAsterisk /></label>
                          <div style={{ position: 'relative' }}>
                            <select value={company.country} onChange={handleCompanyChange('country')} style={{ width: '100%', height: 58, padding: '0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, appearance: 'none', outline: 'none' }}>
                              <option value="">Select Country</option>
                              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>State <RequiredAsterisk /></label>
                          <div style={{ position: 'relative' }}>
                            <select value={company.state} onChange={handleCompanyChange('state')} disabled={company.country !== 'India'} style={{ width: '100%', height: 58, padding: '0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, appearance: 'none', outline: 'none', background: company.country !== 'India' ? '#f1f5f9' : '#fff', color: company.country !== 'India' ? '#94a3b8' : '#0f172a', cursor: company.country !== 'India' ? 'not-allowed' : 'pointer' }}>
                              <option value="">{company.country === 'India' || company.country === '' ? 'Select State' : 'State/Province'}</option>
                              {company.country === 'India' && STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                          </div>
                        </div>
                      </div>

                      {/* City / Postal Code */}
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>City <RequiredAsterisk /></label>
                          <input type="text" placeholder="e.g. Mumbai" value={company.city} onChange={handleCompanyChange('city')} style={{ width: '100%', height: 58, padding: '0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Postal Code <RequiredAsterisk /></label>
                          <input type="text" placeholder="e.g. 400001" value={company.postalCode} onChange={handleCompanyChange('postalCode')} style={{ width: '100%', height: 58, padding: '0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT: Credentials + Declaration ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Account Credentials */}
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UserPlus size={18} color="#6366f1" /> Account Credentials
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Secure your enterprise account.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Password */}
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Password <RequiredAsterisk /></label>
                        <div style={{ position: 'relative' }}>
                          <input type={showPw ? 'text' : 'password'} placeholder="Create a strong password" value={form.password} onChange={handleChange('password')} style={{ width: '100%', height: 58, padding: '0 40px 0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => (e.target.style.borderColor = '#6366f1')} onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')} />
                          <button type="button" onClick={() => setShowPw((p) => !p)} style={{ position: 'absolute', right: 12, top: 0, bottom: 0, margin: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <AnimatePresence>
                          {form.password && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: 12, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Strength</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: analysis.levelColor, textTransform: 'capitalize' }}>{analysis.level}</span>
                              </div>
                              <div style={{ height: 4, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden', marginBottom: 12 }}>
                                <motion.div animate={{ width: `${Math.max(analysis.score, 5)}%`, background: analysis.levelColor }} transition={{ duration: 0.3 }} style={{ height: '100%', borderRadius: 2 }} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {analysis.rules.map((r) => (
                                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                    {r.passed ? <CheckCircle2 size={14} color="#10b981" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #cbd5e1' }} />}
                                    <span style={{ color: r.passed ? '#0f172a' : '#64748b', fontWeight: r.passed ? 600 : 400 }}>{r.label}</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Confirm Password <RequiredAsterisk /></label>
                        <div style={{ position: 'relative' }}>
                          <input type={showCfPw ? 'text' : 'password'} placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange('confirmPassword')} style={{ width: '100%', height: 58, padding: '0 40px 0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => (e.target.style.borderColor = '#6366f1')} onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')} />
                          <button type="button" onClick={() => setShowCfPw((p) => !p)} style={{ position: 'absolute', right: 12, top: 0, bottom: 0, margin: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                            {showCfPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Declaration */}
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={18} color="#6366f1" /> Declaration
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Please confirm your details.</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                        <input type="checkbox" checked={company.confirmAccurate} onChange={handleCompanyChange('confirmAccurate')} style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer' }} />
                        <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.4 }}>I confirm that the company information provided is accurate.</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                        <input type="checkbox" checked={company.agreeTerms} onChange={handleCompanyChange('agreeTerms')} style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer' }} />
                        <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.4 }}>I agree to the Terms &amp; Conditions and Privacy Policy.</span>
                      </label>
                    </div>
                  </div>

                  {SubmitButton}
                </div>
              </motion.div>
            ) : (
              /* ── Standard (non-Business-Client) layout ── */
              <motion.div
                key="standard-fields"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Full Name <RequiredAsterisk /></label>
                  <input type="text" placeholder="John Doe" value={form.name} onChange={handleChange('name')} style={{ width: '100%', height: 58, padding: '0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Email Address <RequiredAsterisk /></label>
                  <input type="email" placeholder="john@company.com" value={form.email} onChange={handleChange('email')} style={{ width: '100%', height: 58, padding: '0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Password <RequiredAsterisk /></label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} placeholder="Create a strong password" value={form.password} onChange={handleChange('password')} style={{ width: '100%', height: 58, padding: '0 40px 0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => (e.target.style.borderColor = '#6366f1')} onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')} />
                    <button type="button" onClick={() => setShowPw((p) => !p)} style={{ position: 'absolute', right: 12, top: 0, bottom: 0, margin: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {form.password && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: 12, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Strength</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: analysis.levelColor, textTransform: 'capitalize' }}>{analysis.level}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden', marginBottom: 12 }}>
                          <motion.div animate={{ width: `${Math.max(analysis.score, 5)}%`, background: analysis.levelColor }} transition={{ duration: 0.3 }} style={{ height: '100%', borderRadius: 2 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {analysis.rules.map((r) => (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                              {r.passed ? <CheckCircle2 size={14} color="#10b981" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #cbd5e1' }} />}
                              <span style={{ color: r.passed ? '#0f172a' : '#64748b', fontWeight: r.passed ? 600 : 400 }}>{r.label}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Confirm Password <RequiredAsterisk /></label>
                  <div style={{ position: 'relative' }}>
                    <input type={showCfPw ? 'text' : 'password'} placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange('confirmPassword')} style={{ width: '100%', height: 58, padding: '0 40px 0 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => (e.target.style.borderColor = '#6366f1')} onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')} />
                    <button type="button" onClick={() => setShowCfPw((p) => !p)} style={{ position: 'absolute', right: 12, top: 0, bottom: 0, margin: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                      {showCfPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>{SubmitButton}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
