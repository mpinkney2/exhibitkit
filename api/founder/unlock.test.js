// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import unlock, { resetFounderUnlockRateLimitForTesting } from './unlock.js';

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
  process.env.FOUNDER_ADMIN_SECRET = 'production-founder-secret-ok';
  process.env.APP_URL = 'https://exhibitkit.patentpreppers.com';
  resetFounderUnlockRateLimitForTesting();
});

afterEach(() => {
  delete process.env.FOUNDER_ADMIN_SECRET;
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

  it('rejects an incorrect secret', async () => {
    const response = await unlock.fetch(unlockRequest('wrong-secret-value'));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe('FOUNDER_DENIED');
  });

  it('accepts the server-only secret', async () => {
    const response = await unlock.fetch(unlockRequest('production-founder-secret-ok'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('rejects disallowed origins', async () => {
    const response = await unlock.fetch(unlockRequest('production-founder-secret-ok', 'https://evil.example'));
    expect(response.status).toBe(403);
  });
});
