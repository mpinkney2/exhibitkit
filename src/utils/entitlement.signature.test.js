import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';
import {
  bytesToBase64,
  isEntitlementTokenInForce,
  OFFLINE_GRACE_MS,
  signEntitlementToken,
  signFounderToken,
  verifyEntitlementToken,
} from './entitlementToken.js';

const { secretKey, publicKey } = ed25519.keygen();
const publicKeyB64 = bytesToBase64(publicKey);
const DAY_MS = 24 * 60 * 60 * 1000;

function tokenFor({
  plan = 'pro_perpetual',
  issuedAt = new Date().toISOString(),
  expiry = new Date(Date.now() + 20 * DAY_MS).toISOString(),
  licenseId = 'lic_signed_1',
} = {}) {
  return signEntitlementToken({ plan, expiry, licenseId, issuedAt }, secretKey);
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
    const tamperedSignature = `${signature.slice(0, -1)}${signature.endsWith('A') ? 'B' : 'A'}`;
    storeEntitlement({
      plan: 'pro_perpetual',
      serverVerified: true,
      entitlementToken: `${payload}.${tamperedSignature}`,
      purchasedAt: new Date().toISOString(),
    });

    const { getEntitlement, hasProFeatures, PLAN_IDS } = await loadEntitlement();
    expect(verifyEntitlementToken(`${payload}.${tamperedSignature}`, publicKey)).toBeNull();
    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
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

  it('stays Free when the public key is missing', async () => {
    vi.stubEnv('VITE_ENTITLEMENT_PUBLIC_KEY', '');
    storeEntitlement({
      plan: 'pro_perpetual',
      serverVerified: true,
      entitlementToken: tokenFor(),
    });

    const { getEntitlement, hasProFeatures, PLAN_IDS } = await loadEntitlement();
    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures()).toBe(false);
  });
});
