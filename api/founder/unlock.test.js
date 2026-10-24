// @vitest-environment node
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';
import { bytesToBase64, verifyFounderToken } from '../../src/utils/entitlementToken.js';
import unlock, { resetFounderUnlockRateLimitForTesting } from './unlock.js';

const { secretKey, publicKey } = ed25519.keygen();
const founderSecret = randomBytes(32).toString('base64url');
const wrongSecret = randomBytes(32).toString('base64url');

function unlockRequest(secret, origin = 'https://exhibitkit.patentpreppers.com') {
  return new Request('https://exhibitkit.patentpreppers.com/api/founder/unlock', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin,
      'x-forwarded-for': '203.0.113.10',
    },
    body: JSON.stringify({ secret }),
  });
}

beforeEach(() => {
  process.env['FOUNDER_ADMIN_SECRET'] = founderSecret;
  process.env.ENTITLEMENT_SIGNING_KEY = bytesToBase64(secretKey);
  process.env.APP_URL = 'https://exhibitkit.patentpreppers.com';
  resetFounderUnlockRateLimitForTesting();
});

afterEach(() => {
  delete process.env.FOUNDER_ADMIN_SECRET;
  delete process.env.ENTITLEMENT_SIGNING_KEY;
  delete process.env.APP_URL;
});

describe('POST /api/founder/unlock', () => {
  it('rejects when FOUNDER_ADMIN_SECRET is missing', async () => {
    delete process.env['FOUNDER_ADMIN_SECRET'];
    const response = await unlock.fetch(unlockRequest('anything'));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('FOUNDER_NOT_CONFIGURED');
  });

  it('rejects a short founder secret', async () => {
    const shortSecret = 'x'.repeat(31);
    process.env['FOUNDER_ADMIN_SECRET'] = shortSecret;
    const short = await unlock.fetch(unlockRequest(shortSecret));
    expect(short.status).toBe(503);
    expect((await short.json()).code).toBe('FOUNDER_NOT_CONFIGURED');
  });

  it('rejects an incorrect secret', async () => {
    const response = await unlock.fetch(unlockRequest(wrongSecret));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe('FOUNDER_DENIED');
  });

  it('accepts the server-only secret and returns a founder token', async () => {
    const response = await unlock.fetch(unlockRequest(founderSecret));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(verifyFounderToken(body.founderToken, publicKey)?.typ).toBe('founder');
  });

  it('does not unlock when the signing key is missing', async () => {
    delete process.env.ENTITLEMENT_SIGNING_KEY;
    const response = await unlock.fetch(unlockRequest(founderSecret));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('ENTITLEMENT_SIGNING_UNAVAILABLE');
  });

  it('rejects disallowed origins', async () => {
    const response = await unlock.fetch(unlockRequest(founderSecret, 'https://evil.example'));
    expect(response.status).toBe(403);
  });
});
