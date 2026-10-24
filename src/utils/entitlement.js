/**
 * ExhibitKIT entitlement model.
 * States: free | case_pass | pro_perpetual | firm (future stub)
 *
 * Local cache is for UX only. Paid access requires an Ed25519 entitlement
 * token signed by the license service. The browser verifies that token on
 * every read. A missing or invalid token stays on the free tier.
 *
 * Offline use continues for 7 days after the token's signed issued-at time,
 * and never past the token expiry. Development builds may also honor a local
 * developerOverride for stage testing. That override is ignored outside DEV.
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
  validateKeyFormat,
  activateLicense as legacyActivateLicense,
  deactivateLicense as legacyDeactivateLicense,
  getWorkstationInfo,
  isDevMode,
  DEV_TEST_KEY,
  APP_VERSION,
} from './license.js';
import {
  GUEST_DEMO_COMING_SOON_MESSAGE,
  isGuestDemoKey,
} from './licenseFormat.js';
import {
  CONFIGURATION_MESSAGE,
  inspectEntitlementToken,
  isEntitlementTokenInForce,
  workstationClaimMatches,
} from './entitlementToken.js';

const ENTITLEMENT_STORAGE = 'exhibitkit_entitlement_v1';
const MIGRATION_FLAG = 'exhibitkit_entitlement_migrated_v1';

/**
 * Local stage overrides are a development convenience. They are never treated
 * as a purchase, and they are ignored outside DEV builds.
 */
function trustsDeveloperOverride(entitlement) {
  if (!entitlement?.developerOverride) return false;
  return isDevMode();
}

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
 * @property {boolean} serverVerified
 * @property {boolean} developerOverride
 * @property {string|null} activationToken
 * @property {string|null} entitlementToken
 * @property {string|null} verifiedAt
 * @property {string|null} licenseFingerprint
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
    serverVerified: false,
    developerOverride: false,
    activationToken: null,
    entitlementToken: null,
    verifiedAt: null,
    licenseFingerprint: null,
    guestDemo: false,
    guestLabel: null,
    guestDemoExpired: false,
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
 * Older builds stored a license flag in localStorage. That flag is not proof of
 * purchase, so it is not promoted to paid access. Idempotent.
 */
export function migrateLegacyLicenseIfNeeded() {
  if (typeof localStorage === 'undefined') return getEntitlement();

  const already = localStorage.getItem(MIGRATION_FLAG) === 'true';
  const existing = readStored();
  if (already && existing) {
    return effectiveEntitlement(normalizeEntitlement(existing));
  }

  if (!existing) {
    writeStored(emptyEntitlement());
  }
  localStorage.setItem(MIGRATION_FLAG, 'true');
  return getEntitlement();
}

function isClientGuestRecord(record) {
  if (!record) return false;
  if (record.guestDemo || record.guestDemoExpired) return true;
  return isGuestDemoKey(record.licenseKey || record.key);
}

function isPaidPlan(record) {
  return record?.plan === PLAN_IDS.PRO
    || record?.plan === PLAN_IDS.FIRM
    || record?.plan === PLAN_IDS.CASE_PASS;
}

/**
 * Signature-valid paid claims that are still inside the offline grace window,
 * the token expiry, and this workstation. The signed plan is authoritative.
 * A missing key or a signature the installation cannot check is not paid access.
 */
function verifiedPaidClaims(record) {
  if (!record?.entitlementToken || isClientGuestRecord(record)) return null;
  const inspection = inspectEntitlementToken(record.entitlementToken);
  if (inspection.status !== 'valid') return null;
  if (!isEntitlementTokenInForce(inspection.claims)) return null;
  if (!workstationClaimMatches(inspection.claims, getWorkstationInfo().deviceId)) return null;
  return inspection.claims;
}

function misconfiguredEntitlement(record) {
  return {
    ...emptyEntitlement(),
    activationToken: record?.activationToken || null,
    entitlementToken: record?.entitlementToken || null,
    licenseFingerprint: record?.licenseFingerprint || null,
    plan: PLAN_IDS.FREE,
    configurationStatus: 'misconfigured',
    configurationMessage: CONFIGURATION_MESSAGE,
  };
}

function projectVerifiedEntitlement(record, claims) {
  return normalizeEntitlement({
    ...record,
    plan: claims.plan,
    expiresAt: claims.plan === PLAN_IDS.CASE_PASS ? claims.expiry : record.expiresAt,
    serverVerified: true,
  });
}

/**
 * Paid access requires a currently valid signed entitlement, or a DEV-only
 * local override. Guest records and unsigned local claims stay on the free tier.
 */
function isTrustedPaidRecord(record) {
  if (!record || isClientGuestRecord(record)) return false;
  if (verifiedPaidClaims(record)) return true;
  return trustsDeveloperOverride(record);
}

function effectiveEntitlement(record) {
  const base = record || emptyEntitlement();
  if (isClientGuestRecord(base)) {
    return { ...emptyEntitlement(), demoNotice: GUEST_DEMO_COMING_SOON_MESSAGE };
  }
  if (base.entitlementToken && !trustsDeveloperOverride(base)) {
    const inspection = inspectEntitlementToken(base.entitlementToken);
    if (inspection.status === 'misconfigured') return misconfiguredEntitlement(base);
  }
  const claims = verifiedPaidClaims(base);
  if (claims) return projectVerifiedEntitlement(base, claims);
  if (isPaidPlan(base) && !trustsDeveloperOverride(base)) {
    return emptyEntitlement();
  }
  return base;
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
      if (base.guestDemo) base.guestDemoExpired = true;
    } else if (Number.isFinite(exp) && exp > now) {
      base.casePassStatus = 'active';
      if (base.guestDemo) base.guestDemoExpired = false;
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
  // Persist expiry flip so UI stays consistent. Do not persist the free-tier
  // view of an unsigned record; signature checks run at read time.
  if (stored.casePassStatus !== normalized.casePassStatus || stored.plan !== normalized.plan) {
    writeStored(normalized);
  }
  return effectiveEntitlement(normalized);
}

/**
 * True when Case Pass is currently within its 30-day window.
 */
export function isCasePassActive(entitlement = getEntitlement()) {
  const record = effectiveEntitlement(entitlement);
  if (record.plan !== PLAN_IDS.CASE_PASS) return false;
  if (!isTrustedPaidRecord(record)) return false;
  if (record.casePassStatus === 'payment_pending') return false;
  if (!record.expiresAt) return false;
  return new Date(record.expiresAt).getTime() > Date.now();
}

/**
 * Pro perpetual access never expires based on updatesIncludedUntil.
 */
export function isProPerpetual(entitlement = getEntitlement()) {
  return entitlement.plan === PLAN_IDS.PRO && hasPaidRenamingAccess(entitlement);
}

/**
 * Effective paid renaming access (Case Pass active OR Pro perpetual OR future Firm).
 * Expiration of updatesIncludedUntil must NEVER revert Pro to Free.
 */
export function hasPaidRenamingAccess(entitlement = getEntitlement()) {
  const record = effectiveEntitlement(entitlement);
  if (record.plan === PLAN_IDS.PRO || record.plan === PLAN_IDS.FIRM) {
    return isTrustedPaidRecord(record);
  }
  if (isCasePassActive(record)) return true;
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
  const record = effectiveEntitlement(entitlement);
  if (record.configurationStatus === 'misconfigured') return 'Unverified';
  if (record.plan === PLAN_IDS.PRO && hasPaidRenamingAccess(record)) return 'Pro';
  if (record.plan === PLAN_IDS.FIRM && hasPaidRenamingAccess(record)) return 'Firm';
  if (isCasePassActive(record)) return 'Case Pass';
  if (record.plan === PLAN_IDS.CASE_PASS && record.casePassStatus === 'expired') {
    return 'Free';
  }
  if (record.plan === PLAN_IDS.CASE_PASS && record.casePassStatus === 'payment_pending') {
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
  // during DEV stage testing. Production paid access comes from the signed token.
  if (
    next.plan === PLAN_IDS.PRO
    && next.licenseKey
    && trustsDeveloperOverride(next)
    && !isClientGuestRecord(next)
  ) {
    legacyActivateLicense(next.licenseKey, 'pro_perpetual');
  }

  return effectiveEntitlement(next);
}

export { GUEST_DEMO_COMING_SOON_MESSAGE, isGuestDemoKey };

/**
 * Restore access via a server-verified license key.
 * The developer test key remains local and DEV-only.
 *
 * @param {string} key
 * @returns {Promise<{ ok: boolean, entitlement?: EntitlementRecord, error?: string, code?: string, needsTransfer?: boolean }>}
 */
export async function restoreFromLicenseKey(key, options = {}) {
  const cleanKey = (key || '').trim().toUpperCase();
  if (isGuestDemoKey(cleanKey)) {
    return {
      ok: false,
      code: 'DEMO_COMING_SOON',
      notice: GUEST_DEMO_COMING_SOON_MESSAGE,
      entitlement: getEntitlement(),
    };
  }

  if (!validateKeyFormat(cleanKey)) {
    return {
      ok: false,
      error: isDevMode()
        ? `Invalid license key format. Developer test key: ${DEV_TEST_KEY}`
        : 'Invalid license key format. Expected an ExhibitKIT key from your purchase email.',
    };
  }

  if (isDevMode() && cleanKey === DEV_TEST_KEY) {
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
      developerOverride: true,
    });
    return { ok: true, entitlement };
  }

  const workstationId = options.workstationId || getWorkstationInfo().deviceId;
  const endpoint = options.confirmTransfer ? 'transfer' : 'activate';

  try {
    const response = await fetch(getLicenseApiUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: cleanKey,
        workstationId,
        appVersion: APP_VERSION,
        ...(options.confirmTransfer ? { confirmTransfer: true } : {}),
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok || !data.entitlement) {
      return {
        ok: false,
        code: data.code || 'ACTIVATION_FAILED',
        needsTransfer: data.code === 'WORKSTATION_LIMIT',
        error: data.error || 'That license key could not be verified.',
      };
    }

    const entitlement = applyEntitlementRecord(data.entitlement);
    return { ok: true, entitlement };
  } catch {
    return {
      ok: false,
      code: 'SERVICE_UNAVAILABLE',
      error: 'ExhibitKIT could not reach the license service. Check your connection and try again.',
    };
  }
}

function getLicenseApiUrl(path) {
  const base = (import.meta.env?.VITE_LICENSE_API_URL || '/api/license').replace(/\/$/, '');
  return `${base}/${path}`;
}

export async function requestLicenseRecovery(email) {
  try {
    const response = await fetch(getLicenseApiUrl('recover'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: String(email || '').trim() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: data.error || 'License recovery is temporarily unavailable.' };
    }
    return { ok: true, message: data.message };
  } catch {
    return { ok: false, error: 'ExhibitKIT could not reach the license service.' };
  }
}

export async function refreshVerifiedEntitlementStatus(entitlement = readStored() || emptyEntitlement()) {
  const stored = entitlement || readStored() || emptyEntitlement();
  if (trustsDeveloperOverride(stored) && !isClientGuestRecord(stored)) {
    return { ok: true, entitlement: effectiveEntitlement(stored) };
  }
  if (!stored.activationToken) {
    // Do not wipe local DEV/test records or Free — only reconcile server seats.
    return { ok: false, invalid: false, entitlement: effectiveEntitlement(stored) };
  }

  try {
    const response = await fetch(getLicenseApiUrl('status'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activationToken: stored.activationToken,
        workstationId: getWorkstationInfo().deviceId,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status >= 500) {
      return { ok: false, offline: true, entitlement: effectiveEntitlement(stored) };
    }
    // A revoked seat is the only response that drops the local activation.
    // 403, 429, other 4xx, and a 200 without a token are transient.
    if (response.status === 401 && data.active === false) {
      return { ok: false, invalid: true, entitlement: effectiveEntitlement(stored) };
    }
    if (!response.ok || !data.active || !data.entitlement?.entitlementToken) {
      return { ok: false, offline: true, entitlement: effectiveEntitlement(stored) };
    }
    const incomingToken = data.entitlement.entitlementToken;
    const inspection = inspectEntitlementToken(incomingToken);
    if (inspection.status === 'misconfigured') {
      return {
        ok: false,
        invalid: false,
        misconfigured: true,
        entitlement: misconfiguredEntitlement(stored),
      };
    }
    if (inspection.status !== 'valid' || !isEntitlementTokenInForce(inspection.claims)) {
      return { ok: false, invalid: false, entitlement: effectiveEntitlement(stored) };
    }
    if (!workstationClaimMatches(inspection.claims, getWorkstationInfo().deviceId)) {
      return { ok: false, invalid: false, entitlement: effectiveEntitlement(stored) };
    }
    const refreshed = applyEntitlementRecord(data.entitlement);
    return { ok: true, entitlement: refreshed };
  } catch {
    // A network outage keeps a signed entitlement only for the offline grace
    // window, and never past the token expiry. The next status check reconciles it.
    return { ok: false, offline: true, entitlement: effectiveEntitlement(stored) };
  }
}

export async function deactivateCurrentWorkstation(entitlement = readStored() || emptyEntitlement()) {
  const stored = entitlement?.activationToken
    ? entitlement
    : (readStored() || entitlement || emptyEntitlement());
  if (stored.activationToken) {
    try {
      await fetch(getLicenseApiUrl('deactivate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activationToken: stored.activationToken,
          workstationId: getWorkstationInfo().deviceId,
        }),
      });
    } catch {
      return { ok: false, offline: true };
    }
  }
  return { ok: true };
}

/**
 * Test / founder helper: grant an active Case Pass window without Stripe.
 * Not exposed in customer purchase flows.
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
    developerOverride: true,
  });
}

/**
 * Founder helper: Case Pass already expired (Pro features off; Free limits apply).
 */
export function applyExpiredCasePassForTesting() {
  const purchasedAt = new Date(Date.now() - (CASE_PASS_DURATION_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();
  return applyEntitlementRecord({
    plan: PLAN_IDS.CASE_PASS,
    licenseKey: null,
    purchasedAt,
    expiresAt: addDays(purchasedAt, CASE_PASS_DURATION_DAYS),
    casePassStatus: 'expired',
    updatesIncludedUntil: null,
    updateRenewalStatus: 'none',
    purchasedVersion: APP_VERSION,
    migratedFromLegacy: false,
    developerOverride: true,
  });
}

/**
 * Founder helper: payment pending Case Pass (no Pro features yet).
 */
export function applyPendingCasePassForTesting() {
  const purchasedAt = new Date().toISOString();
  return applyEntitlementRecord({
    plan: PLAN_IDS.CASE_PASS,
    licenseKey: null,
    purchasedAt,
    expiresAt: addDays(purchasedAt, CASE_PASS_DURATION_DAYS),
    casePassStatus: 'payment_pending',
    updatesIncludedUntil: null,
    updateRenewalStatus: 'none',
    purchasedVersion: APP_VERSION,
    migratedFromLegacy: false,
    developerOverride: true,
  });
}

/**
 * Founder helper: Pro perpetual access.
 * @param {{ updatesLapsed?: boolean }} [options]
 */
export function applyProForTesting(options = {}) {
  const purchasedAt = options.updatesLapsed
    ? new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString()
    : new Date().toISOString();
  const updatesIncludedUntil = options.updatesLapsed
    ? new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    : addMonths(purchasedAt, PRO_UPDATES_INCLUDED_MONTHS);

  return applyEntitlementRecord({
    plan: PLAN_IDS.PRO,
    licenseKey: 'EKIT-FNDR-TEST-PRO1',
    purchasedAt,
    expiresAt: null,
    casePassStatus: 'none',
    updatesIncludedUntil,
    updateRenewalStatus: options.updatesLapsed ? 'lapsed' : 'included',
    purchasedVersion: APP_VERSION,
    migratedFromLegacy: false,
    developerOverride: true,
    serverVerified: false,
  });
}

/**
 * Founder helper: one-click unlimited Pro renaming for local development.
 * Outside DEV this record stays on the free tier.
 */
export function applyFounderUnlimitedPro() {
  return applyProForTesting({ updatesLapsed: false });
}

/**
 * How a status refresh should update the workstation.
 * Only a 401 with active:false clears the stored activation. Other errors
 * keep it for the offline grace window. A local verification failure keeps
 * it and surfaces a misconfigured state.
 */
export function settleLicenseRefresh(result) {
  if (result?.invalid) return { clear: true, entitlement: null };
  if (result?.misconfigured) return { clear: false, entitlement: result.entitlement || null };
  if (result?.ok && result.entitlement) return { clear: false, entitlement: result.entitlement };
  return { clear: false, entitlement: null };
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
