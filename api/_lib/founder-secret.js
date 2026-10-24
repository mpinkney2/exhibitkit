import { sha256 } from '@noble/hashes/sha2.js';

/** Minimum length for server-only FOUNDER_ADMIN_SECRET. */
export const FOUNDER_SECRET_MIN_LENGTH = 32;

/**
 * SHA-256 (hex) of known placeholders. The plaintext values are not stored.
 * Matching is exact on the normalized secret, after trimming and lowercasing.
 */
export const FOUNDER_SECRET_BLOCKLIST = [
  '1d6a8b6152387ed903b8b5be539071b67d90cff98c766d39e5ade2b0250120ea',
  '34db2d343ef27dbf8a44abf042deab846ddb18b1396d2afd80cbed55ef95d1c0',
  '05a875c81d1dd69c8cb4b6552dfcd8eae053514296e5aa29049e39334e804e0c',
  '502810b5f7dd42f2bf733be1310486cd8a3dfb36c960ac733901874648577976',
  '057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86',
  'e2186dbdb1bb4193608605e84f33208765b5693b55edd4f730a719a100eeea6f',
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b',
  '59458508a0827cff5f80ed091ebd8808fbe67c97357b58ca00a278e7359dec20',
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
  '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  'cf80cd8aed482d5d1527d7dc72fceff84e6326592848447d2dc0b0e87dfc9a90',
];

const textEncoder = new TextEncoder();

export function founderSecretDigest(secret) {
  const value = String(secret ?? '').trim().toLowerCase();
  const digest = sha256(textEncoder.encode(value));
  let hex = '';
  for (let i = 0; i < digest.length; i += 1) hex += digest[i].toString(16).padStart(2, '0');
  return hex;
}

/**
 * @param {unknown} secret
 * @param {readonly string[]} [blockedHashes]
 * @returns {'missing' | 'too_short' | 'blocked' | null}
 */
export function founderSecretBlockReason(secret, blockedHashes = FOUNDER_SECRET_BLOCKLIST) {
  const value = String(secret ?? '').trim();
  if (!value) return 'missing';
  if (value.length < FOUNDER_SECRET_MIN_LENGTH) return 'too_short';
  if (blockedHashes.includes(founderSecretDigest(value))) return 'blocked';
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
