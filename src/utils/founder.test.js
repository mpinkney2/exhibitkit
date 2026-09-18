import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('founder admin access', () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('offers entry from ?founder=1 or #founder', async () => {
    const { shouldOfferFounderEntry } = await import('./founder.js');
    expect(shouldOfferFounderEntry('?founder=1', '')).toBe(true);
    expect(shouldOfferFounderEntry('?founder=true', '')).toBe(true);
    expect(shouldOfferFounderEntry('', '#founder')).toBe(true);
    expect(shouldOfferFounderEntry('', '')).toBe(false);
  });

  it('unlocks with the configured secret and persists session in DEV', async () => {
    vi.stubEnv('VITE_FOUNDER_ADMIN_SECRET', 'test-founder-secret');
    const { unlockFounder, isFounderUnlocked, lockFounder, getFounderSecret } = await import('./founder.js');

    expect(getFounderSecret()).toBe('test-founder-secret');
    expect((await unlockFounder('wrong')).ok).toBe(false);
    expect(isFounderUnlocked()).toBe(false);

    expect((await unlockFounder('test-founder-secret')).ok).toBe(true);
    expect(isFounderUnlocked()).toBe(true);

    lockFounder();
    expect(isFounderUnlocked()).toBe(false);
  });

  it('always resolves a usable founder secret in DEV', async () => {
    vi.stubEnv('VITE_FOUNDER_ADMIN_SECRET', '');
    const { DEFAULT_FOUNDER_SECRET, getFounderSecret, unlockFounder, isFounderAdminConfigured } = await import('./founder.js');
    expect(isFounderAdminConfigured()).toBe(true);
    expect(getFounderSecret()).toBe(DEFAULT_FOUNDER_SECRET);
    expect((await unlockFounder(DEFAULT_FOUNDER_SECRET)).ok).toBe(true);
  });

  it('uses DEV default secret when env is unset', async () => {
    vi.stubEnv('VITE_FOUNDER_ADMIN_SECRET', '');
    const { DEFAULT_FOUNDER_SECRET, getFounderSecret, unlockFounder } = await import('./founder.js');
    expect(getFounderSecret()).toBe(DEFAULT_FOUNDER_SECRET);
    expect((await unlockFounder(DEFAULT_FOUNDER_SECRET)).ok).toBe(true);
  });

  it('does not expose a client secret in production and unlocks via API', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('PROD', true);
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_FOUNDER_ADMIN_SECRET', 'should-be-ignored-in-prod');

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const {
      getFounderSecret,
      unlockFounder,
      isFounderUnlocked,
      DEFAULT_FOUNDER_SECRET,
    } = await import('./founder.js');

    expect(getFounderSecret()).toBe('');
    expect((await unlockFounder(DEFAULT_FOUNDER_SECRET)).ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/founder/unlock',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ secret: DEFAULT_FOUNDER_SECRET }),
      }),
    );
    expect(isFounderUnlocked()).toBe(true);
  });

  it('surfaces API denial in production', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('PROD', true);
    vi.stubEnv('MODE', 'production');

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      json: async () => ({ ok: false, error: 'Incorrect founder secret.' }),
    })));

    const { unlockFounder, isFounderUnlocked } = await import('./founder.js');
    const result = await unlockFounder('nope');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Incorrect founder secret/);
    expect(isFounderUnlocked()).toBe(false);
  });

  it('grants Pro features from founder override only while founder is unlocked in production', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('PROD', true);
    vi.stubEnv('MODE', 'production');
    localStorage.clear();
    sessionStorage.clear();

    const { FOUNDER_SESSION_KEY } = await import('./founder.js');
    const {
      applyFounderUnlimitedPro,
      hasProFeatures,
      refreshVerifiedEntitlementStatus,
    } = await import('./entitlement.js');

    applyFounderUnlimitedPro();
    expect(hasProFeatures()).toBe(false);

    sessionStorage.setItem(FOUNDER_SESSION_KEY, 'true');
    expect(hasProFeatures()).toBe(true);

    const refresh = await refreshVerifiedEntitlementStatus();
    expect(refresh.ok).toBe(true);
    expect(refresh.invalid).toBeFalsy();
    expect(hasProFeatures()).toBe(true);

    sessionStorage.removeItem(FOUNDER_SESSION_KEY);
    expect(hasProFeatures()).toBe(false);
  });
});

describe('beta tester invitations', () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('requires a tester email before calling the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { inviteBetaTester } = await import('./founder.js');

    const result = await inviteBetaTester({ email: '   ' });
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to the invite API with the DEV founder secret', async () => {
    vi.stubEnv('VITE_FOUNDER_ADMIN_SECRET', 'test-founder-secret');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        key: 'EKIT-BETA-TEST-0001',
        fingerprint: '••••-0001',
        email: 'tester@example.com',
        expiresAt: '2026-10-18T00:00:00.000Z',
        days: 30,
        emailStatus: 'sent',
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { inviteBetaTester } = await import('./founder.js');
    const result = await inviteBetaTester({ email: 'tester@example.com', days: 30 });

    expect(result.ok).toBe(true);
    expect(result.key).toBe('EKIT-BETA-TEST-0001');
    expect(result.emailStatus).toBe('sent');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/founder/invite',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ secret: 'test-founder-secret', email: 'tester@example.com', days: 30 });
  });

  it('reuses the unlock secret for invites in production', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('PROD', true);
    vi.stubEnv('MODE', 'production');

    const fetchMock = vi.fn(async (url) => ({
      ok: true,
      json: async () => (url === '/api/founder/unlock'
        ? { ok: true }
        : { ok: true, key: 'EKIT-BETA-PROD-0002', fingerprint: '••••-0002', email: 't@example.com', expiresAt: '2026-10-18T00:00:00.000Z', days: 30, emailStatus: 'sent' }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { unlockFounder, inviteBetaTester } = await import('./founder.js');
    expect((await unlockFounder('super-secret-123456')).ok).toBe(true);

    const result = await inviteBetaTester({ email: 't@example.com' });
    expect(result.ok).toBe(true);
    const inviteCall = fetchMock.mock.calls.find(([url]) => url === '/api/founder/invite');
    expect(inviteCall).toBeTruthy();
    const body = JSON.parse(inviteCall[1].body);
    expect(body.secret).toBe('super-secret-123456');
  });

  it('flags that a secret is required when none is available in production', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('PROD', true);
    vi.stubEnv('MODE', 'production');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { inviteBetaTester } = await import('./founder.js');
    const result = await inviteBetaTester({ email: 'tester@example.com' });

    expect(result.ok).toBe(false);
    expect(result.needsSecret).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
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
