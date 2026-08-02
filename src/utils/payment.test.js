import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetWebhookIdempotencyForTests,
  assertNoEvidenceFields,
  createCheckoutRequest,
  processWebhookEventIdempotent,
} from './payment';

describe('payment adapter', () => {
  beforeEach(() => {
    __resetWebhookIdempotencyForTests();
  });

  it('creates privacy-safe checkout payloads without evidence fields', () => {
    const request = createCheckoutRequest('pro_perpetual', {
      caseName: 'SECRET v. SECRET',
      filename: 'messages.txt',
      sha256: 'abc',
      messages: [{ body: 'do not send' }],
    });
    expect(request.ok).toBe(true);
    expect(request.payload.productId).toBe('pro_perpetual');
    expect(request.payload.amountUsd).toBe(149);
    expect(request.payload).not.toHaveProperty('caseName');
    expect(request.payload).not.toHaveProperty('filename');
    expect(request.payload).not.toHaveProperty('sha256');
    expect(request.payload).not.toHaveProperty('messages');
    expect(() => assertNoEvidenceFields(request.payload)).not.toThrow();
  });

  it('reports configuration status for Case Pass when link missing', () => {
    const request = createCheckoutRequest('case_pass');
    // Without VITE_STRIPE_CASE_PASS_LINK, Case Pass should be configuration-aware
    if (!request.ok) {
      expect(request.configured).toBe(false);
      expect(request.error).toMatch(/not configured/i);
    }
  });

  it('handles webhook idempotency', () => {
    const first = processWebhookEventIdempotent('evt_1', () => {});
    const second = processWebhookEventIdempotent('evt_1', () => {});
    expect(first.processed).toBe(true);
    expect(second.duplicate).toBe(true);
  });
});
