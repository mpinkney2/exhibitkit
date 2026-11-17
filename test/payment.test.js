import { beforeEach, expect, test } from 'vitest';
import { captureLandingAttribution } from '../src/utils/attribution.js';
import { buildStripePaymentLink, PRO_PRICE_LABEL, PRO_PRICE_USD } from '../src/utils/payment.js';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

test('Pro pricing has one application-wide source of truth', () => {
  expect(PRO_PRICE_USD).toBe(149);
  expect(PRO_PRICE_LABEL).toBe('$149');
});

test('buildStripePaymentLink tags checkout for reconciliation', () => {
  const result = buildStripePaymentLink({
    paymentLink: 'https://buy.stripe.com/test_link',
    workstationId: 'EKIT-WORKSTATION-1234',
    attribution: {},
  });
  const url = new URL(result);

  expect(url.origin).toBe('https://buy.stripe.com');
  expect(url.searchParams.get('client_reference_id')).toBe('EKIT-WORKSTATION-1234');
  expect(url.searchParams.get('utm_source')).toBe('exhibitkit');
  expect(url.searchParams.get('utm_medium')).toBe('app');
  expect(url.searchParams.get('utm_campaign')).toBe('pro_perpetual_license');
});

test('buildStripePaymentLink keeps visitor UTMs and the workstation reference', () => {
  const result = buildStripePaymentLink({
    paymentLink: 'https://buy.stripe.com/test_link?utm_campaign=link_default',
    workstationId: 'EKIT-WORKSTATION-1234',
    attribution: {
      utm_source: 'linkedin',
      utm_medium: 'cpc',
      utm_content: 'ad/variant',
      utm_term: 'trial exhibits',
      li_fat_id: 'fat 123',
      filename: 'PX001 Contract.pdf',
      caseName: 'Doe v. Roe',
    },
  });
  const url = new URL(result);

  expect(url.searchParams.get('client_reference_id')).toBe('EKIT-WORKSTATION-1234');
  expect(url.searchParams.get('utm_source')).toBe('linkedin');
  expect(url.searchParams.get('utm_medium')).toBe('cpc');
  expect(url.searchParams.get('utm_campaign')).toBe('link_default');
  expect(url.searchParams.get('utm_content')).toBe('advariant');
  expect(url.searchParams.get('utm_term')).toBe('trialexhibits');
  expect(url.searchParams.get('li_fat_id')).toBe('fat123');
  expect(url.searchParams.get('filename')).toBeNull();
  expect(result).not.toContain('PX001');
  expect(result).not.toContain('Doe');
});

test('buildStripePaymentLink uses stored last-touch parameters', () => {
  captureLandingAttribution('?utm_source=linkedin&utm_medium=paid&utm_campaign=spring&li_fat_id=storedFat');
  const url = new URL(buildStripePaymentLink({
    paymentLink: 'https://buy.stripe.com/test_link',
    workstationId: 'EKIT-WORKSTATION-1234',
  }));

  expect(url.searchParams.get('utm_source')).toBe('linkedin');
  expect(url.searchParams.get('utm_medium')).toBe('paid');
  expect(url.searchParams.get('utm_campaign')).toBe('spring');
  expect(url.searchParams.get('li_fat_id')).toBe('storedFat');
  expect(url.searchParams.get('utm_source')).not.toBe('exhibitkit');
});

test('a partial visitor campaign is not filled with the app default tags', () => {
  const url = new URL(buildStripePaymentLink({
    paymentLink: 'https://buy.stripe.com/test_link',
    attribution: { utm_source: 'linkedin' },
  }));

  expect(url.searchParams.get('utm_source')).toBe('linkedin');
  expect(url.searchParams.get('utm_medium')).toBeNull();
  expect(url.searchParams.get('utm_campaign')).toBeNull();
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
