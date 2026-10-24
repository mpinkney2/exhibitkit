// @vitest-environment node
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';
import { bytesToBase64, verifyFounderToken } from '../../src/utils/entitlementToken.js';

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(async () => true),
}));

vi.mock('../_lib/rate-limit.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    consumeRateLimit: mocks.consumeRateLimit,
  };
});

import unlock from './unlock.js';

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
  process.env.DATABASE_URL = 'postgres://test';
  process.env.LICENSE_HASH_SECRET = 'x'.repeat(48);
  delete process.env.RATE_LIMIT_HASH_SECRET;
  mocks.consumeRateLimit.mockReset();
  mocks.consumeRateLimit.mockResolvedValue(true);
});

afterEach(() => {
  delete process.env.FOUNDER_ADMIN_SECRET;
  delete process.env.ENTITLEMENT_SIGNING_KEY;
  delete process.env.APP_URL;
  delete process.env.DATABASE_URL;
  delete process.env.LICENSE_HASH_SECRET;
  delete process.env.RATE_LIMIT_HASH_SECRET;
});

describe('POST /api/founder/unlock', () => {
  it('rejects when FOUNDER_ADMIN_SECRET is missing', async () => {
    delete process.env['FOUNDER_ADMIN_SECRET'];
    const response = await unlock.fetch(unlockRequest('anything'));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('FOUNDER_NOT_CONFIGURED');
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
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
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith('founder_unlock_ip', '203.0.113.10', 10, 900);
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
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
  });

  it('returns 503 when the rate limiter database is not configured', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.DATABASE_URL;
    const response = await unlock.fetch(unlockRequest(founderSecret));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('RATE_LIMIT_NOT_CONFIGURED');
    expect(body.error).toBe('Rate limiting is not configured on the server.');
    expect(body.error).not.toMatch(/DATABASE_URL|LICENSE_HASH_SECRET|RATE_LIMIT_HASH_SECRET/);
    expect(errorSpy.mock.calls.flat().join(' ')).toContain('DATABASE_URL');
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('returns 503 when no rate-limit hash secret is configured', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.LICENSE_HASH_SECRET;
    const response = await unlock.fetch(unlockRequest(founderSecret));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('RATE_LIMIT_NOT_CONFIGURED');
    expect(body.error).toBe('Rate limiting is not configured on the server.');
    expect(body.error).not.toContain('DATABASE_URL');
    expect(errorSpy.mock.calls.flat().join(' ')).toContain('RATE_LIMIT_HASH_SECRET or LICENSE_HASH_SECRET');
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('asks the durable limiter for 10 attempts per 15 minutes and stops when denied', async () => {
    mocks.consumeRateLimit.mockResolvedValueOnce(false);
    const response = await unlock.fetch(unlockRequest(founderSecret));
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('900');
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'RATE_LIMITED',
    });
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith('founder_unlock_ip', '203.0.113.10', 10, 900);
  });

  it('rate limits the platform client address when a forwarded-for list is also present', async () => {
    const request = new Request('https://exhibitkit.patentpreppers.com/api/founder/unlock', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://exhibitkit.patentpreppers.com',
        'x-forwarded-for': '198.51.100.9, 203.0.113.10',
        'x-real-ip': '192.0.2.20',
      },
      body: JSON.stringify({ secret: founderSecret }),
    });
    const response = await unlock.fetch(request);
    expect(response.status).toBe(200);
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith('founder_unlock_ip', '192.0.2.20', 10, 900);
  });
});
