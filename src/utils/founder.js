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

/**
 * The last secret that successfully unlocked founder admin, kept in memory only
 * (never persisted to storage) so founder-authenticated actions such as beta
 * invitations can re-send it. Cleared on lock and lost on refresh.
 */
let unlockedSecret = '';

export function getUnlockedFounderSecret() {
  return unlockedSecret;
}

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
    unlockedSecret = trimmed;
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
    unlockedSecret = trimmed;
    return persistUnlock();
  } catch {
    return { ok: false, error: 'Unable to reach founder unlock service.' };
  }
}

/**
 * Invite a beta tester by minting a real, server-verified time-limited Pro
 * license on the backend and emailing them the key. Requires the founder
 * secret; it is reused from the current session unlock when available, or can
 * be supplied explicitly (e.g. after a page refresh clears the in-memory copy).
 *
 * @param {{ email: string, name?: string, note?: string, days?: number, secret?: string }} params
 * @returns {Promise<{ ok: boolean, error?: string, needsSecret?: boolean, key?: string, fingerprint?: string, email?: string, expiresAt?: string, days?: number, emailStatus?: string }>}
 */
export async function inviteBetaTester({ email, name, note, days, secret } = {}) {
  const trimmedEmail = (email || '').trim();
  if (!trimmedEmail) {
    return { ok: false, error: 'Enter the tester email address.' };
  }

  const activeSecret = (secret || '').trim()
    || unlockedSecret
    || (import.meta.env.DEV ? getFounderSecret() : '');
  if (!activeSecret) {
    return {
      ok: false,
      needsSecret: true,
      error: 'Re-enter the founder secret to send invitations.',
    };
  }

  const numericDays = Number(days);
  try {
    const response = await fetch('/api/founder/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        secret: activeSecret,
        email: trimmedEmail,
        name: (name || '').trim() || undefined,
        note: (note || '').trim() || undefined,
        days: Number.isFinite(numericDays) ? numericDays : undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      return {
        ok: false,
        needsSecret: data.code === 'FOUNDER_DENIED',
        error: data.error || 'Could not send the beta invitation.',
      };
    }
    // Remember a working secret for subsequent invites this session.
    unlockedSecret = activeSecret;
    return {
      ok: true,
      key: data.key,
      fingerprint: data.fingerprint,
      email: data.email,
      expiresAt: data.expiresAt,
      days: data.days,
      emailStatus: data.emailStatus,
    };
  } catch {
    return { ok: false, error: 'Unable to reach the beta invite service.' };
  }
}

export function lockFounder() {
  unlockedSecret = '';
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
