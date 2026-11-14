// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  insertBetaLicense: vi.fn(),
  updateLicenseEmailStatus: vi.fn(),
  sendBetaInviteEmail: vi.fn(),
  findActiveBetaLicense: vi.fn(),
}));

vi.mock('./license-repository.js', () => ({
  insertBetaLicense: mocks.insertBetaLicense,
  updateLicenseEmailStatus: mocks.updateLicenseEmailStatus,
  findActiveBetaLicense: mocks.findActiveBetaLicense,
}));

vi.mock('./license-email.js', () => ({
  sendBetaInviteEmail: mocks.sendBetaInviteEmail,
}));

import {
  createBetaInvite,
  createBetaInvites,
  MAX_BETA_DAYS,
  MAX_INVITES_PER_BATCH,
  MIN_BETA_DAYS,
  parseInviteList,
} from './beta-invite-service.js';
import { isLicenseKeyFormat } from './license-crypto.js';

let errorSpy;

beforeEach(() => {
  process.env.LICENSE_HASH_SECRET = 'x'.repeat(48);
  process.env.LICENSE_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.LICENSE_EMAIL_FROM = 'ExhibitKIT <licenses@example.com>';
  process.env.EXHIBITKIT_VERSION = 'v1.2.3';
  vi.clearAllMocks();
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.insertBetaLicense.mockImplementation(async (record) => ({
    id: 'lic_test_1',
    customer_email: record.customerEmail,
    license_fingerprint: record.licenseFingerprint,
    expires_at: record.expiresAt,
  }));
  mocks.sendBetaInviteEmail.mockResolvedValue('resend_msg_1');
  mocks.updateLicenseEmailStatus.mockResolvedValue(undefined);
  mocks.findActiveBetaLicense.mockResolvedValue(null);
});

afterEach(() => {
  errorSpy.mockRestore();
  delete process.env.LICENSE_HASH_SECRET;
  delete process.env.LICENSE_ENCRYPTION_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.LICENSE_EMAIL_FROM;
  delete process.env.EXHIBITKIT_VERSION;
});

describe('createBetaInvite', () => {
  it('rejects an invalid tester email before touching the database', async () => {
    await expect(createBetaInvite({ email: 'not-an-email' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_EMAIL',
    });
    expect(mocks.insertBetaLicense).not.toHaveBeenCalled();
  });

  it('mints a real server-verified 30-day Pro license and emails the key', async () => {
    const result = await createBetaInvite({ email: 'Tester@Example.com', name: 'Test', note: 'beta1' });

    expect(isLicenseKeyFormat(result.key)).toBe(true);
    expect(result.email).toBe('tester@example.com');
    expect(result.days).toBe(30);
    expect(result.emailStatus).toBe('sent');
    expect(result.emailError).toBeUndefined();
    expect(errorSpy).not.toHaveBeenCalled();

    const record = mocks.insertBetaLicense.mock.calls[0][0];
    expect(record.plan).toBe('pro_perpetual');
    expect(record.source).toBe('beta');
    expect(record.priceId).toBe('beta-invite');
    expect(record.maxActivations).toBe(1);
    expect(record.checkoutSessionId).toMatch(/^beta-invite-/);
    expect(record.updatesIncludedUntil).toBe(record.expiresAt);
    expect(record.inviteeName).toBe('Test');
    expect(record.invitedBy).toBe('founder');

    const spanMs = new Date(record.expiresAt).getTime() - new Date(record.purchasedAt).getTime();
    expect(spanMs).toBe(30 * 24 * 60 * 60 * 1000);

    // The plaintext key (not a hash) is emailed and delivery is recorded.
    expect(mocks.sendBetaInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'tester@example.com', licenseKey: result.key, licenseId: 'lic_test_1' }),
    );
    expect(mocks.updateLicenseEmailStatus).toHaveBeenCalledWith('lic_test_1', 'sent', 'resend_msg_1');
  });

  it('clamps the duration to the allowed range', async () => {
    const tooLong = await createBetaInvite({ email: 'a@b.co', days: 9999 });
    expect(tooLong.days).toBe(MAX_BETA_DAYS);

    const tooShort = await createBetaInvite({ email: 'a@b.co', days: 0 });
    expect(tooShort.days).toBe(MIN_BETA_DAYS);

    const nonNumeric = await createBetaInvite({ email: 'a@b.co', days: 'abc' });
    expect(nonNumeric.days).toBe(30);
  });

  it('keeps the minted license when email delivery fails', async () => {
    mocks.sendBetaInviteEmail.mockRejectedValueOnce(new Error('provider down'));
    const result = await createBetaInvite({ email: 'a@b.co' });

    expect(isLicenseKeyFormat(result.key)).toBe(true);
    expect(result.emailStatus).toBe('failed');
    expect(result.emailError).toEqual({ name: 'Error', statusCode: null });
    expect(mocks.updateLicenseEmailStatus).toHaveBeenCalledWith('lic_test_1', 'failed');
    expect(errorSpy).toHaveBeenCalledWith('[beta-invite] email send failed', {
      name: 'Error',
      message: 'provider down',
      statusCode: null,
    });
  });

  it('logs a redacted diagnostic and still returns the license when the provider echoes secrets', async () => {
    const fromAddress = process.env.LICENSE_EMAIL_FROM;
    const apiKey = process.env.RESEND_API_KEY;
    let mintedKey = '';
    mocks.sendBetaInviteEmail.mockImplementationOnce(async ({ to, licenseKey, licenseId }) => {
      mintedKey = licenseKey;
      const failure = new Error([
        `to=${to}`,
        `from=${fromAddress}`,
        `key=${licenseKey}`,
        `lower=${licenseKey.toLowerCase()}`,
        `id=${licenseId}`,
        `api=${apiKey}`,
        'token=re_test_key',
        'authorization: Bearer re_test_key',
        'other.person@example.com',
      ].join(' '));
      failure.name = 'validation_error';
      failure.statusCode = 422;
      failure.headers = { authorization: 'Bearer header-only-token', to, from: fromAddress };
      throw failure;
    });

    const result = await createBetaInvite({ email: 'tester@example.com' });

    expect(result.key).toBe(mintedKey);
    expect(isLicenseKeyFormat(result.key)).toBe(true);
    expect(result.email).toBe('tester@example.com');
    expect(result.emailStatus).toBe('failed');
    expect(result.emailError).toEqual({ name: 'validation_error', statusCode: 422 });
    expect(result.emailError).not.toHaveProperty('message');
    expect(mocks.updateLicenseEmailStatus).toHaveBeenCalledWith('lic_test_1', 'failed');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [label, details] = errorSpy.mock.calls[0];
    expect(label).toBe('[beta-invite] email send failed');
    expect(Object.keys(details).sort()).toEqual(['message', 'name', 'statusCode']);
    expect(details.name).toBe('validation_error');
    expect(details.statusCode).toBe(422);
    expect(details.message.length).toBeLessThanOrEqual(300);
    expect(details.message).toContain('[redacted]');

    const logged = JSON.stringify(details);
    expect(logged).not.toContain(mintedKey);
    expect(logged).not.toContain(mintedKey.toLowerCase());
    expect(logged).not.toContain('lic_test_1');
    expect(logged).not.toContain(apiKey);
    expect(logged).not.toContain('re_test_key');
    expect(logged).not.toContain('re_');
    expect(logged).not.toContain('@');
    expect(logged).not.toContain('licenses@example.com');
    expect(logged).not.toContain('tester@example.com');
    expect(logged).not.toContain('ExhibitKIT <');
    expect(logged).not.toContain('authorization');
    expect(logged).not.toContain('Bearer');
    expect(logged).not.toContain('header-only-token');
  });

  it('redacts an email that would be split by the log length cap', async () => {
    mocks.sendBetaInviteEmail.mockRejectedValueOnce(
      Object.assign(new Error(`${'p'.repeat(295)} user@example.com`), {
        name: 'validation_error',
        statusCode: 400,
      }),
    );

    const result = await createBetaInvite({ email: 'a@b.co' });
    const details = errorSpy.mock.calls[0][1];

    expect(isLicenseKeyFormat(result.key)).toBe(true);
    expect(result.emailStatus).toBe('failed');
    expect(details.message).toHaveLength(300);
    expect(details.message).not.toContain('user@');
    expect(details.message).not.toContain('example.com');
    expect(details.statusCode).toBe(400);
  });

  it('does not log a key-shaped provider name', async () => {
    const failure = new Error('mailbox unavailable');
    failure.name = 're_test_key';
    failure.statusCode = 401;
    mocks.sendBetaInviteEmail.mockRejectedValueOnce(failure);

    const result = await createBetaInvite({ email: 'a@b.co' });

    expect(result.key).toMatch(/^EKIT-/);
    expect(result.emailError).toEqual({ name: 'provider_error', statusCode: 401 });
    expect(errorSpy.mock.calls[0][1]).toMatchObject({
      name: 'provider_error',
      message: 'mailbox unavailable',
      statusCode: 401,
    });
    expect(JSON.stringify(errorSpy.mock.calls[0])).not.toContain('re_');
  });

  it('mints without sending when email is not configured', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.LICENSE_EMAIL_FROM;
    const result = await createBetaInvite({ email: 'a@b.co' });

    expect(isLicenseKeyFormat(result.key)).toBe(true);
    expect(result.emailStatus).toBe('skipped');
    expect(result.emailError).toBeUndefined();
    expect(mocks.sendBetaInviteEmail).not.toHaveBeenCalled();
    expect(mocks.updateLicenseEmailStatus).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe('createBetaInvites', () => {
  it('dedupes, validates, and skips an address that already has an active beta', async () => {
    const parsed = parseInviteList('A@Example.com, not-an-email\na@example.com; b@example.com');
    expect(parsed.duplicatesRemoved).toBe(1);
    expect(parsed.addresses.map((address) => address.email || address.input)).toEqual([
      'a@example.com',
      'not-an-email',
      'b@example.com',
    ]);

    mocks.findActiveBetaLicense.mockImplementation(async (emailHash) => {
      expect(emailHash).toMatch(/^[a-f0-9]{64}$/);
      return emailHash === (await import('./license-crypto.js')).hashEmail('b@example.com')
        ? { id: 'lic_existing', expires_at: '2026-12-01T00:00:00.000Z' }
        : null;
    });

    let minted = 0;
    const outcome = await createBetaInvites({
      emails: 'A@Example.com, not-an-email\na@example.com; b@example.com',
      days: 10,
      note: 'cohort',
      reserveMint: async () => {
        minted += 1;
        return true;
      },
    });

    expect(outcome.duplicatesRemoved).toBe(1);
    expect(outcome.days).toBe(10);
    expect(outcome.results.map((result) => result.status)).toEqual([
      'sent',
      'invalid',
      'already_active',
    ]);
    expect(outcome.results[2].expiresAt).toBe('2026-12-01T00:00:00.000Z');
    expect(outcome.results[2].key).toBeUndefined();
    expect(minted).toBe(1);
    expect(mocks.insertBetaLicense).toHaveBeenCalledTimes(1);
    expect(mocks.insertBetaLicense.mock.calls[0][0].inviteNote).toBe('cohort');
  });

  it('stops minting when the founder budget is used up and reports the rest', async () => {
    const outcome = await createBetaInvites({
      emails: 'one@example.com, two@example.com',
      days: 20,
      reserveMint: async () => false,
    });
    expect(outcome.results.map((result) => result.status)).toEqual(['rate_limited', 'rate_limited']);
    expect(mocks.insertBetaLicense).not.toHaveBeenCalled();
  });

  it('rejects a list larger than the batch cap before minting', async () => {
    const emails = Array.from({ length: MAX_INVITES_PER_BATCH + 1 }, (_, index) => `t${index}@example.com`);
    await expect(createBetaInvites({ emails })).rejects.toMatchObject({
      status: 400,
      code: 'BATCH_TOO_LARGE',
    });
    expect(mocks.insertBetaLicense).not.toHaveBeenCalled();
  });
});
