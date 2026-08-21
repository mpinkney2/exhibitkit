import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('founder admin access', () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('offers entry from ?founder=1 or #founder', async () => {
    const { shouldOfferFounderEntry } = await import('./founder.js');
    expect(shouldOfferFounderEntry('?founder=1', '')).toBe(true);
    expect(shouldOfferFounderEntry('?founder=true', '')).toBe(true);
    expect(shouldOfferFounderEntry('', '#founder')).toBe(true);
    expect(shouldOfferFounderEntry('', '')).toBe(false);
  });

  it('unlocks with the configured secret and persists session', async () => {
    vi.stubEnv('VITE_FOUNDER_ADMIN_SECRET', 'test-founder-secret');
    const { unlockFounder, isFounderUnlocked, lockFounder, getFounderSecret } = await import('./founder.js');

    expect(getFounderSecret()).toBe('test-founder-secret');
    expect(unlockFounder('wrong').ok).toBe(false);
    expect(isFounderUnlocked()).toBe(false);

    expect(unlockFounder('test-founder-secret').ok).toBe(true);
    expect(isFounderUnlocked()).toBe(true);

    lockFounder();
    expect(isFounderUnlocked()).toBe(false);
  });

  it('always resolves a usable founder secret', async () => {
    vi.stubEnv('VITE_FOUNDER_ADMIN_SECRET', '');
    const { DEFAULT_FOUNDER_SECRET, getFounderSecret, unlockFounder, isFounderAdminConfigured } = await import('./founder.js');
    expect(isFounderAdminConfigured()).toBe(true);
    expect(getFounderSecret()).toBe(DEFAULT_FOUNDER_SECRET);
    expect(unlockFounder(DEFAULT_FOUNDER_SECRET).ok).toBe(true);
  });

  it('uses DEV default secret when env is unset', async () => {
    vi.stubEnv('VITE_FOUNDER_ADMIN_SECRET', '');
    const { DEFAULT_FOUNDER_SECRET, getFounderSecret, unlockFounder } = await import('./founder.js');
    expect(getFounderSecret()).toBe(DEFAULT_FOUNDER_SECRET);
    expect(unlockFounder(DEFAULT_FOUNDER_SECRET).ok).toBe(true);
  });
});

describe('founder entitlement stage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('can apply Free, Case Pass variants, and Pro variants', async () => {
    const {
      clearEntitlement,
      getEntitlement,
      applyCasePassForTesting,
      applyExpiredCasePassForTesting,
      applyPendingCasePassForTesting,
      applyProForTesting,
      hasProFeatures,
      isCasePassActive,
      areUpdatesIncluded,
      PLAN_IDS,
    } = await import('./entitlement.js');

    clearEntitlement();
    expect(getEntitlement().plan).toBe(PLAN_IDS.FREE);
    expect(hasProFeatures()).toBe(false);

    applyCasePassForTesting();
    expect(isCasePassActive()).toBe(true);
    expect(hasProFeatures()).toBe(true);

    applyExpiredCasePassForTesting();
    expect(isCasePassActive()).toBe(false);
    expect(hasProFeatures()).toBe(false);

    applyPendingCasePassForTesting();
    expect(getEntitlement().casePassStatus).toBe('payment_pending');
    expect(hasProFeatures()).toBe(false);

    applyProForTesting();
    expect(getEntitlement().plan).toBe(PLAN_IDS.PRO);
    expect(hasProFeatures()).toBe(true);
    expect(areUpdatesIncluded()).toBe(true);

    applyProForTesting({ updatesLapsed: true });
    expect(hasProFeatures()).toBe(true);
    expect(areUpdatesIncluded()).toBe(false);
  });
});
