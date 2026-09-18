// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createBetaInvite: vi.fn(),
  consumeRateLimit: vi.fn(),
}));

vi.mock('../_lib/beta-invite-service.js', () => ({
  createBetaInvite: mocks.createBetaInvite,
}));

vi.mock('../_lib/rate-limit.js', () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));

import invite from './invite.js';

const ORIGIN = 'https://exhibitkit.patentpreppers.com';

function inviteRequest(body, { origin = ORIGIN, method = 'POST' } = {}) {
  return new Request(`${ORIGIN}/api/founder/invite`, {
    method,
    headers: {
      'content-type': 'application/json',
      origin,
      'x-forwarded-for': '203.0.113.42',
    },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  });
}

const SAMPLE_INVITE = {
  key: 'EKIT-BETA-TEST-0001',
  fingerprint: '••••-0001',
  email: 'tester@example.com',
  expiresAt: '2026-10-18T00:00:00.000Z',
  days: 30,
  emailStatus: 'sent',
};

beforeEach(() => {
  process.env.FOUNDER_ADMIN_SECRET = 'production-founder-secret-ok';
  process.env.APP_URL = ORIGIN;
  vi.clearAllMocks();
  mocks.consumeRateLimit.mockResolvedValue(true);
  mocks.createBetaInvite.mockResolvedValue(SAMPLE_INVITE);
});

afterEach(() => {
  delete process.env.FOUNDER_ADMIN_SECRET;
  delete process.env.APP_URL;
});

describe('POST /api/founder/invite', () => {
  it('rejects non-POST methods', async () => {
    const response = await invite.fetch(inviteRequest({}, { method: 'GET' }));
    expect(response.status).toBe(405);
    expect(mocks.createBetaInvite).not.toHaveBeenCalled();
  });

  it('rejects disallowed origins', async () => {
    const response = await invite.fetch(inviteRequest({ email: 'a@b.co' }, { origin: 'https://evil.example' }));
    expect(response.status).toBe(403);
    expect(mocks.createBetaInvite).not.toHaveBeenCalled();
  });

  it('returns 503 when FOUNDER_ADMIN_SECRET is missing', async () => {
    delete process.env.FOUNDER_ADMIN_SECRET;
    const response = await invite.fetch(inviteRequest({ email: 'a@b.co' }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('FOUNDER_NOT_CONFIGURED');
    expect(mocks.createBetaInvite).not.toHaveBeenCalled();
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    mocks.consumeRateLimit.mockResolvedValueOnce(false);
    const response = await invite.fetch(inviteRequest({ secret: 'production-founder-secret-ok', email: 'a@b.co' }));
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.code).toBe('RATE_LIMITED');
    expect(mocks.createBetaInvite).not.toHaveBeenCalled();
  });

  it('rejects an incorrect founder secret without minting', async () => {
    const response = await invite.fetch(inviteRequest({ secret: 'wrong-secret-value', email: 'a@b.co' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('FOUNDER_DENIED');
    expect(mocks.createBetaInvite).not.toHaveBeenCalled();
  });

  it('mints and returns a beta invite for a valid founder request', async () => {
    const response = await invite.fetch(inviteRequest({
      secret: 'production-founder-secret-ok',
      email: 'tester@example.com',
      name: 'Test Tester',
      note: 'Round 1',
      days: 30,
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      key: 'EKIT-BETA-TEST-0001',
      fingerprint: '••••-0001',
      email: 'tester@example.com',
      days: 30,
      emailStatus: 'sent',
    });
    expect(mocks.createBetaInvite).toHaveBeenCalledWith({
      email: 'tester@example.com',
      days: 30,
      name: 'Test Tester',
      note: 'Round 1',
      invitedBy: 'founder',
    });
  });
});
