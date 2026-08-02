import { describe, it, expect, beforeEach } from 'vitest';
import {
  migrateLegacyLicenseIfNeeded,
  getEntitlement,
  hasProFeatures,
  isCasePassActive,
  isWithinFreeFileLimit,
  getMaxRealFilesPerBatch,
  restoreFromLicenseKey,
  applyCasePassForTesting,
  applyEntitlementRecord,
  clearEntitlement,
  FREE_MAX_FILES_PER_BATCH,
  PLAN_IDS,
  areUpdatesIncluded,
} from './entitlement.js';
import { activateLicense } from './license.js';

beforeEach(() => {
  localStorage.clear();
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
    const ent = applyEntitlementRecord({
      plan: PLAN_IDS.PRO,
      licenseKey: 'EKIT-TEST-AAAA-BBBB',
      purchasedAt,
      updatesIncludedUntil,
      updateRenewalStatus: 'lapsed',
      purchasedVersion: 'v0.9.3',
    });

    expect(areUpdatesIncluded(ent)).toBe(false);
    expect(hasProFeatures(ent)).toBe(true);
    expect(ent.plan).toBe(PLAN_IDS.PRO);
  });

  it('restores Pro via license key', () => {
    const result = restoreFromLicenseKey('ekit-abcd-efgh-ijkl');
    expect(result.ok).toBe(true);
    expect(result.entitlement.plan).toBe(PLAN_IDS.PRO);
    expect(hasProFeatures(result.entitlement)).toBe(true);
  });
});

describe('legacy license migration', () => {
  it('maps a valid old paid license to pro_perpetual', () => {
    activateLicense('EKIT-LEG1-ACY2-KEY3', 'lifetime');
    localStorage.removeItem('exhibitkit_entitlement_v1');
    localStorage.removeItem('exhibitkit_entitlement_migrated_v1');

    const ent = migrateLegacyLicenseIfNeeded();
    expect(ent.plan).toBe(PLAN_IDS.PRO);
    expect(ent.migratedFromLegacy).toBe(true);
    expect(ent.licenseKey).toBe('EKIT-LEG1-ACY2-KEY3');
    expect(hasProFeatures(ent)).toBe(true);
  });

  it('does not invent Pro access when no legacy license exists', () => {
    const ent = migrateLegacyLicenseIfNeeded();
    expect(ent.plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures(ent)).toBe(false);
  });
});

describe('clearEntitlement', () => {
  it('returns the workstation to Free', () => {
    restoreFromLicenseKey('EKIT-ZZZZ-YYYY-XXXX');
    clearEntitlement();
    const ent = getEntitlement();
    expect(ent.plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures(ent)).toBe(false);
  });
});
