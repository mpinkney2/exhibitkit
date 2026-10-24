import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';
import { bytesToBase64, signEntitlementToken } from './entitlementToken.js';
import {
  migrateLegacyLicenseIfNeeded,
  getEntitlement,
  hasProFeatures,
  isCasePassActive,
  isWithinFreeFileLimit,
  getMaxRealFilesPerBatch,
  restoreFromLicenseKey,
  refreshVerifiedEntitlementStatus,
  applyCasePassForTesting,
  applyEntitlementRecord,
  applyFounderUnlimitedPro,
  clearEntitlement,
  FREE_MAX_FILES_PER_BATCH,
  PLAN_IDS,
  areUpdatesIncluded,
  getEntitlementLabel,
  GUEST_DEMO_COMING_SOON_MESSAGE,
} from './entitlement.js';
import { activateLicense } from './license.js';

const { secretKey, publicKey } = ed25519.keygen();
const publicKeyB64 = bytesToBase64(publicKey);

function signedRecord({
  plan = PLAN_IDS.PRO,
  issuedAt = new Date().toISOString(),
  expiry = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
  licenseId = 'lic_test_1',
  ...rest
} = {}) {
  const entitlementToken = signEntitlementToken({
    plan,
    expiry,
    licenseId,
    issuedAt,
  }, secretKey);
  return {
    purchasedAt: issuedAt,
    expiresAt: plan === PLAN_IDS.CASE_PASS ? expiry : null,
    casePassStatus: plan === PLAN_IDS.CASE_PASS ? 'active' : 'none',
    serverVerified: true,
    activationToken: 'a'.repeat(43),
    ...rest,
    plan,
    entitlementToken,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_ENTITLEMENT_PUBLIC_KEY', publicKeyB64);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Free five-file limit', () => {
  it('allows up to 5 real files and rejects 6 on Free', () => {
    const ent = getEntitlement();
    expect(ent.plan).toBe(PLAN_IDS.FREE);
    expect(getMaxRealFilesPerBatch(ent)).toBe(FREE_MAX_FILES_PER_BATCH);
    expect(isWithinFreeFileLimit(5, ent)).toBe(true);
    expect(isWithinFreeFileLimit(6, ent)).toBe(false);
  });

  it('does not permanently consume Free batches across sessions', () => {
    const first = getEntitlement();
    expect(isWithinFreeFileLimit(5, first)).toBe(true);
    // Simulate another batch later — still Free, still allowed
    const second = getEntitlement();
    expect(isWithinFreeFileLimit(5, second)).toBe(true);
  });
});

describe('Case Pass entitlement', () => {
  it('grants Pro features while active', () => {
    const ent = applyCasePassForTesting(new Date().toISOString());
    expect(ent.plan).toBe(PLAN_IDS.CASE_PASS);
    expect(isCasePassActive(ent)).toBe(true);
    expect(hasProFeatures(ent)).toBe(true);
    expect(getMaxRealFilesPerBatch(ent)).toBe(Infinity);
  });

  it('expires after 30 days and revokes Pro features', () => {
    const purchasedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    applyCasePassForTesting(purchasedAt);
    const ent = getEntitlement();
    expect(ent.casePassStatus).toBe('expired');
    expect(isCasePassActive(ent)).toBe(false);
    expect(hasProFeatures(ent)).toBe(false);
    expect(isWithinFreeFileLimit(5, ent)).toBe(true);
  });
});

describe('Pro perpetual entitlement', () => {
  it('remains active after updatesIncludedUntil elapses', () => {
    const purchasedAt = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
    const updatesIncludedUntil = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const ent = applyEntitlementRecord(signedRecord({
      licenseKey: 'EKIT-TEST-AAAA-BBBB',
      purchasedAt,
      updatesIncludedUntil,
      updateRenewalStatus: 'lapsed',
      purchasedVersion: 'v0.9.3',
    }));

    expect(areUpdatesIncluded(ent)).toBe(false);
    expect(hasProFeatures(ent)).toBe(true);
    expect(ent.plan).toBe(PLAN_IDS.PRO);
  });

  it('restores Pro only after the license service verifies the key', async () => {
    const verifiedResponse = new Response(JSON.stringify({
      ok: true,
      entitlement: signedRecord({
        purchasedAt: '2026-08-21T12:00:00.000Z',
        updatesIncludedUntil: '2027-08-21T12:00:00.000Z',
        updateRenewalStatus: 'included',
        purchasedVersion: 'v0.10.0',
        licenseFingerprint: '••••-IJKL',
      }),
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(verifiedResponse));

    const result = await restoreFromLicenseKey('ekit-abcd-efgh-ijkl');
    expect(result.ok).toBe(true);
    expect(result.entitlement.plan).toBe(PLAN_IDS.PRO);
    expect(hasProFeatures(result.entitlement)).toBe(true);
    expect(fetch).toHaveBeenCalledWith('/api/license/activate', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('does not unlock Pro when the server rejects a format-valid key', async () => {
    const rejectedResponse = new Response(JSON.stringify({
      ok: false,
      code: 'INVALID_LICENSE',
      error: 'That license key could not be verified.',
    }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rejectedResponse));

    const result = await restoreFromLicenseKey('EKIT-FAKE-FAKE-FAKE');
    expect(result.ok).toBe(false);
    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures(getEntitlement())).toBe(false);
  });

  it('keeps a previously verified perpetual license during a temporary server outage', async () => {
    const ent = applyEntitlementRecord(signedRecord({
      purchasedAt: '2026-08-21T12:00:00.000Z',
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));

    const result = await refreshVerifiedEntitlementStatus(ent);
    expect(result.offline).toBe(true);
    expect(hasProFeatures(getEntitlement())).toBe(true);
  });
});

describe('legacy license migration', () => {
  it('does not grant Pro from an old local license flag', () => {
    activateLicense('EKIT-LEG1-ACY2-KEY3', 'lifetime');
    localStorage.removeItem('exhibitkit_entitlement_v1');
    localStorage.removeItem('exhibitkit_entitlement_migrated_v1');

    const ent = migrateLegacyLicenseIfNeeded();
    expect(ent.plan).toBe(PLAN_IDS.FREE);
    expect(ent.migratedFromLegacy).toBe(false);
    expect(hasProFeatures(ent)).toBe(false);
    expect(getEntitlementLabel(ent)).toBe('Free');
  });

  it('does not invent Pro access when no legacy license exists', () => {
    const ent = migrateLegacyLicenseIfNeeded();
    expect(ent.plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures(ent)).toBe(false);
  });

  it('does not grant Pro from an unsigned legacy entitlement record', () => {
    localStorage.setItem('exhibitkit_entitlement_v1', JSON.stringify({
      plan: PLAN_IDS.PRO,
      licenseKey: 'EKIT-LEG1-ACY2-KEY3',
      purchasedAt: '2024-01-01T00:00:00.000Z',
    }));
    localStorage.setItem('exhibitkit_entitlement_migrated_v1', 'true');

    const ent = getEntitlement();
    expect(ent.plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures(ent)).toBe(false);
    expect(hasProFeatures()).toBe(false);
    expect(getMaxRealFilesPerBatch(ent)).toBe(FREE_MAX_FILES_PER_BATCH);
  });

  it('does not grant Pro when a legacy record is marked unverified', () => {
    localStorage.setItem('exhibitkit_entitlement_v1', JSON.stringify({
      plan: PLAN_IDS.PRO,
      licenseKey: 'EKIT-LEG1-ACY2-KEY3',
      migratedFromLegacy: true,
      serverVerified: false,
    }));
    localStorage.setItem('exhibitkit_entitlement_migrated_v1', 'true');

    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures()).toBe(false);
    expect(getEntitlementLabel()).toBe('Free');
  });
});

describe('guest and demo keys', () => {
  const guestKeys = [
    'EKIT-GUEST-AAAA-BBBB',
    'ekit-guest-test-0001',
    'EKIT-GUEST-DEMO-SOON',
  ];

  it.each(guestKeys)('keeps %s on the free tier with a coming-soon notice', async (key) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await restoreFromLicenseKey(key);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('DEMO_COMING_SOON');
    expect(result.error).toBeUndefined();
    expect(result.notice).toBe(GUEST_DEMO_COMING_SOON_MESSAGE);
    expect(result.notice).toMatch(/coming soon/i);
    expect(result.notice).toMatch(/contact us/i);
    expect(result.entitlement.plan).toBe(PLAN_IDS.FREE);
    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not grant Pro from a stored client-only guest record', () => {
    localStorage.setItem('exhibitkit_entitlement_v1', JSON.stringify({
      plan: PLAN_IDS.CASE_PASS,
      licenseKey: 'EKIT-GUEST-AAAA-BBBB',
      serverVerified: false,
      developerOverride: true,
      guestDemo: true,
      casePassStatus: 'active',
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      purchasedAt: new Date().toISOString(),
    }));
    localStorage.setItem('exhibitkit_entitlement_migrated_v1', 'true');

    const ent = getEntitlement();
    expect(ent.plan).toBe(PLAN_IDS.FREE);
    expect(ent.demoNotice).toMatch(/coming soon/i);
    expect(ent.demoNotice).toMatch(/contact us/i);
    expect(hasProFeatures(ent)).toBe(false);
    expect(getEntitlementLabel(ent)).toBe('Free');
    expect(getMaxRealFilesPerBatch()).toBe(FREE_MAX_FILES_PER_BATCH);
  });

  it('does not grant Pro from an unsigned serverVerified flag, and DEV overrides still do', () => {
    const verified = applyEntitlementRecord({
      plan: PLAN_IDS.PRO,
      licenseKey: 'EKIT-TEST-AAAA-BBBB',
      serverVerified: true,
      activationToken: 'a'.repeat(43),
      purchasedAt: '2026-08-21T12:00:00.000Z',
    });
    expect(verified.plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures(verified)).toBe(false);

    clearEntitlement();
    const founder = applyFounderUnlimitedPro();
    expect(founder.plan).toBe(PLAN_IDS.PRO);
    expect(hasProFeatures(founder)).toBe(true);
    expect(getEntitlementLabel()).toBe('Pro');
  });
});

describe('clearEntitlement', () => {
  it('returns the workstation to Free', () => {
    applyEntitlementRecord({
      plan: PLAN_IDS.PRO,
      serverVerified: true,
      activationToken: 'a'.repeat(43),
    });
    clearEntitlement();
    const ent = getEntitlement();
    expect(ent.plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures(ent)).toBe(false);
  });
});
