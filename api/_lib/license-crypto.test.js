// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  decryptLicenseKey,
  encryptLicenseKey,
  generateActivationToken,
  generateLicenseKey,
  hashLicenseKey,
  isEmailFormat,
  isLicenseKeyFormat,
  isWorkstationIdFormat,
  normalizeEmail,
} from './license-crypto.js';

const HASH_SECRET = 'hash-secret-with-at-least-thirty-two-characters';
const ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

describe('secure license credentials', () => {
  it('generates a current 80-bit license-key shape', () => {
    const key = generateLicenseKey(Buffer.from(Array.from({ length: 16 }, (_, index) => index)));
    expect(key).toMatch(/^EKIT-(?:[A-Z2-9]{4}-){3}[A-Z2-9]{4}$/);
    expect(isLicenseKeyFormat(key)).toBe(true);
  });

  it('accepts legacy keys for customer migration but rejects malformed values', () => {
    expect(isLicenseKeyFormat('EKIT-ABCD-EFGH-IJKL')).toBe(true);
    expect(isLicenseKeyFormat('EKIT-ABCD-EFGH-IJKL-MNPQ')).toBe(true);
    expect(isLicenseKeyFormat('EKIT-ABCD-EFGH')).toBe(false);
  });

  it('encrypts stored keys and detects ciphertext tampering', () => {
    const key = 'EKIT-ABCD-EFGH-IJKL-MNPQ';
    const encrypted = encryptLicenseKey(key, ENCRYPTION_KEY);
    expect(encrypted).not.toContain(key);
    expect(decryptLicenseKey(encrypted, ENCRYPTION_KEY)).toBe(key);

    const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith('A') ? 'B' : 'A'}`;
    expect(() => decryptLicenseKey(tampered, ENCRYPTION_KEY)).toThrow();
  });

  it('uses keyed hashes rather than storing raw license keys', () => {
    const key = 'EKIT-ABCD-EFGH-IJKL-MNPQ';
    const hash = hashLicenseKey(key, HASH_SECRET);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain('ABCD');
    expect(hashLicenseKey(key.toLowerCase(), HASH_SECRET)).toBe(hash);
  });

  it('creates high-entropy activation tokens and validates public input shapes', () => {
    expect(generateActivationToken(Buffer.alloc(32, 4))).toHaveLength(43);
    expect(isWorkstationIdFormat('EKIT-WORKSTATION-ABCDEF1234567890')).toBe(true);
    expect(isWorkstationIdFormat('workstation-1')).toBe(false);
    expect(normalizeEmail(' Buyer@Example.com ')).toBe('buyer@example.com');
    expect(isEmailFormat('buyer@example.com')).toBe(true);
    expect(isEmailFormat('not-an-email')).toBe(false);
  });
});
