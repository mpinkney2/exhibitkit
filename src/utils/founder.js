/**
 * Founder admin access control.
 *
 * Access method:
 *   1. Open the app with ?founder=1 (or #founder)
 *   2. Enter the founder secret
 *
 * Availability:
 *   - Local DEV builds: always available (default secret `ekit-founder-2026`
 *     unless VITE_FOUNDER_ADMIN_SECRET overrides it)
 *   - Production / preview builds: available only when
 *     VITE_FOUNDER_ADMIN_SECRET is set at build time (no default secret)
 *
 * This is a live-test console for entitlement stages — not customer
 * licensing. The production secret is baked into the client bundle; treat
 * it as obscurity, not server-side auth.
 */

export const DEFAULT_FOUNDER_SECRET = 'ekit-founder-2026';
export const FOUNDER_SESSION_KEY = 'exhibitkit_founder_unlocked';
export const FOUNDER_QUERY_FLAG = 'founder';

function envSecret() {
  try {
    return (import.meta.env?.VITE_FOUNDER_ADMIN_SECRET || '').trim();
  } catch {
    return '';
  }
}

/**
 * True when this build may mount / unlock founder admin.
 * Production builds require an explicit VITE_FOUNDER_ADMIN_SECRET.
 */
export function isFounderAdminAvailable() {
  if (import.meta.env.DEV) return true;
  return Boolean(envSecret());
}

/**
 * The secret that unlocks founder admin for this build.
 * Production never falls back to DEFAULT_FOUNDER_SECRET.
 */
export function getFounderSecret() {
  if (!isFounderAdminAvailable()) return '';
  const configured = envSecret();
  if (configured) return configured;
  if (import.meta.env.DEV) return DEFAULT_FOUNDER_SECRET;
  return '';
}

export function isFounderAdminConfigured() {
  return Boolean(getFounderSecret());
}

export function isUsingDefaultFounderSecret() {
  return import.meta.env.DEV && !envSecret();
}

/**
 * True when the URL explicitly requests the founder entry surface.
 */
export function shouldOfferFounderEntry(search = window.location.search, hash = window.location.hash) {
  if (!isFounderAdminAvailable()) return false;
  const params = new URLSearchParams(search);
  if (params.get(FOUNDER_QUERY_FLAG) === '1' || params.get(FOUNDER_QUERY_FLAG) === 'true') {
    return true;
  }
  if ((hash || '').replace(/^#/, '') === 'founder') {
    return true;
  }
  return false;
}

export function isFounderUnlocked() {
  if (!isFounderAdminAvailable()) return false;
  try {
    return sessionStorage.getItem(FOUNDER_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * @param {string} candidate
 * @returns {{ ok: boolean, error?: string }}
 */
export function unlockFounder(candidate) {
  if (!isFounderAdminAvailable()) {
    return {
      ok: false,
      error: 'Founder admin is not enabled in this build. Set VITE_FOUNDER_ADMIN_SECRET and redeploy.',
    };
  }
  const expected = getFounderSecret();
  if (!expected) {
    return { ok: false, error: 'Founder admin is not configured.' };
  }
  if ((candidate || '').trim() !== expected) {
    return { ok: false, error: 'Incorrect founder secret.' };
  }
  try {
    sessionStorage.setItem(FOUNDER_SESSION_KEY, 'true');
  } catch {
    return { ok: false, error: 'Unable to persist founder session.' };
  }
  return { ok: true };
}

export function lockFounder() {
  try {
    sessionStorage.removeItem(FOUNDER_SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * Strip founder query flag from the URL without reloading.
 */
export function clearFounderQueryFromUrl() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has(FOUNDER_QUERY_FLAG)) {
      url.searchParams.delete(FOUNDER_QUERY_FLAG);
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    }
    if (url.hash === '#founder') {
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
  } catch {
    // ignore
  }
}
