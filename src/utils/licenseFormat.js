/**
 * Shared license key format helpers (no storage side effects).
 */

export const DEV_TEST_KEY = 'PATENTPREPPERS-EXHIBITKIT-PRO';

export function isDevMode() {
  return import.meta.env.DEV === true;
}

/**
 * Validates a Pro license key format: EKIT-XXXX-XXXX-XXXX
 * Also accepts Case Pass keys: EKIT-CASE-XXXX-XXXX
 */
export function validateKeyFormat(key) {
  const cleanKey = (key || '').trim().toUpperCase();

  if (isDevMode() && (cleanKey === DEV_TEST_KEY || cleanKey === 'EKIT-CASE-TEST-0001')) {
    return true;
  }

  if (/^EKIT-CASE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanKey)) {
    return true;
  }

  return /^EKIT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanKey);
}
