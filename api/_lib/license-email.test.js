// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    constructor() {
      this.emails = { send: mocks.send };
    }
  },
}));

import { sendBetaInviteEmail } from './license-email.js';

const INVITE = {
  to: 'tester@example.com',
  licenseKey: 'EKIT-TEST-TEST-TEST',
  expiresAt: '2026-12-01T00:00:00.000Z',
  licenseId: 'lic_email_1',
};

beforeEach(() => {
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.LICENSE_EMAIL_FROM = 'ExhibitKIT <licenses@example.com>';
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.LICENSE_EMAIL_FROM;
});

async function captureFailure(error) {
  mocks.send.mockResolvedValueOnce({ data: null, error });
  return sendBetaInviteEmail(INVITE).then(
    () => {
      throw new Error('expected sendBetaInviteEmail to throw');
    },
    (caught) => caught,
  );
}

describe('sendBetaInviteEmail provider errors', () => {
  it('attaches the provider name, message, and HTTP status', async () => {
    const failure = await captureFailure({
      name: 'validation_error',
      message: 'Recipient rejected',
      statusCode: 422,
      headers: { authorization: 'Bearer test-resend-key' },
      response: { headers: { 'x-api-key': 'test-resend-key' } },
    });

    expect(failure).toBeInstanceOf(Error);
    expect(failure.name).toBe('validation_error');
    expect(failure.message).toBe('Recipient rejected');
    expect(failure.statusCode).toBe(422);
    expect(failure).not.toHaveProperty('headers');
    expect(failure).not.toHaveProperty('response');
    expect(Object.getOwnPropertyNames(failure)).not.toContain('headers');
    expect(Object.getOwnPropertyNames(failure)).not.toContain('response');
    expect(failure.message).not.toContain('test-resend-key');
    expect(failure.message).not.toContain('tester@example.com');
    expect(failure.message).not.toContain('lic_email_1');
    expect(failure.message).not.toContain(INVITE.licenseKey);
  });

  it('copies the provider message onto the thrown error', async () => {
    const failure = await captureFailure({
      name: 'invalid_api_key',
      message: 'rejected tester@example.com with re_test_key',
      statusCode: 401,
    });

    expect(failure.name).toBe('invalid_api_key');
    expect(failure.message).toBe('rejected tester@example.com with re_test_key');
    expect(failure.statusCode).toBe(401);
  });

  it('uses a stable fallback when the provider omits a name, message, or status', async () => {
    const missingName = await captureFailure({ message: 'nope', statusCode: 500 });
    expect(missingName.name).toBe('provider_error');
    expect(missingName.message).toBe('nope');
    expect(missingName.statusCode).toBe(500);

    const missingStatus = await captureFailure({
      name: 'application_error',
      message: 'unavailable',
    });
    expect(missingStatus.name).toBe('application_error');
    expect(missingStatus.message).toBe('unavailable');
    expect(missingStatus.statusCode).toBeNull();

    const missingMessage = await captureFailure({ name: 'validation_error', statusCode: 422 });
    expect(missingMessage.name).toBe('validation_error');
    expect(missingMessage.message).toBe('Beta invite email failed: validation_error');
    expect(missingMessage.statusCode).toBe(422);
  });

  it('does not use a key-shaped provider name', async () => {
    const failure = await captureFailure({
      name: 're_test_key',
      message: 'nope',
      statusCode: 403,
    });

    expect(failure.name).toBe('provider_error');
    expect(failure.message).toBe('nope');
    expect(failure.statusCode).toBe(403);
  });

  it('ignores a non-numeric status code', async () => {
    const failure = await captureFailure({
      name: 'validation_error',
      message: 'nope',
      statusCode: '422',
    });

    expect(failure.statusCode).toBeNull();
  });
});
