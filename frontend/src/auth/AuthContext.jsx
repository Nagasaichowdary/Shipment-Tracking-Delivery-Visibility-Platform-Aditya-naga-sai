/**
 * AuthContext.jsx
 * ─────────────────────────────────────────────────────────────
 * Provides authentication state and actions to the entire app
 * via React Context.
 *
 * Exposed context value:
 *   user                  — { firstName, lastName, email, role } | null
 *   token                 — JWT string | null
 *   isAuthenticated       — boolean
 *   login()               — validate credentials → save session → return redirect
 *   register()            — create account (OTP-first flow)
 *   sendRegistrationOtp() — send OTP to email during registration
 *   verifyRegistrationOtp() — verify OTP entered by user
 *   logout()              — clear session → caller navigates to /login
 *
 * localStorage keys:
 *   "stp_token"  — active JWT string
 *   "stp_user"   — JSON-serialised logged-in user
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { ROLE_HOME } from './roleConfig';
import { authService } from '../services/authService';

// ── Context object ─────────────────────────────────────────────
const AuthContext = createContext(null);

// ── Session helpers ────────────────────────────────────────────

function readSession() {
  try {
    const token = localStorage.getItem('stp_token');
    const user  = JSON.parse(localStorage.getItem('stp_user'));
    if (token && user && user.role) return { token, user };
  } catch (_) { /* ignore corrupted JSON */ }
  return { token: null, user: null };
}

function clearSession() {
  localStorage.removeItem('stp_token');
  localStorage.removeItem('stp_user');
}

// ── AuthProvider ───────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const initial = readSession();
  const [token, setToken] = useState(initial.token);
  const [user,  setUser]  = useState(initial.user);

  // ── sendRegistrationOtp() ──────────────────────────────────
  const sendRegistrationOtp = useCallback(async (email) => {
    return await authService.sendRegistrationOtp(email);
  }, []);

  // ── verifyRegistrationOtp() ────────────────────────────────
  const verifyRegistrationOtp = useCallback(async (email, otp) => {
    return await authService.verifyRegistrationOtp(email, otp);
  }, []);

  // ── register() ─────────────────────────────────────────────
  /**
   * Creates a new account. Must only be called AFTER OTP verification.
   * @param {object} payload — full registration payload from Register.jsx
   * @returns {{ success, email, message } | { success: false, error }}
   */
  const register = useCallback(async (payload) => {
    try {
      const result = await authService.register(payload);
      if (!result.success) return result;
      return {
        success: true,
        email:   payload.email,
        message: result.data?.message || 'Registration successful.',
      };
    } catch (error) {
      return {
        success: false,
        error:   error.message || 'Registration failed.',
      };
    }
  }, []);

  // ── login() ────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      const result = await authService.login(email, password);

      if (!result.success) {
        // Pass through EMAIL_NOT_VERIFIED code for redirect handling
        return result;
      }

      const { token: newToken, role, firstName, lastName, email: respEmail, message } = result.data;

      if (!newToken || !role) {
        throw new Error('Invalid response from server.');
      }

      const userData = {
        firstName: firstName || 'User',
        lastName:  lastName  || '',
        email:     respEmail || email.trim().toLowerCase(),
        role:      role,
      };

      setToken(newToken);
      setUser(userData);
      localStorage.setItem('stp_token', newToken);
      localStorage.setItem('stp_user', JSON.stringify(userData));

      return {
        success:    true,
        redirectTo: ROLE_HOME[role] || '/dashboard',
        message:    message || 'Login successful.',
      };
    } catch (err) {
      return {
        success: false,
        error:   err.message || 'Login failed.',
      };
    }
  }, []);

  // ── logout() ────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated,
      login,
      register,
      sendRegistrationOtp,
      verifyRegistrationOtp,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── useAuth hook ────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
