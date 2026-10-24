// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  FOUNDER_SECRET_MIN_LENGTH,
  configuredFounderSecret,
  founderSecretBlockReason,
  isAcceptableFounderSecret,
} from './founder-secret.js';

const ACCEPTABLE = 'acceptable-founder-admin-secret-value';

describe('FOUNDER_ADMIN_SECRET policy', () => {
  it('requires at least 32 characters', () => {
    expect(FOUNDER_SECRET_MIN_LENGTH).toBe(32);
    expect(founderSecretBlockReason('')).toBe('missing');
    expect(founderSecretBlockReason('x'.repeat(31))).toBe('too_short');
    expect(isAcceptableFounderSecret(ACCEPTABLE)).toBe(true);
    expect(configuredFounderSecret(ACCEPTABLE)).toBe(ACCEPTABLE);
  });

  it('rejects the former default and known test values, including padded copies', () => {
    const blocked = [
      'ekit-founder-2026',
      'EKIT-FOUNDER-2026',
      'ekit-founder-2026-ekit-founder-2026',
      'test-founder-secret',
      'production-founder-secret-ok',
      'prefix-production-founder-secret-ok-suffix',
      'should-be-ignored-in-prod',
      'changeme',
      'password',
    ];
    for (const value of blocked) {
      expect(founderSecretBlockReason(value)).not.toBeNull();
      expect(configuredFounderSecret(value)).toBeNull();
    }
  });
});
