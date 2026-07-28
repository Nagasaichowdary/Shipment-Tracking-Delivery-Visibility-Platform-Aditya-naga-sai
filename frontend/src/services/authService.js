/**
 * authService.js
 * ─────────────────────────────────────────────────────────────
 * Service layer for the password-recovery flow.
 *
 * All business logic lives HERE — pages contain zero auth logic.
 * To connect Spring Boot, replace only the function bodies below.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  BACKEND INTEGRATION MAP                                    ║
 * ║                                                             ║
 * ║  sendForgotPasswordOTP(email)                               ║
 * ║    → POST /auth/forgot-password  { email }                 ║
 * ║      Server generates OTP, emails it, returns 200 OK       ║
 * ║                                                             ║
 * ║  verifyForgotPasswordOTP(email, otp)                        ║
 * ║    → POST /auth/verify-otp  { email, otp }                 ║
 * ║      Server validates OTP, returns { resetToken }          ║
 * ║                                                             ║
 * ║  resetPassword(email, otp, newPassword)                     ║
 * ║    → POST /auth/reset-password  { resetToken, newPassword } ║
 * ║      Server updates hash in DB, returns 200 OK             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import apiClient from './apiClient';

const LS_USERS_KEY = 'stp_registered_users';

// ─────────────────────────────────────────────────────────────
// STEP 1 — Send OTP
// ─────────────────────────────────────────────────────────────

/**
 * Checks whether the email is registered, generates a 6-digit OTP,
 * stores it in localStorage with a 5-minute expiry, and returns the
 * OTP so the ForgotPassword page can display it in the secure preview modal.
 *
 * The OTP is NEVER logged to the console or rendered outside the modal.
 *
 * @param {string} email
 * @returns {{
 *   success:     true,
 *   maskedEmail: string,
 *   otp:         string,   // shown only inside OtpPreviewModal
 *   expiresAt:   string,   // ISO string — passed to CountdownTimer
 * }}
 *       or {{ success: false, error: string }}
 *
 * Backend replacement:
 *   async sendForgotPasswordOTP(email) {
 *     const res = await axios.post('/auth/forgot-password', { email });
 *     // Server emails the OTP — do NOT return otp from the API
 *     // Remove otp/expiresAt from return; update OtpPreviewModal to
 *     // show a generic "check your email" message instead.
 *     return { success: true, maskedEmail: res.data.maskedEmail };
 *   }
 */
export async function sendForgotPasswordOTP(email) {
  const norm = email.trim().toLowerCase();

  if (!norm) {
    return { success: false, error: 'Email address is required.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(norm)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  try {
    const res = await apiClient.post('/auth/forgot-password', { email: norm });
    // Keep 5 minute expiry for the countdown timer purely for UX.
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    return { success: true, maskedEmail: res.data.maskedEmail, otp: '', expiresAt };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || 'Failed to send OTP.' };
  }
}

// ─────────────────────────────────────────────────────────────
// STEP 2 — Verify OTP
// ─────────────────────────────────────────────────────────────

/**
 * Validates the OTP entered by the user.
 * Does NOT clear the OTP — that happens only after password reset.
 *
 * @param {string} email
 * @param {string} otp
 * @returns {{ success: true }}
 *       or {{ success: false, error: string }}
 *
 * Backend replacement:
 *   const res = await axios.post('/auth/verify-otp', { email, otp });
 *   // store res.data.resetToken in sessionStorage for the next step
 *   return { success: true };
 */
export async function verifyForgotPasswordOTP(email, otp) {
  if (!otp || otp.trim().length !== 6) {
    return { success: false, error: 'Please enter the 6-digit OTP.' };
  }

  try {
    await apiClient.post('/auth/verify-otp', { email: email.trim().toLowerCase(), otp });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || 'Invalid or expired OTP.' };
  }
}

// ─────────────────────────────────────────────────────────────
// STEP 3 — Reset Password
// ─────────────────────────────────────────────────────────────

/**
 * Validates the OTP one final time, updates the user's password in
 * localStorage, then clears the OTP session.
 *
 * @param {string} email
 * @param {string} otp          - the verified 6-digit code
 * @param {string} newPassword
 * @returns {{ success: true }}
 *       or {{ success: false, error: string }}
 *
 * Backend replacement:
 *   const res = await axios.post('/auth/reset-password', {
 *     resetToken,   // from sessionStorage after verifyForgotPasswordOTP
 *     newPassword,
 *   });
 *   return { success: true };
 */
export async function resetPassword(email, otp, newPassword) {
  try {
    await apiClient.post('/auth/reset-password', {
      email: email.trim().toLowerCase(),
      newPassword
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || 'Failed to update password.' };
  }
}

// ─────────────────────────────────────────────────────────────
// Authentication API
// ─────────────────────────────────────────────────────────────

export const authService = {
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email: email.trim().toLowerCase(), password });
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message || 'Login failed', code: err.response?.data?.code };
    }
  },

  register: async (payload) => {
    try {
      const response = await apiClient.post('/auth/register', payload);
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Registration failed.' };
    }
  },

  sendRegistrationOtp: async (email) => {
    try {
      const response = await apiClient.post('/auth/send-registration-otp', { email: email.trim().toLowerCase() });
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to send OTP. Please try again.' };
    }
  },

  verifyRegistrationOtp: async (email, otp) => {
    try {
      const response = await apiClient.post('/auth/verify-registration-otp', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'OTP verification failed.' };
    }
  },
};

