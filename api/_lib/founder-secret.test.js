// @vitest-environment node
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  FOUNDER_SECRET_BLOCKLIST,
  FOUNDER_SECRET_MIN_LENGTH,
  configuredFounderSecret,
  founderSecretBlockReason,
  founderSecretDigest,
  isAcceptableFounderSecret,
} from './founder-secret.js';

describe('FOUNDER_ADMIN_SECRET policy', () => {
  it('requires at least 32 characters', () => {
    const acceptable = randomBytes(32).toString('base64url');
    expect(FOUNDER_SECRET_MIN_LENGTH).toBe(32);
    expect(founderSecretBlockReason('')).toBe('missing');
    expect(founderSecretBlockReason('x'.repeat(31))).toBe('too_short');
    expect(isAcceptableFounderSecret(acceptable)).toBe(true);
    expect(configuredFounderSecret(acceptable)).toBe(acceptable);
  });

  it('stores the blocklist as hashes and rejects an exact digest match', () => {
    expect(FOUNDER_SECRET_BLOCKLIST.length).toBeGreaterThan(0);
    for (const hash of FOUNDER_SECRET_BLOCKLIST) {
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    }
    const secret = randomBytes(32).toString('base64url');
    const digest = founderSecretDigest(secret);
    expect(founderSecretBlockReason(secret, [digest])).toBe('blocked');
    expect(configuredFounderSecret(secret)).toBe(secret);
    expect(founderSecretBlockReason(`${secret}x`, [digest])).toBeNull();
  });

  it('includes the published founder test placeholder hashes', () => {
    expect(FOUNDER_SECRET_BLOCKLIST).toEqual(expect.arrayContaining([
      '3d7bbd98be020ed2dc4b6de320283abcb86c2066eb2f6a992ca6a4097e20776c',
      '6e6c81147ec39c839015ed57124e96ef4d3a49192401e65b12a02ab926d0676b',
    ]));
  });
});
