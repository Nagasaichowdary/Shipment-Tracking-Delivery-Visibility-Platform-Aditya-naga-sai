/**
 * Login.jsx
 * ─────────────────────────────────────────────────────────────
 * The main container for the Login screen layout.
 * Features a split 50/50 layout (BrandSection + LoginForm)
 * with enterprise polish, smooth animations, and a 700ms success delay.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import BrandSection from '../components/login/BrandSection';
import LoginForm from '../components/login/LoginForm';
import { useAuth } from '../auth/AuthContext';
import { ROLES, ROLE_HOME } from '../auth/roleConfig';

const ROLE_OPTIONS = [
  { value: ROLES.ADMIN,           label: 'Administrator' },
  { value: ROLES.DISPATCHER,      label: 'Dispatcher'    },
  { value: ROLES.DRIVER,          label: 'Driver'        },
  { value: ROLES.CUSTOMER,        label: 'Customer'      },
  { value: ROLES.BUSINESS_CLIENT, label: 'Business Client' },
];

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();

  // If newly registered, email comes via ?email=...
  const params = new URLSearchParams(location.search);
  const initialEmail = params.get('email') || '';

  const [form, setForm] = useState({
    email:    initialEmail,
    password: '',
    role:     ROLES.ADMIN,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

// If already logged in, redirect to the correct dashboard.
useEffect(() => {
  if (isAuthenticated && user) {
    navigate(ROLE_HOME[user.role], { replace: true });
  }
}, [isAuthenticated, user, navigate]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("✅ Login button clicked");
    console.log("handleSubmit entered");

    if (success) return;

    setError("");

    console.log("validation passed (initial check)");

    if (!form.email || !form.password) {
        setError("Please enter both email and password.");
        return;
    }

    setLoading(true);
    console.log("calling authService");

    try {
        console.log("Executing login()...");
        const result = await login(form.email, form.password);

        console.log("Login Result:", result);

        if (!result.success) {
            setLoading(false);
            setError(result.error);
            return;
        }

        setSuccess(true);

        setTimeout(() => {
            navigate(result.redirectTo, { replace: true });
        }, 700);

    } catch (err) {
        console.error("Login Error:", err);

        setLoading(false);
        setError(err.message || "Login failed");
    }
};

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#ffffff', overflow: 'hidden' }}>
      
      {/* ── Left side: Branding (Fixed, No Scroll) ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <BrandSection />
      </div>

      {/* ── Right side: Login Form (Fixed, No Scroll) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* Main Card Wrapper */}
          <div style={{ width: '100%', maxWidth: 440, padding: 32 }}>
            
            <div style={{ marginBottom: 32 }}>
              {/* Simple Logo */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}
              >
                <div style={{
                  position: 'relative', zIndex: 1,
                  width: 46, height: 46, borderRadius: 12,
                  background: '#0f172a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Package size={24} color="#ffffff" strokeWidth={2.5} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    Shipment Tracker Pro
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Secure Login
                  </p>
                </div>
              </motion.div>

              <div style={{ marginBottom: 32 }}>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                  style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}
                >
                  Welcome back
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  style={{ margin: 0, fontSize: 14, color: '#64748b' }}
                >
                  Enter your credentials to access your workspace.
                </motion.p>
              </div>

              {/* The Form */}
              <LoginForm
                form={form}
                onChange={handleChange}
                onSubmit={handleSubmit}
                loading={loading}
                success={success}
                error={error}
                fromRegister={Boolean(initialEmail)}
                roleOptions={ROLE_OPTIONS}
              />
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{ 
            padding: '24px 40px', 
            borderTop: '1px solid #e2e8f0', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: '#ffffff',
            flexWrap: 'wrap',
            gap: 16
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Version 1.0.0</p>
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>© 2026 Shipment Tracker Pro</p>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy Policy', 'Terms', 'Support'].map(l => (
              <a key={l} href="#" style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
                 onMouseEnter={e => e.target.style.color = '#64748b'}
                 onMouseLeave={e => e.target.style.color = '#94a3b8'}>
                {l}
              </a>
            ))}
          </div>
        </motion.div>
      </div>

    </div>
  );
};

export default Login;
