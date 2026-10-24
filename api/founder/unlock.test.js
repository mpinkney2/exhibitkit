// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';
import { bytesToBase64, verifyFounderToken } from '../../src/utils/entitlementToken.js';
import unlock, { resetFounderUnlockRateLimitForTesting } from './unlock.js';

const { secretKey, publicKey } = ed25519.keygen();
const FOUNDER_SECRET = 'acceptable-founder-admin-secret-value';

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
  process.env.FOUNDER_ADMIN_SECRET = FOUNDER_SECRET;
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
    delete process.env.FOUNDER_ADMIN_SECRET;
    const response = await unlock.fetch(unlockRequest('anything'));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('FOUNDER_NOT_CONFIGURED');
  });

  it('rejects a short or known founder secret', async () => {
    process.env.FOUNDER_ADMIN_SECRET = 'ekit-founder-2026';
    const short = await unlock.fetch(unlockRequest('ekit-founder-2026'));
    expect(short.status).toBe(503);
    expect((await short.json()).code).toBe('FOUNDER_NOT_CONFIGURED');

    const padded = 'ekit-founder-2026-ekit-founder-2026';
    process.env.FOUNDER_ADMIN_SECRET = padded;
    const blocked = await unlock.fetch(unlockRequest(padded));
    expect(blocked.status).toBe(503);
    expect((await blocked.json()).code).toBe('FOUNDER_NOT_CONFIGURED');
  });

  it('rejects an incorrect secret', async () => {
    const response = await unlock.fetch(unlockRequest('wrong-secret-value'));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe('FOUNDER_DENIED');
  });

  it('accepts the server-only secret and returns a founder token', async () => {
    const response = await unlock.fetch(unlockRequest(FOUNDER_SECRET));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(verifyFounderToken(body.founderToken, publicKey)?.typ).toBe('founder');
  });

  it('does not unlock when the signing key is missing', async () => {
    delete process.env.ENTITLEMENT_SIGNING_KEY;
    const response = await unlock.fetch(unlockRequest(FOUNDER_SECRET));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('ENTITLEMENT_SIGNING_UNAVAILABLE');
  });

  it('rejects disallowed origins', async () => {
    const response = await unlock.fetch(unlockRequest('acceptable-founder-admin-secret-value', 'https://evil.example'));
    expect(response.status).toBe(403);
  });
});
