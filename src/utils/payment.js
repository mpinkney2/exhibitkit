import { ATTRIBUTION_KEYS, campaignParamsForCheckout, readCheckoutAttribution } from './attribution.js';

const DEFAULT_STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/dRm4gze2Ob4c4NF3mKg7e01';

export const PRO_PRICE_USD = 149;
export const PRO_PRICE_LABEL = `$${PRO_PRICE_USD}`;

const CHECKOUT_UTM_DEFAULTS = Object.freeze({
  utm_source: 'exhibitkit',
  utm_medium: 'app',
  utm_campaign: 'pro_perpetual_license',
});

export function sanitizeClientReference(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 200);
}

/**
 * Visitor campaign parameters win per key. Parameters already on the Payment
 * Link are kept when the visitor did not supply that key. The app defaults are
 * used only when the visitor has no campaign parameters, so a real campaign is
 * not mixed with those tags. client_reference_id stays the workstation id.
 */
function applyCheckoutCampaignParams(url, attribution) {
  const campaign = campaignParamsForCheckout(attribution);
  const visitorHasCampaign = Object.keys(campaign).length > 0;
  for (const key of ATTRIBUTION_KEYS) {
    if (campaign[key]) {
      url.searchParams.set(key, campaign[key]);
      continue;
    }
    if (url.searchParams.has(key)) continue;
    if (!visitorHasCampaign && CHECKOUT_UTM_DEFAULTS[key]) {
      url.searchParams.set(key, CHECKOUT_UTM_DEFAULTS[key]);
    }
  }
}

export function buildStripePaymentLink({
  paymentLink = import.meta.env?.VITE_STRIPE_PAYMENT_LINK || DEFAULT_STRIPE_PAYMENT_LINK,
  workstationId = '',
  attribution,
} = {}) {
  try {
    const url = new URL(paymentLink);
    if (url.protocol !== 'https:' || url.username || url.password) return null;

    const clientReferenceId = sanitizeClientReference(workstationId);
    if (clientReferenceId) {
      url.searchParams.set('client_reference_id', clientReferenceId);
    }

    applyCheckoutCampaignParams(
      url,
      attribution === undefined ? readCheckoutAttribution() : attribution,
    );
    return url.toString();
  } catch {
    return null;
  }
}

export function isUsingDefaultPaymentLink() {
  return !import.meta.env?.VITE_STRIPE_PAYMENT_LINK;
}
