/**
 * Founder admin access control.
 *
 * Access method:
 *   1. Open the app with ?founder=1 (or #founder)
 *   2. Enter the founder secret
 *
 * Secret resolution:
 *   - local development builds only
 *   - VITE_FOUNDER_ADMIN_SECRET if set locally
 *   - otherwise DEFAULT_FOUNDER_SECRET (`ekit-founder-2026`)
 *
 * This is a local live-test console for entitlement stages — not customer
 * licensing. Production builds must never expose or mount it.
 */

export const DEFAULT_FOUNDER_SECRET = 'ekit-founder-2026';
export const FOUNDER_SESSION_KEY = 'exhibitkit_founder_unlocked';
export const FOUNDER_QUERY_FLAG = 'founder';

export function isFounderAdminAvailable() {
  return import.meta.env.DEV;
}

function envSecret() {
  try {
    return (import.meta.env?.VITE_FOUNDER_ADMIN_SECRET || '').trim();
  } catch {
    return '';
  }
}

/**
 * The secret that unlocks founder admin for this build.
 * Always resolves to a usable secret so local/preview testing is not blocked.
 */
export function getFounderSecret() {
  if (!isFounderAdminAvailable()) return '';
  return envSecret() || DEFAULT_FOUNDER_SECRET;
}

export function isFounderAdminConfigured() {
  return Boolean(getFounderSecret());
}

export function isUsingDefaultFounderSecret() {
  return !envSecret();
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
    return { ok: false, error: 'Founder admin is available only in local development.' };
  }
  const expected = getFounderSecret();
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
