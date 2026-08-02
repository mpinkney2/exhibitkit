import { beforeEach, describe, expect, it } from 'vitest';
import {
  __setEntitlementForTests,
  activateCasePass,
  activateProPerpetual,
  CASE_PASS_DURATION_DAYS,
  clearEntitlement,
  getEffectiveEntitlement,
  hasActiveUpdateCoverage,
  hasProFeatures,
  TIERS,
} from './entitlements';

beforeEach(() => {
  localStorage.clear();
  clearEntitlement();
});

describe('entitlements', () => {
  it('defaults to free', () => {
    expect(getEffectiveEntitlement().tier).toBe(TIERS.FREE);
    expect(hasProFeatures()).toBe(false);
  });

  it('activates Case Pass for 30 days', () => {
    const purchasedAt = new Date('2026-01-01T00:00:00.000Z');
    const entitlement = activateCasePass('EKIT-CASE-TEST-0001', purchasedAt);
    expect(entitlement.tier).toBe(TIERS.CASE_PASS);
    expect(CASE_PASS_DURATION_DAYS).toBe(30);
    expect(hasProFeatures(new Date('2026-01-15T00:00:00.000Z'))).toBe(true);

    const expired = getEffectiveEntitlement(new Date('2026-02-05T00:00:00.000Z'));
    expect(expired.tier).toBe(TIERS.FREE);
    expect(expired.expiredCasePass).toBe(true);
    expect(hasProFeatures(new Date('2026-02-05T00:00:00.000Z'))).toBe(false);
  });

  it('keeps Pro usable after update period ends', () => {
    const purchasedAt = new Date('2025-01-01T00:00:00.000Z');
    activateProPerpetual('EKIT-AAAA-BBBB-CCCC', purchasedAt);

    const afterUpdates = new Date('2026-06-01T00:00:00.000Z');
    expect(hasProFeatures(afterUpdates)).toBe(true);
    expect(hasActiveUpdateCoverage(afterUpdates)).toBe(false);
    expect(getEffectiveEntitlement(afterUpdates).tier).toBe(TIERS.PRO_PERPETUAL);
  });

  it('Case Pass expiration does not clear stored entitlement history fields', () => {
    activateCasePass('EKIT-CASE-AB12-CD34', new Date('2026-01-01T00:00:00.000Z'));
    const effective = getEffectiveEntitlement(new Date('2026-03-01T00:00:00.000Z'));
    expect(effective.casePassExpiredAt).toBeTruthy();
    expect(effective.key).toBe('EKIT-CASE-AB12-CD34');
  });

  it('supports writing firm-compatible entitlement shape', () => {
    __setEntitlementForTests({
      tier: TIERS.FIRM,
      key: 'EKIT-FIRM-TEST-0001',
      purchasedAt: new Date().toISOString(),
      expiresAt: null,
      updatesUntil: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(hasProFeatures()).toBe(true);
  });
});
