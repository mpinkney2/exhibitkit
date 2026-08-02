/**
 * ExhibitKit Licensing & Access Service
 * Bridges legacy storage with the Free / Case Pass / Pro perpetual entitlement model.
 */

import { validateKeyFormat, isDevMode, DEV_TEST_KEY } from './licenseFormat';
import {
  activateFromKey,
  clearEntitlement,
  getEffectiveEntitlement,
  hasProFeatures,
  readEntitlement,
  TIERS,
  writeEntitlement,
} from './entitlements';

export { validateKeyFormat, isDevMode, DEV_TEST_KEY };
export { hasProFeatures, getEffectiveEntitlement, readEntitlement, TIERS };

const LICENSE_KEY_STORAGE = 'exhibitkit_license_key';
const LICENSE_ACTIVATED_STORAGE = 'exhibitkit_pro_activated';
const LICENSE_TYPE_STORAGE = 'exhibitkit_license_type';
const LICENSE_TIMESTAMP_STORAGE = 'exhibitkit_activation_timestamp';
const TRIAL_USED_STORAGE = 'exhibitkit_trial_used';
const WORKSTATION_STORAGE = 'exhibitkit_workstation_info';

export const APP_VERSION = 'v1.0.0';

export function initializeWorkstation() {
  let info = localStorage.getItem(WORKSTATION_STORAGE);
  const currentTrialState = localStorage.getItem(TRIAL_USED_STORAGE) === 'true';
  const entitlement = getEffectiveEntitlement();

  if (!info) {
    const deviceId =
      'EKIT-WORKSTATION-' +
      Math.random().toString(36).substring(2, 15).toUpperCase() +
      '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase();

    const newInfo = {
      deviceId,
      activatedAt: entitlement.purchasedAt,
      licenseType: entitlement.tier,
      trialUsed: currentTrialState,
      appVersion: APP_VERSION,
    };
    localStorage.setItem(WORKSTATION_STORAGE, JSON.stringify(newInfo));
    return newInfo;
  }

  try {
    const parsed = JSON.parse(info);
    parsed.trialUsed = currentTrialState;
    parsed.appVersion = APP_VERSION;
    parsed.licenseType = entitlement.tier;
    parsed.activatedAt = entitlement.purchasedAt;
    localStorage.setItem(WORKSTATION_STORAGE, JSON.stringify(parsed));
    return parsed;
  } catch {
    localStorage.removeItem(WORKSTATION_STORAGE);
    return initializeWorkstation();
  }
}

export function getWorkstationInfo() {
  return initializeWorkstation();
}

export function getLicenseStatus() {
  const entitlement = getEffectiveEntitlement();
  const active = hasProFeatures();
  return {
    active,
    key: entitlement.key || localStorage.getItem(LICENSE_KEY_STORAGE),
    timestamp: entitlement.purchasedAt || localStorage.getItem(LICENSE_TIMESTAMP_STORAGE),
    type: entitlement.tier,
    entitlement,
  };
}

/**
 * Activates a license key (Case Pass or Pro perpetual).
 * @param {string} key
 * @param {string} [type] - optional forced tier
 */
export function activateLicense(key, type) {
  const options = type ? { tier: type === 'lifetime' ? TIERS.PRO_PERPETUAL : type } : {};
  const entitlement = activateFromKey(key, options);
  if (!entitlement) return false;

  // Keep legacy flags in sync for older UI paths
  localStorage.setItem(LICENSE_ACTIVATED_STORAGE, 'true');
  localStorage.setItem(LICENSE_KEY_STORAGE, entitlement.key);
  localStorage.setItem(LICENSE_TYPE_STORAGE, entitlement.tier);
  localStorage.setItem(LICENSE_TIMESTAMP_STORAGE, entitlement.purchasedAt);

  const info = getWorkstationInfo();
  info.activatedAt = entitlement.purchasedAt;
  info.licenseType = entitlement.tier;
  localStorage.setItem(WORKSTATION_STORAGE, JSON.stringify(info));
  return true;
}

export function deactivateLicense() {
  clearEntitlement();
  localStorage.removeItem(LICENSE_ACTIVATED_STORAGE);
  localStorage.removeItem(LICENSE_KEY_STORAGE);
  localStorage.removeItem(LICENSE_TYPE_STORAGE);
  localStorage.removeItem(LICENSE_TIMESTAMP_STORAGE);

  const info = getWorkstationInfo();
  info.activatedAt = null;
  info.licenseType = TIERS.FREE;
  localStorage.setItem(WORKSTATION_STORAGE, JSON.stringify(info));
}

/**
 * Pro access = Case Pass (unexpired) or Pro perpetual / Firm.
 * Migrates legacy lifetime activations into pro_perpetual on first read.
 */
export function hasProAccess() {
  migrateLegacyLicenseIfNeeded();
  return hasProFeatures();
}

function migrateLegacyLicenseIfNeeded() {
  const entitlement = readEntitlement();
  if (entitlement.tier !== TIERS.FREE) return;

  const legacyActive = localStorage.getItem(LICENSE_ACTIVATED_STORAGE) === 'true';
  const legacyKey = localStorage.getItem(LICENSE_KEY_STORAGE);
  const legacyType = localStorage.getItem(LICENSE_TYPE_STORAGE);
  if (!legacyActive || !legacyKey || !validateKeyFormat(legacyKey)) return;

  const purchasedAt = localStorage.getItem(LICENSE_TIMESTAMP_STORAGE) || new Date().toISOString();
  if (legacyType === 'case_pass' || legacyKey.startsWith('EKIT-CASE-')) {
    activateFromKey(legacyKey, { tier: TIERS.CASE_PASS, purchasedAt });
  } else {
    const updatesUntil = new Date(
      new Date(purchasedAt).getTime() + 365 * 24 * 60 * 60 * 1000
    ).toISOString();
    writeEntitlement({
      tier: TIERS.PRO_PERPETUAL,
      key: legacyKey.trim().toUpperCase(),
      purchasedAt,
      expiresAt: null,
      updatesUntil,
    });
  }
}

export function hasTrialAvailable() {
  return localStorage.getItem(TRIAL_USED_STORAGE) !== 'true';
}

export function markTrialUsed() {
  localStorage.setItem(TRIAL_USED_STORAGE, 'true');
  const info = getWorkstationInfo();
  info.trialUsed = true;
  localStorage.setItem(WORKSTATION_STORAGE, JSON.stringify(info));
}

export function resetTrialState() {
  if (isDevMode()) {
    localStorage.removeItem(TRIAL_USED_STORAGE);
    const info = getWorkstationInfo();
    info.trialUsed = false;
    localStorage.setItem(WORKSTATION_STORAGE, JSON.stringify(info));
  }
}

export function getEntitlementLabel() {
  const e = getEffectiveEntitlement();
  if (e.tier === TIERS.PRO_PERPETUAL) return 'Pro';
  if (e.tier === TIERS.CASE_PASS) return 'Case Pass';
  if (e.tier === TIERS.FIRM) return 'Firm';
  return 'Free';
}
