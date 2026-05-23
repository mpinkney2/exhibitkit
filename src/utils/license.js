/**
 * ExhibitKIT Licensing & Access Service
 * Handles local license storage, validation, developer bypass, and trial gating.
 */

const LICENSE_KEY_STORAGE = 'exhibitkit_license_key';
const LICENSE_ACTIVATED_STORAGE = 'exhibitkit_pro_activated';
const LICENSE_TYPE_STORAGE = 'exhibitkit_license_type';
const LICENSE_TIMESTAMP_STORAGE = 'exhibitkit_activation_timestamp';
const TRIAL_USED_STORAGE = 'exhibitkit_trial_used';
const WORKSTATION_STORAGE = 'exhibitkit_workstation_info';

export const APP_VERSION = 'v0.9.3';
export const DEV_TEST_KEY = 'PATENTPREPPERS-EXHIBITKIT-PRO';

/**
 * Checks if the application is currently running in development mode.
 * @returns {boolean}
 */
export function isDevMode() {
  return import.meta.env.DEV === true;
}

/**
 * Initializes and retrieves local workstation/device credentials on first app launch.
 * This architecture enables future server-side seat verification, license transfers,
 * and multi-workstation diagnostics.
 * @returns {object} { deviceId, activatedAt, licenseType, trialUsed, appVersion }
 */
export function initializeWorkstation() {
  let info = localStorage.getItem(WORKSTATION_STORAGE);
  const currentTrialState = localStorage.getItem(TRIAL_USED_STORAGE) === 'true';

  if (!info) {
    // Generate a secure, recognizable local workstation identifier
    const deviceId = 'EKIT-WORKSTATION-' + 
      Math.random().toString(36).substring(2, 15).toUpperCase() + '-' + 
      Math.random().toString(36).substring(2, 6).toUpperCase();

    const newInfo = {
      deviceId,
      activatedAt: null,
      licenseType: 'none',
      trialUsed: currentTrialState,
      appVersion: APP_VERSION
    };
    localStorage.setItem(WORKSTATION_STORAGE, JSON.stringify(newInfo));
    return newInfo;
  }

  // Ensure local cached workstation info matches current trial state and version
  try {
    const parsed = JSON.parse(info);
    parsed.trialUsed = currentTrialState;
    parsed.appVersion = APP_VERSION;
    localStorage.setItem(WORKSTATION_STORAGE, JSON.stringify(parsed));
    return parsed;
  } catch (e) {
    // Fallback reset on corrupted JSON
    localStorage.removeItem(WORKSTATION_STORAGE);
    return initializeWorkstation();
  }
}

/**
 * Exposes workstation metadata.
 * @returns {object}
 */
export function getWorkstationInfo() {
  return initializeWorkstation();
}

/**
 * Returns current license information.
 * @returns {object} { active: boolean, key: string|null, timestamp: string|null, type: string|null }
 */
export function getLicenseStatus() {
  const active = localStorage.getItem(LICENSE_ACTIVATED_STORAGE) === 'true';
  const key = localStorage.getItem(LICENSE_KEY_STORAGE);
  const type = localStorage.getItem(LICENSE_TYPE_STORAGE);
  const timestamp = localStorage.getItem(LICENSE_TIMESTAMP_STORAGE);

  return { active, key, timestamp, type };
}

/**
 * Validates a license key format.
 * Format allowed: EKIT-XXXX-XXXX-XXXX where X are alphanumeric characters.
 * @param {string} key 
 * @returns {boolean}
 */
export function validateKeyFormat(key) {
  const cleanKey = (key || '').trim().toUpperCase();

  // 1. Allow the developer test key ONLY in development mode.
  // In production, this key must be completely ignored as a valid key.
  if (isDevMode() && cleanKey === DEV_TEST_KEY) {
    return true;
  }

  // 2. Standard product license format validation
  // Matches EKIT-XXXX-XXXX-XXXX
  const licenseRegex = /^EKIT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return licenseRegex.test(cleanKey);
}

/**
 * Activates a license key if valid.
 * @param {string} key 
 * @param {string} [type='lifetime'] 
 * @returns {boolean} True if successfully activated, false otherwise.
 */
export function activateLicense(key, type = 'lifetime') {
  const cleanKey = (key || '').trim().toUpperCase();

  if (validateKeyFormat(cleanKey)) {
    localStorage.setItem(LICENSE_ACTIVATED_STORAGE, 'true');
    localStorage.setItem(LICENSE_KEY_STORAGE, cleanKey);
    localStorage.setItem(LICENSE_TYPE_STORAGE, type);
    localStorage.setItem(LICENSE_TIMESTAMP_STORAGE, new Date().toISOString());

    // Update the local workstation state
    const info = getWorkstationInfo();
    info.activatedAt = new Date().toISOString();
    info.licenseType = type;
    localStorage.setItem(WORKSTATION_STORAGE, JSON.stringify(info));

    return true;
  }

  return false;
}

/**
 * Deactivates and clears the current license key.
 */
export function deactivateLicense() {
  localStorage.removeItem(LICENSE_ACTIVATED_STORAGE);
  localStorage.removeItem(LICENSE_KEY_STORAGE);
  localStorage.removeItem(LICENSE_TYPE_STORAGE);
  localStorage.removeItem(LICENSE_TIMESTAMP_STORAGE);

  // Clear activation state on the workstation
  const info = getWorkstationInfo();
  info.activatedAt = null;
  info.licenseType = 'none';
  localStorage.setItem(WORKSTATION_STORAGE, JSON.stringify(info));
}

/**
 * Checks if the user has Pro access (valid active license).
 * TODO: Server-side license validation to verify key integrity against Stripe records.
 * TODO: Account-based license lookup via customer emails.
 * TODO: Email-based license recovery service.
 * @returns {boolean}
 */
export function hasProAccess() {
  const { active, key } = getLicenseStatus();
  if (!active || !key) return false;

  // Additional security check: ensure stored key format remains valid
  return validateKeyFormat(key);
}

/**
 * Checks if the user has a trial batch available (i.e. has not used it yet).
 * @returns {boolean}
 */
export function hasTrialAvailable() {
  return localStorage.getItem(TRIAL_USED_STORAGE) !== 'true';
}

/**
 * Marks the one-time trial batch as consumed.
 */
export function markTrialUsed() {
  localStorage.setItem(TRIAL_USED_STORAGE, 'true');

  // Update workstation info
  const info = getWorkstationInfo();
  info.trialUsed = true;
  localStorage.setItem(WORKSTATION_STORAGE, JSON.stringify(info));
}

/**
 * Resets the trial state (useful for developer testing or resetting trials).
 * Only accessible in development.
 */
export function resetTrialState() {
  if (isDevMode()) {
    localStorage.removeItem(TRIAL_USED_STORAGE);
    const info = getWorkstationInfo();
    info.trialUsed = false;
    localStorage.setItem(WORKSTATION_STORAGE, JSON.stringify(info));
  }
}
