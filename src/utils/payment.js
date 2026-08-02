/**
 * Payment adapter for ExhibitKit.
 *
 * Current architecture: static Vite SPA with Stripe Payment Links (no server).
 * Checkout opens Stripe-hosted pages. License keys are activated manually.
 *
 * Payment payloads must never include evidence metadata (filenames, case names,
 * captions, message contents, or hashes).
 *
 * Server-side session creation + webhook verification is documented as the
 * production hardening path when a secure backend is available.
 */

import { PRICING } from './pricing';

export const PAYMENT_PRODUCTS = {
  case_pass: {
    id: 'case_pass',
    name: PRICING.case_pass.name,
    amountUsd: PRICING.case_pass.price,
    envKey: 'VITE_STRIPE_CASE_PASS_LINK',
  },
  pro_perpetual: {
    id: 'pro_perpetual',
    name: PRICING.pro.name,
    amountUsd: PRICING.pro.price,
    envKey: 'VITE_STRIPE_PRO_LINK',
    // Backward-compatible fallback used by the prior $150 lifetime link
    legacyEnvKey: 'VITE_STRIPE_PAYMENT_LINK',
  },
};

const DEFAULT_PRO_LINK = 'https://buy.stripe.com/cNicN59My1tC6VN0ayg7e00';

function readEnv(name) {
  try {
    return import.meta.env?.[name] || '';
  } catch {
    return '';
  }
}

/**
 * Resolve a checkout URL for a product. Returns null when not configured.
 * Never attaches evidence metadata to the URL.
 */
export function getCheckoutUrl(productId) {
  const product = PAYMENT_PRODUCTS[productId];
  if (!product) return null;

  const primary = readEnv(product.envKey);
  if (primary) return primary;

  if (product.legacyEnvKey) {
    const legacy = readEnv(product.legacyEnvKey);
    if (legacy) return legacy;
  }

  // Built-in Pro payment link from the existing integration (configuration-aware)
  if (productId === 'pro_perpetual') {
    return DEFAULT_PRO_LINK;
  }

  return null;
}

export function isCheckoutConfigured(productId) {
  return Boolean(getCheckoutUrl(productId));
}

/**
 * Build a privacy-safe checkout request descriptor for UI/tests.
 * Explicitly strips any evidence fields if a caller passes them by mistake.
 */
export function createCheckoutRequest(productId, _unsafeExtras = {}) {
  // Intentionally ignore extras — payment must not receive evidence metadata
  void _unsafeExtras;
  const product = PAYMENT_PRODUCTS[productId];
  if (!product) {
    return { ok: false, error: 'Unknown product', payload: null };
  }

  const url = getCheckoutUrl(productId);
  if (!url) {
    return {
      ok: false,
      error: `${product.name} checkout is not configured. Set ${product.envKey} in your environment.`,
      payload: null,
      configured: false,
    };
  }

  const payload = {
    productId: product.id,
    amountUsd: product.amountUsd,
    // success/cancel are path markers only — no evidence fields
    successPath: '/?stripe_status=success&product=' + product.id,
    cancelPath: '/?stripe_status=cancel&product=' + product.id,
  };

  // Harden: ensure no evidence keys ever appear
  assertNoEvidenceFields(payload);

  return { ok: true, url, payload, configured: true };
}

const EVIDENCE_KEYS = [
  'filename',
  'fileName',
  'caseName',
  'caption',
  'message',
  'messages',
  'body',
  'hash',
  'sha256',
  'evidence',
  'redaction',
];

export function assertNoEvidenceFields(obj) {
  const json = JSON.stringify(obj || {});
  for (const key of EVIDENCE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj || {}, key)) {
      throw new Error(`Payment payload must not include evidence field: ${key}`);
    }
    // Also reject nested evidence-looking content in string values for tests
    if (new RegExp(`"${key}"\\s*:`).test(json)) {
      throw new Error(`Payment payload must not include evidence field: ${key}`);
    }
  }
  return true;
}

/**
 * Open Stripe Checkout for a product. Returns status for UI handling.
 */
export function startCheckout(productId) {
  const request = createCheckoutRequest(productId);
  if (!request.ok) {
    return { status: 'configuration_required', ...request };
  }
  if (typeof window !== 'undefined') {
    window.open(request.url, '_blank', 'noopener,noreferrer');
  }
  return { status: 'redirected', ...request };
}

/**
 * Idempotent webhook event tracker (client-side stand-in for tests / local docs).
 * Production must implement this server-side against Stripe event IDs.
 */
const processedEvents = new Set();

export function processWebhookEventIdempotent(eventId, handler) {
  if (!eventId) throw new Error('eventId required');
  if (processedEvents.has(eventId)) {
    return { duplicate: true, processed: false };
  }
  processedEvents.add(eventId);
  if (typeof handler === 'function') handler(eventId);
  return { duplicate: false, processed: true };
}

export function __resetWebhookIdempotencyForTests() {
  processedEvents.clear();
}
