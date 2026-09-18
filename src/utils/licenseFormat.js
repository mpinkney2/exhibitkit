/**
 * Shared license key format helpers (no storage side effects).
 */

export const DEV_TEST_KEY = 'PATENTPREPPERS-EXHIBITKIT-PRO';

/** Issued 10-day guest demo access key for law-firm trial (local activation). */
export const GUEST_DEMO_KEY = 'EKIT-GUEST-PINK-10DY';

/** Friendly guest login id paired with GUEST_DEMO_KEY (not a cloud account). */
export const GUEST_DEMO_ID = 'pinkney.guest';

/** Passphrase accepted with guest id for law-firm trial activation. */
export const GUEST_DEMO_PASSPHRASE = 'ExhibitKit-Trial-10';

/** Guest demo duration in consecutive days from first activation. */
export const GUEST_DEMO_DURATION_DAYS = 10;

export function isDevMode() {
  return import.meta.env.DEV === true;
}

/**
 * Validates a Pro license key format: EKIT-XXXX-XXXX-XXXX
 * Also accepts Case Pass keys: EKIT-CASE-XXXX-XXXX
 * and Guest demo keys: EKIT-GUEST-XXXX-XXXX
 */
export function validateKeyFormat(key) {
  const cleanKey = (key || '').trim().toUpperCase();

  if (
    isDevMode() &&
    (cleanKey === DEV_TEST_KEY ||
      cleanKey === 'EKIT-CASE-TEST-0001' ||
      cleanKey === 'EKIT-GUEST-TEST-0001')
  ) {
    return true;
  }

  if (/^EKIT-GUEST-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanKey)) {
    return true;
  }

  if (/^EKIT-CASE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanKey)) {
    return true;
  }

  return /^EKIT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanKey);
}

/**
 * Resolve guest id + passphrase into an access key when credentials match the
 * issued law-firm guest demo pack. Returns null when credentials do not match.
 */
export function resolveGuestCredentials(guestId, passphrase) {
  const id = (guestId || '').trim().toLowerCase();
  const pass = (passphrase || '').trim();
  if (id === GUEST_DEMO_ID && pass === GUEST_DEMO_PASSPHRASE) {
    return GUEST_DEMO_KEY;
  }
  return null;
}
