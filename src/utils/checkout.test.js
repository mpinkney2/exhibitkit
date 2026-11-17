import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLAN_IDS } from '../config/pricing.js';

describe('checkout configuration gating', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('disables paid CTAs when checkout is not configured', async () => {
    vi.stubEnv('VITE_CHECKOUT_API_URL', '');
    vi.stubEnv('VITE_ENTITLEMENT_API_URL', '');
    vi.stubEnv('VITE_STRIPE_PRICE_CASE_PASS', '');
    vi.stubEnv('VITE_STRIPE_PRICE_PRO', '');

    const { getCheckoutConfig, canPurchasePlan, getPlanCta } = await import('./checkout.js');
    const config = getCheckoutConfig();

    expect(config.checkoutConfigured).toBe(false);
    expect(canPurchasePlan(PLAN_IDS.CASE_PASS, config)).toBe(false);
    expect(canPurchasePlan(PLAN_IDS.PRO, config)).toBe(false);
    expect(canPurchasePlan(PLAN_IDS.FIRM, config)).toBe(false);

    expect(getPlanCta(PLAN_IDS.CASE_PASS, config).kind).toBe('disabled');
    expect(getPlanCta(PLAN_IDS.PRO, config).kind).toBe('disabled');
    expect(getPlanCta(PLAN_IDS.FIRM, config).kind).toBe('contact');
    expect(getPlanCta(PLAN_IDS.FREE, config).kind).toBe('launch_free');
  });

  it('never exposes a Firm purchase action', async () => {
    vi.stubEnv('VITE_CHECKOUT_API_URL', 'https://example.com/api');
    vi.stubEnv('VITE_ENTITLEMENT_API_URL', 'https://example.com/entitlements');
    vi.stubEnv('VITE_STRIPE_PRICE_CASE_PASS', 'price_case');
    vi.stubEnv('VITE_STRIPE_PRICE_PRO', 'price_pro');

    const { getCheckoutConfig, canPurchasePlan, getPlanCta } = await import('./checkout.js');
    const config = getCheckoutConfig();

    expect(config.firmCheckoutEnabled).toBe(false);
    expect(canPurchasePlan(PLAN_IDS.FIRM, config)).toBe(false);
    expect(getPlanCta(PLAN_IDS.FIRM, config).kind).toBe('contact');
    expect(getPlanCta(PLAN_IDS.FIRM, config).href).toMatch(/^mailto:/);
  });

  it('enables Case Pass and Pro checkout only when API and price IDs exist', async () => {
    vi.stubEnv('VITE_CHECKOUT_API_URL', 'https://example.com/api');
    vi.stubEnv('VITE_ENTITLEMENT_API_URL', 'https://example.com/entitlements');
    vi.stubEnv('VITE_STRIPE_PRICE_CASE_PASS', 'price_case');
    vi.stubEnv('VITE_STRIPE_PRICE_PRO', 'price_pro');

    const { getCheckoutConfig, canPurchasePlan, getPlanCta } = await import('./checkout.js');
    const config = getCheckoutConfig();

    expect(config.checkoutConfigured).toBe(true);
    expect(canPurchasePlan(PLAN_IDS.CASE_PASS, config)).toBe(true);
    expect(canPurchasePlan(PLAN_IDS.PRO, config)).toBe(true);
    expect(getPlanCta(PLAN_IDS.CASE_PASS, config).kind).toBe('checkout');
    expect(getPlanCta(PLAN_IDS.PRO, config).kind).toBe('checkout');
  });
});

describe('checkout session attribution', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('puts campaign parameters on the session and marks the success return', async () => {
    const { buildCheckoutSessionRequest } = await import('./checkout.js');
    const body = buildCheckoutSessionRequest(PLAN_IDS.PRO, {
      attribution: {
        utm_source: 'linkedin',
        utm_medium: 'cpc',
        utm_campaign: 'spring',
        utm_content: 'ad-a',
        utm_term: 'exhibits',
        li_fat_id: 'fat_123',
        filename: 'PX001.pdf',
        caseName: 'Doe v. Roe',
      },
      clientReferenceId: 'EKIT-WORKSTATION-ABCDEFGH12345678',
      origin: 'https://exhibitkit.example',
    });

    expect(body).toEqual({
      planId: PLAN_IDS.PRO,
      clientReferenceId: 'EKIT-WORKSTATION-ABCDEFGH12345678',
      metadata: {
        utm_source: 'linkedin',
        utm_medium: 'cpc',
        utm_campaign: 'spring',
        utm_content: 'ad-a',
        utm_term: 'exhibits',
        li_fat_id: 'fat_123',
      },
      successUrl: 'https://exhibitkit.example/?stripe_status=success&ek_conversion=pro_purchase',
      cancelUrl: 'https://exhibitkit.example/?stripe_status=cancel',
    });
    expect(JSON.stringify(body)).not.toContain('PX001');
    expect(JSON.stringify(body)).not.toContain('Doe');
  });

  it('posts that payload when checkout starts', async () => {
    vi.stubEnv('VITE_CHECKOUT_API_URL', 'https://example.com/api');
    vi.stubEnv('VITE_ENTITLEMENT_API_URL', 'https://example.com/entitlements');
    vi.stubEnv('VITE_STRIPE_PRICE_PRO', 'price_pro');
    vi.stubEnv('VITE_LINKEDIN_PARTNER_ID', '');
    vi.resetModules();

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/c/pay/cs_test_session' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {});

    const { startCheckout } = await import('./checkout.js');
    await startCheckout(PLAN_IDS.PRO, undefined, {
      attribution: { utm_source: 'linkedin', utm_campaign: 'spring' },
      clientReferenceId: 'EKIT-WORKSTATION-ABCDEFGH12345678',
      origin: 'https://exhibitkit.example',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.com/api/checkout-session');
    expect(JSON.parse(init.body)).toMatchObject({
      planId: PLAN_IDS.PRO,
      clientReferenceId: 'EKIT-WORKSTATION-ABCDEFGH12345678',
      metadata: { utm_source: 'linkedin', utm_campaign: 'spring' },
      successUrl: 'https://exhibitkit.example/?stripe_status=success&ek_conversion=pro_purchase',
      cancelUrl: 'https://exhibitkit.example/?stripe_status=cancel',
    });
    expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_session');
    assign.mockRestore();
  });
});
