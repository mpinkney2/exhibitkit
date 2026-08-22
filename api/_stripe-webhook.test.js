// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  finishStripeEvent: vi.fn(),
  fulfillCheckoutSession: vi.fn(),
  recordStripeEvent: vi.fn(),
  revokeLicenseByPaymentIntent: vi.fn(),
}));

vi.mock('./_lib/license-repository.js', () => ({
  finishStripeEvent: mocks.finishStripeEvent,
  recordStripeEvent: mocks.recordStripeEvent,
  revokeLicenseByPaymentIntent: mocks.revokeLicenseByPaymentIntent,
}));

vi.mock('./_lib/stripe-fulfillment.js', () => ({
  fulfillCheckoutSession: mocks.fulfillCheckoutSession,
  getStripe: () => ({
    webhooks: {
      constructEvent(rawBody, signature, secret) {
        if (signature !== 'valid-signature' || secret !== 'whsec_test') {
          throw new Error('invalid signature');
        }
        return JSON.parse(rawBody);
      },
    },
  }),
}));

import webhook from './stripe-webhook.js';

function eventRequest(event, signature = 'valid-signature') {
  return new Request('https://example.com/api/stripe-webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature,
    },
    body: JSON.stringify(event),
  });
}

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

describe('Stripe webhook security and routing', () => {
  it('rejects an invalid Stripe signature before doing any fulfillment work', async () => {
    const response = await webhook.fetch(eventRequest({ id: 'evt_bad' }, 'invalid'));
    expect(response.status).toBe(400);
    expect(mocks.recordStripeEvent).not.toHaveBeenCalled();
    expect(mocks.fulfillCheckoutSession).not.toHaveBeenCalled();
  });

  it('fulfills a completed Checkout Session and records completion', async () => {
    const event = {
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_paid' } },
    };
    const response = await webhook.fetch(eventRequest(event));

    expect(response.status).toBe(200);
    expect(mocks.recordStripeEvent).toHaveBeenCalledWith(
      'evt_checkout',
      'checkout.session.completed',
      'cs_paid',
    );
    expect(mocks.fulfillCheckoutSession).toHaveBeenCalledWith('cs_paid');
    expect(mocks.finishStripeEvent).toHaveBeenCalledWith('evt_checkout', 'completed');
  });

  it('revokes a license only for a fully refunded charge', async () => {
    const event = {
      id: 'evt_refund',
      type: 'charge.refunded',
      data: { object: { refunded: true, payment_intent: 'pi_paid' } },
    };
    const response = await webhook.fetch(eventRequest(event));

    expect(response.status).toBe(200);
    expect(mocks.revokeLicenseByPaymentIntent).toHaveBeenCalledWith('pi_paid', 'refunded');
  });

  it('returns a retryable error when fulfillment fails', async () => {
    mocks.fulfillCheckoutSession.mockRejectedValueOnce(new Error('email unavailable'));
    const event = {
      id: 'evt_retry',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_retry' } },
    };
    const response = await webhook.fetch(eventRequest(event));

    expect(response.status).toBe(500);
    expect(mocks.finishStripeEvent).toHaveBeenLastCalledWith(
      'evt_retry',
      'failed',
      'fulfillment_failed',
    );
  });
});
