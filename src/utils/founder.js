/**
 * Founder admin access control.
 *
 * Access method:
 *   1. Open the app with ?founder=1 (or #founder)
 *   2. Enter the founder secret
 *
 * Unlock paths:
 *   - Local DEV: compares against DEFAULT_FOUNDER_SECRET or optional
 *     VITE_FOUNDER_ADMIN_SECRET (local override only — never set in Vercel)
 *   - Production / preview: POST /api/founder/unlock, which checks
 *     server-only FOUNDER_ADMIN_SECRET (no VITE_ prefix, never in the bundle)
 *
 * This is a live-test console for entitlement stages — not customer licensing.
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

/** Founder admin UI may mount in every build; unlock is gated separately. */
export function isFounderAdminAvailable() {
  return true;
}

/**
 * Local DEV secret only. Production never reads a client-side founder secret.
 */
export function getFounderSecret() {
  if (!import.meta.env.DEV) return '';
  return envSecret() || DEFAULT_FOUNDER_SECRET;
}

export function isFounderAdminConfigured() {
  if (import.meta.env.DEV) return Boolean(getFounderSecret());
  // Production unlock is server-configured; show the form and let the API decide.
  return true;
}

export function isUsingDefaultFounderSecret() {
  return import.meta.env.DEV && !envSecret();
}

/**
 * True when the URL explicitly requests the founder entry surface.
 */
export function shouldOfferFounderEntry(search = window.location.search, hash = window.location.hash) {
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
  try {
    return sessionStorage.getItem(FOUNDER_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

function persistUnlock() {
  try {
    sessionStorage.setItem(FOUNDER_SESSION_KEY, 'true');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Unable to persist founder session.' };
  }
}

/**
 * @param {string} candidate
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function unlockFounder(candidate) {
  const trimmed = (candidate || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter the founder secret.' };
  }

  if (import.meta.env.DEV) {
    const expected = getFounderSecret();
    if (trimmed !== expected) {
      return { ok: false, error: 'Incorrect founder secret.' };
    }
    return persistUnlock();
  }

  try {
    const response = await fetch('/api/founder/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: trimmed }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || 'Unlock failed.',
      };
    }
    return persistUnlock();
  } catch {
    return { ok: false, error: 'Unable to reach founder unlock service.' };
  }
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
