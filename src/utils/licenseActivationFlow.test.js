import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';
import { bytesToBase64, signEntitlementToken, workstationClaimHash } from './entitlementToken.js';
import { getWorkstationInfo } from './license.js';
import { applyEntitlementRecord } from './entitlement.js';
import { recheckLicenseOnDevice } from './licenseActivationFlow.js';
import { noteLicenseChecked, readDeviceSession } from './licenseDeviceStatus.js';

const { secretKey, publicKey } = ed25519.keygen();
const publicKeyB64 = bytesToBase64(publicKey);
const CHECKED_AT = '2026-11-01T12:00:00.000Z';

function signedRecord(licenseId = 'lic_recheck') {
  const issuedAt = new Date().toISOString();
  const expiry = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
  return {
    plan: 'pro_perpetual',
    purchasedAt: issuedAt,
    expiresAt: null,
    casePassStatus: 'none',
    serverVerified: true,
    activationToken: 'b'.repeat(43),
    licenseEmail: 'owner@example.com',
    licenseFingerprint: '••••-IJKL',
    entitlementToken: signEntitlementToken({
      plan: 'pro_perpetual',
      expiry,
      licenseId,
      issuedAt,
      workstationHash: workstationClaimHash(getWorkstationInfo().deviceId),
    }, secretKey),
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_ENTITLEMENT_PUBLIC_KEY', publicKeyB64);
  const record = signedRecord();
  applyEntitlementRecord(record);
  noteLicenseChecked(record, { now: new Date(CHECKED_AT) });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('recheckLicenseOnDevice', () => {
  it.each([
    ['network failure', () => Promise.reject(new Error('offline'))],
    ['server error', () => Promise.resolve(new Response('{}', { status: 503 }))],
    ['rate limit', () => Promise.resolve(new Response(JSON.stringify({ ok: false }), {
      status: 429,
      headers: { 'content-type': 'application/json' },
    }))],
    ['response without a token', () => Promise.resolve(new Response(JSON.stringify({
      ok: true,
      active: true,
      entitlement: { plan: 'pro_perpetual' },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))],
  ])('keeps the previous validation time after a %s', async (_label, responder) => {
    vi.stubGlobal('fetch', vi.fn(responder));

    const result = await recheckLicenseOnDevice(getWorkstationInfo().deviceId);

    expect(result.ok).toBe(false);
    expect(readDeviceSession().lastValidatedAt).toBe(CHECKED_AT);
  });

  it('records the validation time after the license service confirms the seat', async () => {
    const confirmed = signedRecord('lic_recheck_ok');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      active: true,
      entitlement: confirmed,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));

    const before = Date.now();
    const result = await recheckLicenseOnDevice(getWorkstationInfo().deviceId);
    const checkedAt = Date.parse(readDeviceSession().lastValidatedAt);

    expect(result.ok).toBe(true);
    expect(checkedAt).toBeGreaterThanOrEqual(before);
    expect(readDeviceSession().lastValidatedAt).not.toBe(CHECKED_AT);
  });

  it('keeps an expired time-limited license on this device and drops paid access', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      active: false,
      reason: 'expired',
      license: {
        plan: 'pro_perpetual',
        licenseSource: 'beta',
        expiresAt: '2026-11-01T00:00:00.000Z',
        licenseEmail: 'owner@example.com',
        licenseFingerprint: '••••-IJKL',
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));

    const result = await recheckLicenseOnDevice(getWorkstationInfo().deviceId);

    expect(result.cleared).toBe(false);
    expect(result.expired).toBe(true);
    expect(result.view.endedLabel).toBe('Beta ended');
    expect(result.view.hasLicense).toBe(true);
    expect(result.entitlement.plan).toBe('free');
    expect(readDeviceSession()?.email).toBe('owner@example.com');
    const stored = JSON.parse(localStorage.getItem('exhibitkit_entitlement_v1'));
    expect(stored.licenseSource).toBe('beta');
    expect(stored.licenseEmail).toBe('owner@example.com');
    expect(stored.entitlementToken).toBeNull();
  });

  it('still clears a revoked seat', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: false,
      active: false,
    }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })));

    const result = await recheckLicenseOnDevice(getWorkstationInfo().deviceId);

    expect(result.cleared).toBe(true);
    expect(result.expired).toBe(false);
    expect(result.view.hasLicense).toBe(false);
    expect(readDeviceSession()).toBeNull();
  });
});
