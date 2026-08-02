import { describe, expect, it } from 'vitest';
import {
  COMPARISON_FEATURES,
  PERPETUAL_CLARIFICATION,
  PRICING,
  PRICING_FAQ,
  PRIVACY_PAYMENT_NOTICE,
} from './pricing';

describe('pricing catalog', () => {
  it('uses Free $0, Case Pass $39, Pro $149 perpetual terminology', () => {
    expect(PRICING.free.price).toBe(0);
    expect(PRICING.case_pass.price).toBe(39);
    expect(PRICING.pro.price).toBe(149);
    expect(PRICING.pro.label).toBe('Perpetual license');
    expect(PRICING.pro.popular).toBe(true);
    expect(PRICING.firm.comingSoon).toBe(true);
  });

  it('does not use lifetime license terminology', () => {
    const blob = JSON.stringify(PRICING) + PERPETUAL_CLARIFICATION;
    expect(blob.toLowerCase()).not.toContain('lifetime');
    expect(PERPETUAL_CLARIFICATION.toLowerCase()).toContain('permanently');
  });

  it('includes required FAQ topics', () => {
    const text = PRICING_FAQ.map((f) => `${f.q} ${f.a}`).join(' ').toLowerCase();
    expect(text).toContain('perpetual');
    expect(text).toContain('case pass');
    expect(text).toContain('upload');
    expect(text).toContain('admissibility');
    expect(text).toContain('sha-256');
    expect(text).toContain('does not prove who authored');
  });

  it('keeps privacy payment notice near paid CTAs', () => {
    expect(PRIVACY_PAYMENT_NOTICE).toContain('Payment is processed separately');
    expect(PRIVACY_PAYMENT_NOTICE.toLowerCase()).toContain('evidence never');
  });

  it('marks local-only AI as coming soon for paid tiers', () => {
    const ai = COMPARISON_FEATURES.find((f) => f.id === 'local_ai');
    expect(ai.case_pass).toBe('coming_soon');
    expect(ai.pro).toBe('coming_soon');
  });
});
