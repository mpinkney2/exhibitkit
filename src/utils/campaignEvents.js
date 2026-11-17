/**
 * Campaign conversion points. Each LinkedIn call is a conversion id only.
 */

import { trackLinkedInConversion } from './linkedinInsight.js';

const FREE_START_STORAGE_KEY = 'exhibitkit_free_start_tracked_v1';
const PURCHASE_STORAGE_PREFIX = 'exhibitkit_pro_purchase_tracked_v1:';

function safeId(value, fallback = 'return') {
  const clean = String(value ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 200);
  return clean || fallback;
}

export function proPurchaseReturnId(search = '') {
  const params = new URLSearchParams(typeof search === 'string' ? search : '');
  const success = params.get('stripe_status') === 'success'
    || params.get('ek_conversion') === 'pro_purchase';
  if (!success) return null;
  return safeId(params.get('session_id'));
}

/** First successful free-tier batch run or download. Later calls in this browser no-op. */
export function recordFreeTierStart({ paid = false, storage = globalThis.localStorage, env } = {}) {
  if (paid) return false;
  try {
    if (storage?.getItem(FREE_START_STORAGE_KEY)) return false;
    storage?.setItem(FREE_START_STORAGE_KEY, '1');
  } catch {
    return false;
  }
  return trackLinkedInConversion('free_start', env);
}

export function recordProCheckoutStarted(env) {
  return trackLinkedInConversion('pro_checkout', env);
}

/** One purchase conversion per Checkout Session id on the Stripe return. */
export function recordProPurchaseCompleted(sessionId, storage = globalThis.sessionStorage, env) {
  const key = PURCHASE_STORAGE_PREFIX + safeId(sessionId);
  try {
    if (storage?.getItem(key)) return false;
    storage?.setItem(key, '1');
  } catch {
    // Still attempt the event when storage is blocked.
  }
  return trackLinkedInConversion('pro_purchase', env);
}
