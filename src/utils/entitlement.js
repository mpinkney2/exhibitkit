/**
 * ExhibitKIT entitlement model.
 * States: free | case_pass | pro_perpetual | firm (future stub)
 *
 * Local cache is for UX only. Paid purchases require server-side verification
 * once a durable backend is configured. Until then, checkout stays disabled and
 * only migrated legacy licenses / format-valid license keys restore Pro.
 *
 * Restoration method: license key (see restoreFromLicenseKey).
 * Do not use guessable seat query params or unsigned entitlement APIs.
 */

import {
  PLAN_IDS,
  FREE_MAX_FILES_PER_BATCH,
  CASE_PASS_DURATION_DAYS,
  PRO_UPDATES_INCLUDED_MONTHS,
} from '../config/pricing.js';
import {
  getLicenseStatus,
  validateKeyFormat,
  activateLicense as legacyActivateLicense,
  deactivateLicense as legacyDeactivateLicense,
  getWorkstationInfo,
  isDevMode,
  DEV_TEST_KEY,
  APP_VERSION,
} from './license.js';

const ENTITLEMENT_STORAGE = 'exhibitkit_entitlement_v1';
const MIGRATION_FLAG = 'exhibitkit_entitlement_migrated_v1';

/**
 * @typedef {'free'|'case_pass'|'pro_perpetual'|'firm'} EntitlementPlan
 * @typedef {'active'|'expired'|'payment_pending'|'none'} CasePassStatus
 * @typedef {'included'|'active'|'lapsed'|'none'} UpdateRenewalStatus
 *
 * @typedef {object} EntitlementRecord
 * @property {EntitlementPlan} plan
 * @property {string|null} licenseKey
 * @property {string|null} purchasedAt
 * @property {string|null} expiresAt              Case Pass only
 * @property {CasePassStatus} casePassStatus
 * @property {string|null} updatesIncludedUntil  Pro messaging / future use
 * @property {UpdateRenewalStatus} updateRenewalStatus
 * @property {string|null} purchasedVersion
 * @property {boolean} migratedFromLegacy
 */

export { FREE_MAX_FILES_PER_BATCH, PLAN_IDS, APP_VERSION, isDevMode, DEV_TEST_KEY };

function emptyEntitlement() {
  return {
    plan: PLAN_IDS.FREE,
    licenseKey: null,
    purchasedAt: null,
    expiresAt: null,
    casePassStatus: 'none',
    updatesIncludedUntil: null,
    updateRenewalStatus: 'none',
    purchasedVersion: null,
    migratedFromLegacy: false,
  };
}

function readStored() {
  try {
    const raw = localStorage.getItem(ENTITLEMENT_STORAGE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStored(record) {
  localStorage.setItem(ENTITLEMENT_STORAGE, JSON.stringify(record));
}

function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function addMonths(isoDate, months) {
  const d = new Date(isoDate);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

/**
 * Migrate legacy localStorage license (former $150 / lifetime) → pro_perpetual.
 * Idempotent. Existing customers must not lose access.
 */
export function migrateLegacyLicenseIfNeeded() {
  if (typeof localStorage === 'undefined') return getEntitlement();

  const already = localStorage.getItem(MIGRATION_FLAG) === 'true';
  const existing = readStored();
  if (already && existing) {
    return normalizeEntitlement(existing);
  }

  const legacy = getLicenseStatus();
  if (legacy.active && legacy.key && validateKeyFormat(legacy.key)) {
    const purchasedAt = legacy.timestamp || new Date().toISOString();
    const record = {
      plan: PLAN_IDS.PRO,
      licenseKey: legacy.key,
      purchasedAt,
      expiresAt: null,
      casePassStatus: 'none',
      updatesIncludedUntil: addMonths(purchasedAt, PRO_UPDATES_INCLUDED_MONTHS),
      updateRenewalStatus: 'included',
      purchasedVersion: APP_VERSION,
      migratedFromLegacy: true,
    };
    writeStored(record);
    localStorage.setItem(MIGRATION_FLAG, 'true');
    return normalizeEntitlement(record);
  }

  if (!existing) {
    writeStored(emptyEntitlement());
  }
  localStorage.setItem(MIGRATION_FLAG, 'true');
  return getEntitlement();
}

function normalizeEntitlement(record) {
  const base = { ...emptyEntitlement(), ...record };

  if (base.plan === PLAN_IDS.CASE_PASS && base.expiresAt) {
    const now = Date.now();
    const exp = new Date(base.expiresAt).getTime();
    if (base.casePassStatus === 'payment_pending') {
      // leave pending
    } else if (Number.isFinite(exp) && exp <= now) {
      base.casePassStatus = 'expired';
    } else if (Number.isFinite(exp) && exp > now) {
      base.casePassStatus = 'active';
    }
  }

  return base;
}

/**
 * Returns current entitlement (after migration + Case Pass expiry evaluation).
 * @returns {EntitlementRecord}
 */
export function getEntitlement() {
  migrateLegacyLicenseIfNeeded();
  const stored = readStored() || emptyEntitlement();
  const normalized = normalizeEntitlement(stored);
  // Persist expiry flip so UI stays consistent
  if (stored.casePassStatus !== normalized.casePassStatus || stored.plan !== normalized.plan) {
    writeStored(normalized);
  }
  return normalized;
}

/**
 * True when Case Pass is currently within its 30-day window.
 */
export function isCasePassActive(entitlement = getEntitlement()) {
  if (entitlement.plan !== PLAN_IDS.CASE_PASS) return false;
  if (entitlement.casePassStatus === 'payment_pending') return false;
  if (!entitlement.expiresAt) return false;
  return new Date(entitlement.expiresAt).getTime() > Date.now();
}

/**
 * Pro perpetual access never expires based on updatesIncludedUntil.
 */
export function isProPerpetual(entitlement = getEntitlement()) {
  return entitlement.plan === PLAN_IDS.PRO;
}

/**
 * Effective paid renaming access (Case Pass active OR Pro perpetual OR future Firm).
 * Expiration of updatesIncludedUntil must NEVER revert Pro to Free.
 */
export function hasPaidRenamingAccess(entitlement = getEntitlement()) {
  if (entitlement.plan === PLAN_IDS.PRO) return true;
  if (entitlement.plan === PLAN_IDS.FIRM) return true;
  if (isCasePassActive(entitlement)) return true;
  return false;
}

/**
 * Alias used by UI gates formerly backed by hasProAccess().
 */
export function hasProFeatures(entitlement = getEntitlement()) {
  return hasPaidRenamingAccess(entitlement);
}

/**
 * Free batch limit: up to FREE_MAX_FILES_PER_BATCH real files when not paid.
 */
export function getMaxRealFilesPerBatch(entitlement = getEntitlement()) {
  if (hasPaidRenamingAccess(entitlement)) return Infinity;
  return FREE_MAX_FILES_PER_BATCH;
}

export function isWithinFreeFileLimit(fileCount, entitlement = getEntitlement()) {
  const max = getMaxRealFilesPerBatch(entitlement);
  if (!Number.isFinite(max)) return true;
  return fileCount <= max;
}

/**
 * Human-readable plan badge for the workspace chrome.
 */
export function getEntitlementLabel(entitlement = getEntitlement()) {
  if (entitlement.plan === PLAN_IDS.PRO) return 'Pro';
  if (entitlement.plan === PLAN_IDS.FIRM) return 'Firm';
  if (isCasePassActive(entitlement)) return 'Case Pass';
  if (entitlement.plan === PLAN_IDS.CASE_PASS && entitlement.casePassStatus === 'expired') {
    return 'Free';
  }
  if (entitlement.plan === PLAN_IDS.CASE_PASS && entitlement.casePassStatus === 'payment_pending') {
    return 'Pending';
  }
  return 'Free';
}

/**
 * Apply a verified entitlement record (from license restoration or future signed API).
 * Not for client-invented purchases.
 * @param {Partial<EntitlementRecord> & { plan: EntitlementPlan }} record
 */
export function applyEntitlementRecord(record) {
  const next = normalizeEntitlement({ ...emptyEntitlement(), ...record });
  writeStored(next);

  // Keep legacy license keys in sync for Pro so older code paths remain coherent
  if (next.plan === PLAN_IDS.PRO && next.licenseKey) {
    legacyActivateLicense(next.licenseKey, 'pro_perpetual');
  }

  return next;
}

/**
 * Restore access via license key (defined restoration method).
 * - Valid format → Pro perpetual (legacy-compatible; server will refine plan types later)
 * - Dev test key in DEV only → Pro perpetual
 *
 * Case Pass keys must be issued/verified by a future backend; until then this
 * path maps format-valid keys to pro_perpetual so existing customers keep access.
 *
 * @param {string} key
 * @returns {{ ok: boolean, entitlement?: EntitlementRecord, error?: string }}
 */
export function restoreFromLicenseKey(key) {
  const cleanKey = (key || '').trim().toUpperCase();
  if (!validateKeyFormat(cleanKey)) {
    return {
      ok: false,
      error: isDevMode()
        ? `Invalid license key format. Developer test key: ${DEV_TEST_KEY}`
        : 'Invalid license key format. Expected EKIT-XXXX-XXXX-XXXX.',
    };
  }

  const purchasedAt = new Date().toISOString();
  const entitlement = applyEntitlementRecord({
    plan: PLAN_IDS.PRO,
    licenseKey: cleanKey,
    purchasedAt,
    expiresAt: null,
    casePassStatus: 'none',
    updatesIncludedUntil: addMonths(purchasedAt, PRO_UPDATES_INCLUDED_MONTHS),
    updateRenewalStatus: 'included',
    purchasedVersion: APP_VERSION,
    migratedFromLegacy: false,
  });

  return { ok: true, entitlement };
}

/**
 * Test / internal helper: grant an active Case Pass window without Stripe.
 * Not exposed in production UI purchase flows.
 */
export function applyCasePassForTesting(purchasedAt = new Date().toISOString()) {
  return applyEntitlementRecord({
    plan: PLAN_IDS.CASE_PASS,
    licenseKey: null,
    purchasedAt,
    expiresAt: addDays(purchasedAt, CASE_PASS_DURATION_DAYS),
    casePassStatus: 'active',
    updatesIncludedUntil: null,
    updateRenewalStatus: 'none',
    purchasedVersion: APP_VERSION,
    migratedFromLegacy: false,
  });
}

/**
 * Clear entitlement and legacy license activation (local workstation only).
 */
export function clearEntitlement() {
  writeStored(emptyEntitlement());
  legacyDeactivateLicense();
  getWorkstationInfo();
}

/**
 * Whether updates/support window is still open (messaging only; does not gate Pro).
 */
export function areUpdatesIncluded(entitlement = getEntitlement()) {
  if (entitlement.plan !== PLAN_IDS.PRO && entitlement.plan !== PLAN_IDS.FIRM) return false;
  if (!entitlement.updatesIncludedUntil) return false;
  return new Date(entitlement.updatesIncludedUntil).getTime() > Date.now();
}

// Re-export workstation helpers for App convenience
export { getWorkstationInfo, validateKeyFormat };
