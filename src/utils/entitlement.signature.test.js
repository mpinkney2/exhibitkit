import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';
import {
  assertEntitlementPublicKeyConfig,
  bytesToBase64,
  isEntitlementTokenInForce,
  OFFLINE_GRACE_MS,
  signEntitlementToken,
  signFounderToken,
  verifyEntitlementToken,
  workstationClaimHash,
} from './entitlementToken.js';
import { getWorkstationInfo } from './license.js';

const { secretKey, publicKey } = ed25519.keygen();
const publicKeyB64 = bytesToBase64(publicKey);
const DAY_MS = 24 * 60 * 60 * 1000;

function tokenFor({
  plan = 'pro_perpetual',
  issuedAt = new Date().toISOString(),
  expiry = new Date(Date.now() + 20 * DAY_MS).toISOString(),
  licenseId = 'lic_signed_1',
  kid = 'current',
  workstationId = getWorkstationInfo().deviceId,
  workstationHash = workstationClaimHash(workstationId),
  signingKey = secretKey,
} = {}) {
  return signEntitlementToken({
    plan,
    expiry,
    licenseId,
    issuedAt,
    kid,
    workstationHash,
  }, signingKey);
}

function storeEntitlement(record) {
  localStorage.setItem('exhibitkit_entitlement_v1', JSON.stringify(record));
  localStorage.setItem('exhibitkit_entitlement_migrated_v1', 'true');
}

describe('signed entitlements', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    vi.stubEnv('DEV', false);
    vi.stubEnv('PROD', true);
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_ENTITLEMENT_PUBLIC_KEY', publicKeyB64);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  async function loadEntitlement() {
    return import('./entitlement.js');
  }

  it('treats a forged localStorage record as Free', async () => {
    storeEntitlement({
      plan: 'pro_perpetual',
      serverVerified: true,
      activationToken: 'a'.repeat(43),
      purchasedAt: new Date().toISOString(),
      casePassStatus: 'none',
    });

    const { getEntitlement, hasProFeatures, getEntitlementLabel, PLAN_IDS } = await loadEntitlement();
    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures()).toBe(false);
    expect(getEntitlementLabel()).toBe('Free');
  });

  it('treats a forged founder flag as Free', async () => {
    sessionStorage.setItem('exhibitkit_founder_unlocked', 'true');
    storeEntitlement({
      plan: 'pro_perpetual',
      developerOverride: true,
      serverVerified: false,
      purchasedAt: new Date().toISOString(),
    });

    const { isFounderUnlocked } = await import('./founder.js');
    const { getEntitlement, hasProFeatures, PLAN_IDS } = await loadEntitlement();
    expect(isFounderUnlocked()).toBe(false);
    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures()).toBe(false);
  });

  it('treats a tampered token as Free', async () => {
    const token = tokenFor();
    const [payload, signature] = token.split('.');
    const index = 10;
    const replacement = signature[index] === 'A' ? 'B' : 'A';
    const tamperedSignature = `${signature.slice(0, index)}${replacement}${signature.slice(index + 1)}`;
    storeEntitlement({
      plan: 'pro_perpetual',
      serverVerified: true,
      entitlementToken: `${payload}.${tamperedSignature}`,
      purchasedAt: new Date().toISOString(),
    });

    const { getEntitlement, hasProFeatures, getEntitlementLabel, PLAN_IDS } = await loadEntitlement();
    expect(verifyEntitlementToken(`${payload}.${tamperedSignature}`, publicKey)).toBeNull();
    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
    expect(getEntitlement().configurationStatus).toBe('misconfigured');
    expect(getEntitlementLabel()).toBe('Unverified');
    expect(hasProFeatures()).toBe(false);
  });

  it('treats an expired token as Free', async () => {
    const issuedAt = new Date(Date.now() - 3 * DAY_MS).toISOString();
    const expiry = new Date(Date.now() - 60 * 1000).toISOString();
    storeEntitlement({
      plan: 'pro_perpetual',
      serverVerified: true,
      entitlementToken: tokenFor({ issuedAt, expiry }),
      purchasedAt: issuedAt,
    });

    const { getEntitlement, hasProFeatures, PLAN_IDS } = await loadEntitlement();
    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures()).toBe(false);
  });

  it('grants the plan named by a valid signed token', async () => {
    const { applyEntitlementRecord, hasProFeatures, isCasePassActive, getEntitlementLabel, PLAN_IDS } = await loadEntitlement();

    const pro = applyEntitlementRecord({
      plan: 'firm',
      serverVerified: true,
      entitlementToken: tokenFor({ plan: PLAN_IDS.PRO, licenseId: 'lic_pro' }),
      purchasedAt: new Date().toISOString(),
    });
    expect(pro.plan).toBe(PLAN_IDS.PRO);
    expect(hasProFeatures(pro)).toBe(true);
    expect(getEntitlementLabel(pro)).toBe('Pro');

    localStorage.clear();
    const caseExpiry = new Date(Date.now() + 10 * DAY_MS).toISOString();
    const casePass = applyEntitlementRecord({
      plan: PLAN_IDS.PRO,
      serverVerified: true,
      entitlementToken: tokenFor({
        plan: PLAN_IDS.CASE_PASS,
        licenseId: 'lic_case',
        expiry: caseExpiry,
      }),
      purchasedAt: new Date().toISOString(),
    });
    expect(casePass.plan).toBe(PLAN_IDS.CASE_PASS);
    expect(isCasePassActive(casePass)).toBe(true);
    expect(hasProFeatures(casePass)).toBe(true);
    expect(getEntitlementLabel(casePass)).toBe('Case Pass');
  });

  it('drops access after the offline grace window and never past token expiry', async () => {
    const issuedAt = new Date().toISOString();
    const longExpiry = new Date(Date.now() + 30 * DAY_MS).toISOString();
    const shortExpiry = new Date(Date.now() + 2 * DAY_MS).toISOString();
    const longToken = tokenFor({ issuedAt, expiry: longExpiry, licenseId: 'lic_grace' });
    const shortToken = tokenFor({ issuedAt, expiry: shortExpiry, licenseId: 'lic_cap' });
    const longClaims = verifyEntitlementToken(longToken, publicKey);
    const shortClaims = verifyEntitlementToken(shortToken, publicKey);

    expect(isEntitlementTokenInForce(longClaims, Date.now() + 6 * DAY_MS)).toBe(true);
    expect(isEntitlementTokenInForce(longClaims, Date.now() + OFFLINE_GRACE_MS + 1000)).toBe(false);
    expect(isEntitlementTokenInForce(shortClaims, Date.now() + DAY_MS)).toBe(true);
    expect(isEntitlementTokenInForce(shortClaims, Date.now() + 3 * DAY_MS)).toBe(false);

    const staleIssuedAt = new Date(Date.now() - OFFLINE_GRACE_MS - 5000).toISOString();
    storeEntitlement({
      plan: 'pro_perpetual',
      serverVerified: true,
      entitlementToken: tokenFor({
        issuedAt: staleIssuedAt,
        expiry: new Date(Date.now() + 10 * DAY_MS).toISOString(),
        licenseId: 'lic_stale',
      }),
      activationToken: 'b'.repeat(43),
      purchasedAt: staleIssuedAt,
    });

    const { getEntitlement, hasProFeatures, PLAN_IDS } = await loadEntitlement();
    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures()).toBe(false);
  });

  it('does not accept a founder token as an entitlement', async () => {
    const founderToken = signFounderToken({
      issuedAt: new Date().toISOString(),
      expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }, secretKey);
    storeEntitlement({
      plan: 'pro_perpetual',
      serverVerified: true,
      entitlementToken: founderToken,
      developerOverride: true,
    });

    const { getEntitlement, hasProFeatures, PLAN_IDS } = await loadEntitlement();
    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures()).toBe(false);
  });

  it('stays Free and keeps the activation when the public key is missing', async () => {
    vi.stubEnv('VITE_ENTITLEMENT_PUBLIC_KEY', '');
    const activationToken = 'c'.repeat(43);
    const entitlementToken = tokenFor();
    storeEntitlement({
      plan: 'pro_perpetual',
      serverVerified: true,
      activationToken,
      entitlementToken,
    });

    const {
      getEntitlement,
      hasProFeatures,
      getEntitlementLabel,
      refreshVerifiedEntitlementStatus,
      settleLicenseRefresh,
      PLAN_IDS,
    } = await loadEntitlement();
    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
    expect(getEntitlement().configurationStatus).toBe('misconfigured');
    expect(getEntitlementLabel()).toBe('Unverified');
    expect(hasProFeatures()).toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      active: true,
      entitlement: {
        plan: 'pro_perpetual',
        activationToken,
        entitlementToken: tokenFor({ licenseId: 'lic_other' }),
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const result = await refreshVerifiedEntitlementStatus();
    expect(result.misconfigured).toBe(true);
    expect(result.invalid).toBe(false);
    expect(settleLicenseRefresh(result).clear).toBe(false);
    const stored = JSON.parse(localStorage.getItem('exhibitkit_entitlement_v1'));
    expect(stored.activationToken).toBe(activationToken);
    expect(stored.entitlementToken).toBe(entitlementToken);
    expect(stored.plan).toBe('pro_perpetual');
  });

  it('does not clear the activation when the public key does not match', async () => {
    const other = ed25519.keygen();
    vi.stubEnv('VITE_ENTITLEMENT_PUBLIC_KEY', bytesToBase64(other.publicKey));
    const activationToken = 'd'.repeat(43);
    storeEntitlement({
      plan: 'pro_perpetual',
      serverVerified: true,
      activationToken,
      entitlementToken: tokenFor(),
    });

    const { getEntitlement, refreshVerifiedEntitlementStatus, settleLicenseRefresh } = await loadEntitlement();
    expect(getEntitlement().configurationStatus).toBe('misconfigured');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      active: true,
      entitlement: { plan: 'pro_perpetual', activationToken, entitlementToken: tokenFor() },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const result = await refreshVerifiedEntitlementStatus();
    expect(settleLicenseRefresh(result)).toMatchObject({ clear: false });
    expect(result.invalid).toBe(false);
    expect(JSON.parse(localStorage.getItem('exhibitkit_entitlement_v1')).activationToken).toBe(activationToken);
  });

  it('does not clear the activation when the token key id is unknown', async () => {
    const activationToken = 'e'.repeat(43);
    storeEntitlement({
      plan: 'pro_perpetual',
      serverVerified: true,
      activationToken,
      entitlementToken: tokenFor({ kid: 'previous' }),
    });

    const { getEntitlement, refreshVerifiedEntitlementStatus, settleLicenseRefresh } = await loadEntitlement();
    expect(getEntitlement().configurationStatus).toBe('misconfigured');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      active: true,
      entitlement: {
        plan: 'pro_perpetual',
        activationToken,
        entitlementToken: tokenFor({ kid: 'previous' }),
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
    const result = await refreshVerifiedEntitlementStatus();
    expect(result.misconfigured).toBe(true);
    expect(settleLicenseRefresh(result).clear).toBe(false);
  });

  it('verifies the current key and an overlapping previous key', async () => {
    const previous = ed25519.keygen();
    vi.stubEnv('VITE_ENTITLEMENT_PUBLIC_KEY_ID', 'current');
    vi.stubEnv('VITE_ENTITLEMENT_ADDITIONAL_PUBLIC_KEYS', JSON.stringify({
      previous: bytesToBase64(previous.publicKey),
    }));
    const { getEntitlement, hasProFeatures, PLAN_IDS } = await loadEntitlement();

    storeEntitlement({
      plan: 'firm',
      serverVerified: true,
      entitlementToken: tokenFor({
        kid: 'previous',
        signingKey: previous.secretKey,
        licenseId: 'lic_prev',
      }),
    });
    expect(getEntitlement().plan).toBe(PLAN_IDS.PRO);
    expect(hasProFeatures()).toBe(true);

    localStorage.removeItem('exhibitkit_entitlement_v1');
    storeEntitlement({
      plan: 'firm',
      serverVerified: true,
      entitlementToken: tokenFor({ kid: 'current', licenseId: 'lic_current' }),
    });
    expect(getEntitlement().plan).toBe(PLAN_IDS.PRO);
    expect(verifyEntitlementToken(tokenFor({ kid: 'current' }))?.kid).toBe('current');
  });

  it('does not grant paid access when the workstation claim does not match', async () => {
    const activationToken = 'f'.repeat(43);
    storeEntitlement({
      plan: 'pro_perpetual',
      serverVerified: true,
      activationToken,
      entitlementToken: tokenFor({
        workstationId: 'EKIT-WORKSTATION-OTHERDEVICE01',
        licenseId: 'lic_other_ws',
      }),
    });

    const {
      getEntitlement,
      hasProFeatures,
      refreshVerifiedEntitlementStatus,
      settleLicenseRefresh,
      PLAN_IDS,
    } = await loadEntitlement();
    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
    expect(getEntitlement().configurationStatus).toBeUndefined();
    expect(hasProFeatures()).toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      active: true,
      entitlement: {
        plan: 'pro_perpetual',
        activationToken,
        entitlementToken: tokenFor({ workstationId: 'EKIT-WORKSTATION-OTHERDEVICE01' }),
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
    const result = await refreshVerifiedEntitlementStatus();
    expect(result.misconfigured).toBeUndefined();
    expect(result.invalid).toBe(false);
    expect(settleLicenseRefresh(result).clear).toBe(false);
    expect(JSON.parse(localStorage.getItem('exhibitkit_entitlement_v1')).activationToken).toBe(activationToken);
  });

  it('applies a signature-valid token for this workstation', async () => {
    const activationToken = 'h'.repeat(43);
    storeEntitlement({
      plan: 'free',
      activationToken,
      entitlementToken: null,
    });
    const { refreshVerifiedEntitlementStatus, hasProFeatures, settleLicenseRefresh } = await loadEntitlement();
    const entitlementToken = tokenFor({ licenseId: 'lic_refresh_ok' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      active: true,
      entitlement: {
        plan: 'pro_perpetual',
        activationToken,
        entitlementToken,
        serverVerified: true,
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
    const result = await refreshVerifiedEntitlementStatus();
    expect(result.ok).toBe(true);
    expect(settleLicenseRefresh(result).clear).toBe(false);
    expect(hasProFeatures()).toBe(true);
    expect(JSON.parse(localStorage.getItem('exhibitkit_entitlement_v1')).entitlementToken).toBe(entitlementToken);
  });

  it('clears only when the license service rejects the seat', async () => {
    storeEntitlement({
      plan: 'pro_perpetual',
      serverVerified: true,
      activationToken: 'g'.repeat(43),
      entitlementToken: tokenFor(),
    });
    const { refreshVerifiedEntitlementStatus, settleLicenseRefresh } = await loadEntitlement();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      active: false,
    }), { status: 401, headers: { 'content-type': 'application/json' } })));
    const result = await refreshVerifiedEntitlementStatus();
    expect(result.invalid).toBe(true);
    expect(settleLicenseRefresh(result).clear).toBe(true);
  });

  it.each([
    ['403', 403, { ok: false, error: 'origin denied' }],
    ['429', 429, { ok: false, error: 'slow down' }],
    ['5xx', 503, { ok: false }],
    ['200 without a token', 200, { ok: true, active: true, entitlement: { plan: 'pro_perpetual' } }],
  ])('keeps the activation and the grace window on %s', async (_label, status, body) => {
    const activationToken = 'n'.repeat(43);
    storeEntitlement({
      plan: 'pro_perpetual',
      serverVerified: true,
      activationToken,
      entitlementToken: tokenFor({ licenseId: `lic_transient_${status}` }),
    });
    const {
      refreshVerifiedEntitlementStatus,
      settleLicenseRefresh,
      hasProFeatures,
    } = await loadEntitlement();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })));
    const result = await refreshVerifiedEntitlementStatus();
    expect(result.invalid).not.toBe(true);
    expect(result.offline).toBe(true);
    expect(settleLicenseRefresh(result).clear).toBe(false);
    expect(hasProFeatures()).toBe(true);
    expect(JSON.parse(localStorage.getItem('exhibitkit_entitlement_v1')).activationToken).toBe(activationToken);
  });
});

describe('production public key configuration', () => {
  it('rejects a missing or short public key and accepts 32 bytes', () => {
    expect(() => assertEntitlementPublicKeyConfig({})).toThrow(/32 bytes/);
    expect(() => assertEntitlementPublicKeyConfig({
      VITE_ENTITLEMENT_PUBLIC_KEY: bytesToBase64(new Uint8Array(16)),
    })).toThrow(/32 bytes/);
    expect(() => assertEntitlementPublicKeyConfig({
      VITE_ENTITLEMENT_PUBLIC_KEY: publicKeyB64,
    })).not.toThrow();
    expect(() => assertEntitlementPublicKeyConfig({
      VITE_ENTITLEMENT_PUBLIC_KEY: publicKeyB64,
      VITE_ENTITLEMENT_ADDITIONAL_PUBLIC_KEYS: JSON.stringify({ previous: bytesToBase64(new Uint8Array(8)) }),
    })).toThrow(/32-byte/);
  });
});
