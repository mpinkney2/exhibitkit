/**
 * Shared license key format helpers (no storage side effects).
 */

export const DEV_TEST_KEY = 'PATENTPREPPERS-EXHIBITKIT-PRO';

/** Shown when someone enters a guest or demo key. Access stays on the free tier. */
export const GUEST_DEMO_COMING_SOON_MESSAGE =
  'Guest demo is coming soon. Contact us at support@patentpreppers.com and keep using the free tier in the meantime.';

export function isDevMode() {
  return import.meta.env.DEV === true;
}

/**
 * Guest and demo keys are recognized so the app can stay on the free tier
 * and show a coming-soon notice. They never unlock paid features.
 */
export function isGuestDemoKey(key) {
  return (key || '').trim().toUpperCase().startsWith('EKIT-GUEST-');
}

/**
 * Validates a Pro license key format: EKIT-XXXX-XXXX-XXXX
 * Also accepts Case Pass keys: EKIT-CASE-XXXX-XXXX
 */
export function validateKeyFormat(key) {
  const cleanKey = (key || '').trim().toUpperCase();

  if (isGuestDemoKey(cleanKey)) return false;

  if (
    isDevMode() &&
    (cleanKey === DEV_TEST_KEY || cleanKey === 'EKIT-CASE-TEST-0001')
  ) {
    return true;
  }

  if (/^EKIT-CASE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanKey)) {
    return true;
  }

  return /^EKIT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanKey);
}
