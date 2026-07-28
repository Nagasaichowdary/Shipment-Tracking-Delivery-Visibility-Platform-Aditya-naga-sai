/**
 * otpUtils.js
 * ─────────────────────────────────────────────────────────────
 * OTP generation and validation utilities.
 *
 * localStorage key: "stp_otp_session"
 * Shape: { otp, email, expiresAt (ISO string) }
 *
 * ── Backend integration ────────────────────────────────────────
 * When Spring Boot is ready:
 *   - generateOTP()  → trigger POST /auth/forgot-password (server generates & emails OTP)
 *   - verifyOTP()    → POST /auth/verify-otp
 *   - clearOTP()     → handled automatically server-side after reset
 *   The localStorage storage in this file is entirely replaced by server state.
 */

const OTP_SESSION_KEY = 'stp_otp_session';
const OTP_TTL_MS      = 5 * 60 * 1000; // 5 minutes

/**
 * Generates a random 6-digit OTP string (zero-padded).
 * @returns {string}  e.g. "047382"
 */
export function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Stores an OTP session in localStorage tied to the given email.
 * Overwrites any previous OTP session.
 *
 * @param {string} email
 * @param {string} otp
 */
export function storeOTPSession(email, otp) {
  const session = {
    otp,
    email: email.trim().toLowerCase(),
    expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  };
  localStorage.setItem(OTP_SESSION_KEY, JSON.stringify(session));
}

/**
 * Returns the current OTP session, or null if none exists / is corrupted.
 * @returns {{ otp: string, email: string, expiresAt: string } | null}
 */
export function getOTPSession() {
  try {
    const raw = localStorage.getItem(OTP_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

/**
 * Validates the given OTP against the stored session for a specific email.
 *
 * @param {string} email   - must match the session email
 * @param {string} otp     - the 6-digit code entered by the user
 * @returns {'valid' | 'expired' | 'invalid' | 'no_session'}
 */
export function validateOTP(email, otp) {
  const session = getOTPSession();

  if (!session) return 'no_session';

  if (session.email !== email.trim().toLowerCase()) return 'invalid';

  if (new Date() > new Date(session.expiresAt)) return 'expired';

  if (session.otp !== otp.trim()) return 'invalid';

  return 'valid';
}

/**
 * Removes the OTP session from localStorage.
 * Called after a successful password reset.
 *
 * Backend: no-op — server invalidates token automatically.
 */
export function clearOTPSession() {
  localStorage.removeItem(OTP_SESSION_KEY);
}

/**
 * Returns milliseconds remaining until the current OTP expires.
 * Returns 0 if expired or no session exists.
 * @returns {number}
 */
export function getOTPRemainingMs() {
  const session = getOTPSession();
  if (!session) return 0;
  const remaining = new Date(session.expiresAt) - new Date();
  return Math.max(0, remaining);
}
