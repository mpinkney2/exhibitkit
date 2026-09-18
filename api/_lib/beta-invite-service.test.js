// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  insertBetaLicense: vi.fn(),
  updateLicenseEmailStatus: vi.fn(),
  sendBetaInviteEmail: vi.fn(),
}));

vi.mock('./license-repository.js', () => ({
  insertBetaLicense: mocks.insertBetaLicense,
  updateLicenseEmailStatus: mocks.updateLicenseEmailStatus,
}));

vi.mock('./license-email.js', () => ({
  sendBetaInviteEmail: mocks.sendBetaInviteEmail,
}));

import { createBetaInvite, MAX_BETA_DAYS, MIN_BETA_DAYS } from './beta-invite-service.js';
import { isLicenseKeyFormat } from './license-crypto.js';

beforeEach(() => {
  process.env.LICENSE_HASH_SECRET = 'x'.repeat(48);
  process.env.LICENSE_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  process.env.EXHIBITKIT_VERSION = 'v1.2.3';
  vi.clearAllMocks();
  mocks.insertBetaLicense.mockImplementation(async (record) => ({
    id: 'lic_test_1',
    customer_email: record.customerEmail,
    license_fingerprint: record.licenseFingerprint,
    expires_at: record.expiresAt,
  }));
  mocks.sendBetaInviteEmail.mockResolvedValue('resend_msg_1');
  mocks.updateLicenseEmailStatus.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.LICENSE_HASH_SECRET;
  delete process.env.LICENSE_ENCRYPTION_KEY;
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
    expect(mocks.updateLicenseEmailStatus).toHaveBeenCalledWith('lic_test_1', 'failed');
  });
});
