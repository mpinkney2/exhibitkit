import { expect, test } from 'vitest';
import { buildStripePaymentLink, PRO_PRICE_LABEL, PRO_PRICE_USD } from '../src/utils/payment.js';

test('Pro pricing has one application-wide source of truth', () => {
  expect(PRO_PRICE_USD).toBe(149);
  expect(PRO_PRICE_LABEL).toBe('$149');
});

test('buildStripePaymentLink tags checkout for reconciliation', () => {
  const result = buildStripePaymentLink({
    paymentLink: 'https://buy.stripe.com/test_link',
    workstationId: 'EKIT-WORKSTATION-1234'
  });
  const url = new URL(result);

  expect(url.origin).toBe('https://buy.stripe.com');
  expect(url.searchParams.get('client_reference_id')).toBe('EKIT-WORKSTATION-1234');
  expect(url.searchParams.get('utm_source')).toBe('exhibitkit');
  expect(url.searchParams.get('utm_medium')).toBe('app');
  expect(url.searchParams.get('utm_campaign')).toBe('pro_perpetual_license');
});

test('the bundled checkout fallback uses the live $149 Payment Link', () => {
  const url = new URL(buildStripePaymentLink());

  expect(`${url.origin}${url.pathname}`).toBe(
    'https://buy.stripe.com/dRm4gze2Ob4c4NF3mKg7e01'
  );
});

test('buildStripePaymentLink sanitizes the client reference', () => {
  const result = buildStripePaymentLink({
    paymentLink: 'https://pay.example.com/license',
    workstationId: ' workstation / secret? '
  });

  expect(new URL(result).searchParams.get('client_reference_id')).toBe('workstationsecret');
});

test('buildStripePaymentLink rejects unsafe URLs', () => {
  expect(buildStripePaymentLink({ paymentLink: 'http://buy.stripe.com/test' })).toBeNull();
  expect(buildStripePaymentLink({ paymentLink: 'https://user:pass@example.com' })).toBeNull();
  expect(buildStripePaymentLink({ paymentLink: 'not-a-url' })).toBeNull();
});
