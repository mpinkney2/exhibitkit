// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  process.env.DATABASE_URL = 'postgres://test';
  process.env.LICENSE_HASH_SECRET = 'x'.repeat(48);
  delete process.env.RATE_LIMIT_HASH_SECRET;
  mocks.consumeRateLimit.mockReset();
  mocks.consumeRateLimit.mockResolvedValue(true);
});

afterEach(() => {
  delete process.env.FOUNDER_ADMIN_SECRET;
  delete process.env.APP_URL;
  delete process.env.DATABASE_URL;
  delete process.env.LICENSE_HASH_SECRET;
  delete process.env.RATE_LIMIT_HASH_SECRET;
});

describe('POST /api/founder/unlock', () => {
  it('rejects when FOUNDER_ADMIN_SECRET is missing', async () => {
    delete process.env.FOUNDER_ADMIN_SECRET;
    const response = await unlock.fetch(unlockRequest('anything'));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('FOUNDER_NOT_CONFIGURED');
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
  });

  it('rejects an incorrect secret', async () => {
    const response = await unlock.fetch(unlockRequest('wrong-secret-value'));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe('FOUNDER_DENIED');
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith('founder_unlock_ip', '203.0.113.10', 10, 900);
  });

  it('accepts the server-only secret', async () => {
    const response = await unlock.fetch(unlockRequest('production-founder-secret-ok'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('rejects disallowed origins', async () => {
    const response = await unlock.fetch(unlockRequest('production-founder-secret-ok', 'https://evil.example'));
    expect(response.status).toBe(403);
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
  });

  it('returns 503 when the rate limiter database is not configured', async () => {
    delete process.env.DATABASE_URL;
    const response = await unlock.fetch(unlockRequest('production-founder-secret-ok'));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('RATE_LIMIT_NOT_CONFIGURED');
    expect(body.error).toContain('DATABASE_URL');
    expect(body.error).not.toContain('LICENSE_HASH_SECRET');
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
  });

  it('returns 503 when no rate-limit hash secret is configured', async () => {
    delete process.env.LICENSE_HASH_SECRET;
    const response = await unlock.fetch(unlockRequest('production-founder-secret-ok'));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('RATE_LIMIT_NOT_CONFIGURED');
    expect(body.error).toContain('RATE_LIMIT_HASH_SECRET or LICENSE_HASH_SECRET');
    expect(body.error).not.toContain('DATABASE_URL');
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
  });

  it('asks the durable limiter for 10 attempts per 15 minutes and stops when denied', async () => {
    mocks.consumeRateLimit.mockResolvedValueOnce(false);
    const response = await unlock.fetch(unlockRequest('production-founder-secret-ok'));
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
      body: JSON.stringify({ secret: 'production-founder-secret-ok' }),
    });
    const response = await unlock.fetch(request);
    expect(response.status).toBe(200);
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith('founder_unlock_ip', '192.0.2.20', 10, 900);
  });
});
