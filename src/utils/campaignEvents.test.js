import { describe, expect, it, vi } from 'vitest';
import {
  proPurchaseReturnId,
  recordFreeTierStart,
  recordProCheckoutStarted,
  recordProPurchaseCompleted,
} from './campaignEvents.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

const env = {
  VITE_LINKEDIN_PARTNER_ID: '1234567',
  VITE_LINKEDIN_CONVERSION_FREE_START: '111',
  VITE_LINKEDIN_CONVERSION_PRO_CHECKOUT: '222',
  VITE_LINKEDIN_CONVERSION_PRO_PURCHASE: '333',
};

describe('campaign conversion events', () => {
  it('records the first free-tier start once and skips paid use', () => {
    window.lintrk = vi.fn();
    const storage = memoryStorage();

    expect(recordFreeTierStart({ paid: true, storage, env })).toBe(false);
    expect(recordFreeTierStart({ storage, env })).toBe(true);
    expect(recordFreeTierStart({ storage, env })).toBe(false);
    expect(window.lintrk).toHaveBeenCalledTimes(1);
    expect(window.lintrk).toHaveBeenCalledWith('track', { conversion_id: 111 });
  });

  it('keeps the free-start marker unset until a conversion is sent', () => {
    window.lintrk = vi.fn();
    const storage = memoryStorage();
    const unset = { VITE_LINKEDIN_PARTNER_ID: '1234567' };

    expect(recordFreeTierStart({ storage, env: unset })).toBe(false);
    expect(recordFreeTierStart({ storage, env })).toBe(true);
    expect(recordFreeTierStart({ storage, env })).toBe(false);
    expect(window.lintrk).toHaveBeenCalledTimes(1);
  });

  it('records checkout start and one purchase per return session', () => {
    window.lintrk = vi.fn();
    const storage = memoryStorage();

    expect(recordProCheckoutStarted(env)).toBe(true);
    expect(proPurchaseReturnId('?stripe_status=success&ek_conversion=pro_purchase&session_id=cs_test_123')).toBe('cs_test_123');
    expect(proPurchaseReturnId('?stripe_status=cancel')).toBeNull();
    expect(recordProPurchaseCompleted('cs_test_123', storage, env)).toBe(true);
    expect(recordProPurchaseCompleted('cs_test_123', storage, env)).toBe(false);
    expect(window.lintrk.mock.calls).toEqual([
      ['track', { conversion_id: 222 }],
      ['track', { conversion_id: 333 }],
    ]);
  });

  it('does not keep a purchase marker when the conversion is not sent', () => {
    window.lintrk = vi.fn();
    const storage = memoryStorage();

    expect(recordProPurchaseCompleted('cs_test_123', storage, { VITE_LINKEDIN_PARTNER_ID: '1234567' })).toBe(false);
    expect(recordProPurchaseCompleted('cs_test_123', storage, env)).toBe(true);
    expect(window.lintrk).toHaveBeenCalledTimes(1);
    expect(window.lintrk).toHaveBeenCalledWith('track', { conversion_id: 333 });
  });
});
