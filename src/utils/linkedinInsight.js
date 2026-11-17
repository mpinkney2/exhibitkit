/**
 * LinkedIn Insight Tag.
 *
 * The partner id and conversion ids are public measurement ids supplied at
 * build time. When the partner id is unset, nothing is injected.
 *
 * The current insight.min.js (snap.licdn.com) sends image pixels and
 * sendBeacon/fetch/XHR calls only to px.ads.linkedin.com. CSP must allow
 * snap.licdn.com on script-src and px.ads.linkedin.com on img-src and connect-src.
 * Conversion events carry a conversion id only — never file names or contents.
 */

export const LINKEDIN_SCRIPT_ORIGIN = 'https://snap.licdn.com';
export const LINKEDIN_COLLECT_ORIGIN = 'https://px.ads.linkedin.com';
export const LINKEDIN_INSIGHT_SCRIPT = `${LINKEDIN_SCRIPT_ORIGIN}/li.lms-analytics/insight.min.js`;

export const LINKEDIN_CONVERSION_ENV = Object.freeze({
  free_start: 'VITE_LINKEDIN_CONVERSION_FREE_START',
  pro_checkout: 'VITE_LINKEDIN_CONVERSION_PRO_CHECKOUT',
  pro_purchase: 'VITE_LINKEDIN_CONVERSION_PRO_PURCHASE',
});

function builtinEnv() {
  return {
    VITE_LINKEDIN_PARTNER_ID: import.meta.env.VITE_LINKEDIN_PARTNER_ID,
    VITE_LINKEDIN_CONVERSION_FREE_START: import.meta.env.VITE_LINKEDIN_CONVERSION_FREE_START,
    VITE_LINKEDIN_CONVERSION_PRO_CHECKOUT: import.meta.env.VITE_LINKEDIN_CONVERSION_PRO_CHECKOUT,
    VITE_LINKEDIN_CONVERSION_PRO_PURCHASE: import.meta.env.VITE_LINKEDIN_CONVERSION_PRO_PURCHASE,
  };
}

function readEnv(name, env) {
  try {
    return (env || builtinEnv())?.[name];
  } catch {
    return undefined;
  }
}

function numericId(value) {
  const id = String(value ?? '').trim();
  return /^\d{1,15}$/.test(id) ? id : '';
}

export function readLinkedInPartnerId(env) {
  return numericId(readEnv('VITE_LINKEDIN_PARTNER_ID', env));
}

export function readLinkedInConversionId(eventName, env) {
  const envName = LINKEDIN_CONVERSION_ENV[eventName];
  if (!envName) return '';
  return numericId(readEnv(envName, env));
}

function ensureLintrkQueue() {
  if (typeof window.lintrk === 'function') return;
  window.lintrk = function lintrk(action, payload) {
    window.lintrk.q.push([action, payload]);
  };
  window.lintrk.q = [];
}

/**
 * Load the Insight Tag once. Returns false without touching the DOM when the
 * partner id is missing or not a numeric id.
 */
export function installLinkedInInsightTag(env) {
  const partnerId = readLinkedInPartnerId(env);
  if (!partnerId || typeof document === 'undefined') return false;
  if (document.querySelector('script[data-exhibitkit-linkedin="insight"]')) return true;

  window._linkedin_partner_id = partnerId;
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(partnerId);
  ensureLintrkQueue();

  const script = document.createElement('script');
  script.async = true;
  script.src = LINKEDIN_INSIGHT_SCRIPT;
  script.dataset.exhibitkitLinkedin = 'insight';
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript);
  else document.head.appendChild(script);
  return true;
}

/** Fire one Insight Tag conversion. No-op when the partner id or conversion id is unset. */
export function trackLinkedInConversion(eventName, env) {
  const partnerId = readLinkedInPartnerId(env);
  const conversionId = readLinkedInConversionId(eventName, env);
  if (!partnerId || !conversionId || typeof window === 'undefined') return false;
  try {
    ensureLintrkQueue();
    const numeric = Number(conversionId);
    window.lintrk('track', {
      conversion_id: Number.isSafeInteger(numeric) ? numeric : conversionId,
    });
    return true;
  } catch {
    return false;
  }
}
