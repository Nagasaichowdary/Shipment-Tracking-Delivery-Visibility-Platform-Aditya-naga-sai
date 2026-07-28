/**
 * passwordUtils.js
 * ─────────────────────────────────────────────────────────────
 * Password strength analysis and validation helpers.
 * Pure utility — no side effects, no state.
 */

/**
 * Password strength rules.
 * Each rule has a label, a regex test, and a weight used to
 * compute an overall strength score 0-100.
 */
export const PASSWORD_RULES = [
  { id: 'length',    label: 'At least 8 characters',    test: (p) => p.length >= 8,             weight: 20 },
  { id: 'uppercase', label: 'One uppercase letter',     test: (p) => /[A-Z]/.test(p),          weight: 20 },
  { id: 'lowercase', label: 'One lowercase letter',     test: (p) => /[a-z]/.test(p),          weight: 20 },
  { id: 'number',    label: 'One number',               test: (p) => /[0-9]/.test(p),          weight: 20 },
  { id: 'special',   label: 'One special character',    test: (p) => /[^A-Za-z0-9]/.test(p), weight: 20 },
];

/**
 * Analyses a password and returns per-rule pass/fail and an
 * overall strength score (0–100).
 *
 * @param {string} password
 * @returns {{
 *   score: number,            // 0–100
 *   level: 'weak'|'medium'|'strong',
 *   levelColor: string,       // CSS hex colour
 *   rules: Array<{ id, label, passed: boolean }>
 * }}
 */
export function analysePassword(password) {
  const rules = PASSWORD_RULES.map(r => ({
    id:     r.id,
    label:  r.label,
    passed: r.test(password),
    weight: r.weight,
  }));

  const score = rules.reduce((acc, r) => acc + (r.passed ? r.weight : 0), 0);

  let level, levelColor;
  if (score < 50) { 
    level = 'weak';   
    levelColor = '#ef4444'; // Red
  } else if (score < 100) { 
    level = 'medium'; 
    levelColor = '#f97316'; // Orange
  } else { 
    level = 'strong'; 
    levelColor = '#10b981'; // Green
  }

  return { score, level, levelColor, rules };
}

/**
 * Returns true if the password satisfies ALL rules.
 * @param {string} password
 * @returns {boolean}
 */
export function isPasswordStrong(password) {
  return PASSWORD_RULES.every(r => r.test(password));
}
