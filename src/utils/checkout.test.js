import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
