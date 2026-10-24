/** Minimum length for server-only FOUNDER_ADMIN_SECRET. */
export const FOUNDER_SECRET_MIN_LENGTH = 32;

/**
 * Exact placeholders that must never be accepted as the server secret,
 * including the former local default and values previously used in tests.
 */
const EXACT_BLOCKLIST = [
  'ekit-founder-2026',
  'test-founder-secret',
  'production-founder-secret-ok',
  'should-be-ignored-in-prod',
  'changeme',
  'change-me',
  'password',
  'secret',
  'founder',
  'admin',
  'test',
  'testing',
];

/** Published defaults and fixtures stay rejected even if padded out to 32 characters. */
const SUBSTRING_BLOCKLIST = [
  'ekit-founder-2026',
  'test-founder-secret',
  'production-founder-secret-ok',
  'should-be-ignored-in-prod',
];

/**
 * @param {unknown} secret
 * @returns {'missing' | 'too_short' | 'blocked' | null}
 */
export function founderSecretBlockReason(secret) {
  const value = String(secret ?? '').trim();
  if (!value) return 'missing';
  if (value.length < FOUNDER_SECRET_MIN_LENGTH) return 'too_short';
  const lower = value.toLowerCase();
  if (EXACT_BLOCKLIST.includes(lower)) return 'blocked';
  if (SUBSTRING_BLOCKLIST.some((item) => lower.includes(item))) return 'blocked';
  return null;
}

export function isAcceptableFounderSecret(secret) {
  return founderSecretBlockReason(secret) === null;
}

/**
 * The configured server secret, or null when it is missing, too short,
 * or a known default / test value.
 */
export function configuredFounderSecret(secret = process.env.FOUNDER_ADMIN_SECRET) {
  const value = String(secret ?? '').trim();
  if (!isAcceptableFounderSecret(value)) return null;
  return value;
}
