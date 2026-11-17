/**
 * Configuration-aware checkout adapter.
 *
 * This repository is a static Vite SPA with no deployable server functions and
 * no durable entitlement store. Until a backend exists that:
 *   - creates Stripe Checkout Sessions using server-side price IDs
 *   - verifies webhooks idempotently
 *   - stores entitlements durably
 *   - restores access via license key (or verified email) with signed payloads
 * purchase CTAs must remain disabled. Do not simulate checkout or mint licenses client-side.
 *
 * See docs/BILLING_BACKEND.md for the required platform pieces.
 */

import { PLAN_IDS, getPlanById, SUPPORT_EMAIL } from '../config/pricing.js';
import { campaignParamsForCheckout, readCheckoutAttribution } from './attribution.js';
import { recordProCheckoutStarted } from './campaignEvents.js';
import { sanitizeClientReference } from './payment.js';

/**
 * Read Vite env safely (undefined outside Vite).
 */
function env(name) {
  try {
    return import.meta.env?.[name];
  } catch {
    return undefined;
  }
}

/**
 * Checkout is configured only when a server endpoint AND the relevant Stripe
 * price id env are present. Public payment-link-only setups are insufficient
 * for verified entitlements without a webhook + durable store.
 */
export function getCheckoutConfig() {
  const checkoutApiUrl = (env('VITE_CHECKOUT_API_URL') || '').trim();
  const entitlementApiUrl = (env('VITE_ENTITLEMENT_API_URL') || '').trim();
  const casePassPrice = (env('VITE_STRIPE_PRICE_CASE_PASS') || '').trim();
  const proPrice = (env('VITE_STRIPE_PRICE_PRO') || '').trim();

  const hasApi = Boolean(checkoutApiUrl && entitlementApiUrl);
  const casePassReady = hasApi && Boolean(casePassPrice);
  const proReady = hasApi && Boolean(proPrice);

  return {
    checkoutConfigured: casePassReady || proReady,
    casePassCheckoutEnabled: casePassReady,
    proCheckoutEnabled: proReady,
    firmCheckoutEnabled: false,
    renewalCheckoutEnabled: false,
    checkoutApiUrl: checkoutApiUrl || null,
    entitlementApiUrl: entitlementApiUrl || null,
    supportEmail: SUPPORT_EMAIL,
    reason: hasApi
      ? (!casePassPrice && !proPrice
          ? 'Stripe price IDs are not configured.'
          : null)
      : 'Checkout API and entitlement verification are not configured for this deployment.',
  };
}

/**
 * Whether a plan may expose an active purchase action in the UI.
 */
export function canPurchasePlan(planId, config = getCheckoutConfig()) {
  if (planId === PLAN_IDS.FREE) return false; // free uses launch CTA, not purchase
  if (planId === PLAN_IDS.FIRM) return false;
  if (planId === PLAN_IDS.CASE_PASS) return config.casePassCheckoutEnabled;
  if (planId === PLAN_IDS.PRO) return config.proCheckoutEnabled;
  return false;
}

/**
 * CTA presentation for a plan given current checkout configuration.
 * @returns {{ kind: 'launch_free'|'checkout'|'contact'|'disabled', label: string, href?: string|null, disabledReason?: string|null }}
 */
export function getPlanCta(planId, config = getCheckoutConfig()) {
  const plan = getPlanById(planId);
  if (!plan) {
    return { kind: 'disabled', label: 'Unavailable', disabledReason: 'Unknown plan' };
  }

  if (plan.purchaseAction === 'launch_free') {
    return { kind: 'launch_free', label: plan.cta };
  }

  if (plan.purchaseAction === 'contact') {
    return {
      kind: 'contact',
      label: plan.cta,
      href: `mailto:${plan.contactEmail || SUPPORT_EMAIL}?subject=${encodeURIComponent('ExhibitKIT Firm licensing')}`,
    };
  }

  if (!canPurchasePlan(planId, config)) {
    return {
      kind: 'disabled',
      label: plan.cta,
      disabledReason:
        config.reason ||
        'Purchase is unavailable until secure checkout is configured.',
    };
  }

  return {
    kind: 'checkout',
    label: plan.cta,
    // Real session creation happens via checkoutApiUrl when enabled.
    href: null,
  };
}

/**
 * Return URL Stripe should use after Checkout. The success marker is what the
 * site uses to fire the purchase conversion. It does not unlock a license.
 */
export function buildStripeReturnUrl(origin, status) {
  const url = new URL('/', origin);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Checkout return origin must be http or https.');
  }
  url.searchParams.set('stripe_status', status);
  if (status === 'success') url.searchParams.set('ek_conversion', 'pro_purchase');
  return url.toString();
}

/**
 * Body for server Checkout Session creation. Campaign metadata is the stored
 * UTM set and li_fat_id only. client_reference_id stays a separate workstation
 * reference. File names and document contents are not accepted.
 */
export function buildCheckoutSessionRequest(planId, {
  attribution,
  clientReferenceId = '',
  origin,
} = {}) {
  const reference = sanitizeClientReference(clientReferenceId);
  const metadata = campaignParamsForCheckout(
    attribution === undefined ? readCheckoutAttribution() : attribution,
  );
  return {
    planId,
    ...(reference ? { clientReferenceId: reference } : {}),
    metadata,
    successUrl: buildStripeReturnUrl(origin, 'success'),
    cancelUrl: buildStripeReturnUrl(origin, 'cancel'),
  };
}

/**
 * Start Checkout Session via server. Throws if not configured.
 * The request carries campaign metadata and a return URL with the purchase marker.
 */
export async function startCheckout(planId, config = getCheckoutConfig(), options = {}) {
  if (!canPurchasePlan(planId, config)) {
    throw new Error(
      config.reason || 'Checkout is not configured for this plan.'
    );
  }

  const payload = buildCheckoutSessionRequest(planId, {
    attribution: options.attribution,
    clientReferenceId: options.clientReferenceId || options.workstationId || '',
    origin: options.origin || window.location.origin,
  });
  recordProCheckoutStarted();

  const res = await fetch(`${config.checkoutApiUrl}/checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Unable to start checkout. Please try again or contact support.');
  }

  const data = await res.json();
  if (!data?.url) {
    throw new Error('Checkout session did not return a redirect URL.');
  }

  window.location.assign(data.url);
}
