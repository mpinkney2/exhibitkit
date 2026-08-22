import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const LICENSE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LICENSE_PATTERN = /^EKIT-(?:[A-Z0-9]{4}-){2,3}[A-Z0-9]{4}$/;

export function normalizeLicenseKey(value) {
  return String(value || '').trim().toUpperCase();
}

export function isLicenseKeyFormat(value) {
  return LICENSE_PATTERN.test(normalizeLicenseKey(value));
}

export function isWorkstationIdFormat(value) {
  return /^EKIT-WORKSTATION-[A-Z0-9]{16}$/.test(String(value || '').trim());
}

export function generateLicenseKey(bytes = randomBytes(16)) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 16) {
    throw new Error('At least 16 random bytes are required to create a license key.');
  }

  const characters = Array.from(bytes.subarray(0, 16), (byte) => (
    LICENSE_ALPHABET[byte & 31]
  )).join('');
  return `EKIT-${characters.match(/.{4}/g).join('-')}`;
}

function requireSecret(secret, name) {
  if (!secret || String(secret).length < 32) {
    throw new Error(`${name} must contain at least 32 characters.`);
  }
  return String(secret);
}

export function keyedHash(value, secret, secretName = 'LICENSE_HASH_SECRET') {
  return createHmac('sha256', requireSecret(secret, secretName))
    .update(String(value), 'utf8')
    .digest('hex');
}

export function hashLicenseKey(value, secret = process.env.LICENSE_HASH_SECRET) {
  return keyedHash(normalizeLicenseKey(value), secret);
}

export function hashWorkstationId(value, secret = process.env.LICENSE_HASH_SECRET) {
  return keyedHash(`workstation:${String(value || '').trim()}`, secret);
}

export function hashActivationToken(value, secret = process.env.LICENSE_HASH_SECRET) {
  return keyedHash(`activation:${String(value || '').trim()}`, secret);
}

export function hashEmail(value, secret = process.env.LICENSE_HASH_SECRET) {
  return keyedHash(`email:${normalizeEmail(value)}`, secret);
}

export function hashRateLimitKey(value, secret = process.env.RATE_LIMIT_HASH_SECRET || process.env.LICENSE_HASH_SECRET) {
  return keyedHash(`rate-limit:${String(value || '')}`, secret, 'RATE_LIMIT_HASH_SECRET');
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isEmailFormat(value) {
  const email = normalizeEmail(value);
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateActivationToken(bytes = randomBytes(32)) {
  return Buffer.from(bytes).toString('base64url');
}

function encryptionKey(value = process.env.LICENSE_ENCRYPTION_KEY) {
  const key = Buffer.from(String(value || ''), 'base64');
  if (key.length !== 32) {
    throw new Error('LICENSE_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  return key;
}

export function encryptLicenseKey(licenseKey, encodedKey = process.env.LICENSE_ENCRYPTION_KEY) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(encodedKey), iv);
  const ciphertext = Buffer.concat([
    cipher.update(normalizeLicenseKey(licenseKey), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptLicenseKey(payload, encodedKey = process.env.LICENSE_ENCRYPTION_KEY) {
  const [version, ivPart, tagPart, ciphertextPart] = String(payload || '').split('.');
  if (version !== 'v1' || !ivPart || !tagPart || !ciphertextPart) {
    throw new Error('Encrypted license payload is invalid.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(encodedKey),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function licenseFingerprint(licenseKey) {
  const clean = normalizeLicenseKey(licenseKey);
  return clean.length >= 4 ? `••••-${clean.slice(-4)}` : '••••';
}
