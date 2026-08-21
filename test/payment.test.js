import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStripePaymentLink, PRO_PRICE_LABEL, PRO_PRICE_USD } from '../src/utils/payment.js';

test('Pro pricing has one application-wide source of truth', () => {
  assert.equal(PRO_PRICE_USD, 149);
  assert.equal(PRO_PRICE_LABEL, '$149');
});

test('buildStripePaymentLink tags checkout for reconciliation', () => {
  const result = buildStripePaymentLink({
    paymentLink: 'https://buy.stripe.com/test_link',
    workstationId: 'EKIT-WORKSTATION-1234'
  });
  const url = new URL(result);

  assert.equal(url.origin, 'https://buy.stripe.com');
  assert.equal(url.searchParams.get('client_reference_id'), 'EKIT-WORKSTATION-1234');
  assert.equal(url.searchParams.get('utm_source'), 'exhibitkit');
  assert.equal(url.searchParams.get('utm_medium'), 'app');
  assert.equal(url.searchParams.get('utm_campaign'), 'pro_perpetual_license');
});

test('buildStripePaymentLink sanitizes the client reference', () => {
  const result = buildStripePaymentLink({
    paymentLink: 'https://pay.example.com/license',
    workstationId: ' workstation / secret? '
  });

  assert.equal(new URL(result).searchParams.get('client_reference_id'), 'workstationsecret');
});

test('buildStripePaymentLink rejects unsafe URLs', () => {
  assert.equal(buildStripePaymentLink({ paymentLink: 'http://buy.stripe.com/test' }), null);
  assert.equal(buildStripePaymentLink({ paymentLink: 'https://user:pass@example.com' }), null);
  assert.equal(buildStripePaymentLink({ paymentLink: 'not-a-url' }), null);
});
