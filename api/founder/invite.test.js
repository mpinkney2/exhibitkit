// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createBetaInvite: vi.fn(),
}));

vi.mock('../_lib/beta-invite-service.js', () => ({
  createBetaInvite: mocks.createBetaInvite,
}));

import invite, { resetFounderInviteRateLimitForTesting } from './invite.js';

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

// Backend settings required to mint (values are placeholders; the service itself
// is mocked in these unit tests). Email vars are intentionally omitted — email is
// optional for minting.
function configureBackendEnv() {
  process.env.DATABASE_URL = 'postgres://test';
  process.env.LICENSE_HASH_SECRET = 'x'.repeat(48);
  process.env.LICENSE_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
}

function clearBackendEnv() {
  delete process.env.DATABASE_URL;
  delete process.env.LICENSE_HASH_SECRET;
  delete process.env.LICENSE_ENCRYPTION_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.LICENSE_EMAIL_FROM;
}

beforeEach(() => {
  process.env.FOUNDER_ADMIN_SECRET = 'production-founder-secret-ok';
  process.env.APP_URL = ORIGIN;
  configureBackendEnv();
  vi.clearAllMocks();
  resetFounderInviteRateLimitForTesting();
  mocks.createBetaInvite.mockResolvedValue(SAMPLE_INVITE);
});

afterEach(() => {
  delete process.env.FOUNDER_ADMIN_SECRET;
  delete process.env.APP_URL;
  clearBackendEnv();
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

  it('returns 429 once the per-IP invite limit is exceeded', async () => {
    for (let i = 0; i < 30; i += 1) {
      // These use a wrong secret (401), but each still counts toward the limit.
      await invite.fetch(inviteRequest({ secret: 'nope', email: 'a@b.co' }));
    }
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

  it('reports exactly which backend settings are missing (email is not required)', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.LICENSE_ENCRYPTION_KEY;
    const response = await invite.fetch(inviteRequest({ secret: 'production-founder-secret-ok', email: 'a@b.co' }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('INVITE_BACKEND_NOT_CONFIGURED');
    expect(body.error).toContain('DATABASE_URL');
    expect(body.error).toContain('LICENSE_ENCRYPTION_KEY');
    expect(body.error).not.toContain('RESEND_API_KEY');
    expect(mocks.createBetaInvite).not.toHaveBeenCalled();
  });

  it('maps a missing-migration database error to actionable guidance', async () => {
    mocks.createBetaInvite.mockRejectedValueOnce(
      new Error('column "source" of relation "exhibitkit_licenses" does not exist'),
    );
    const response = await invite.fetch(inviteRequest({ secret: 'production-founder-secret-ok', email: 'a@b.co' }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('INVITE_DB_MIGRATION_REQUIRED');
    expect(body.error).toMatch(/db:migrate/);
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
