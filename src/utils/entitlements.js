/**
 * Entitlement model for Free, Case Pass, Guest Demo, and Pro perpetual licenses.
 * Stored locally as billing/license metadata only — never evidence content.
 */

import {
  validateKeyFormat,
  isDevMode,
  DEV_TEST_KEY,
  GUEST_DEMO_KEY,
} from './licenseFormat';

const ENTITLEMENT_STORAGE = 'exhibitkit_entitlement_v2';
const CASE_PASS_DAYS = 30;
const GUEST_DEMO_DAYS = 10;
const PRO_UPDATE_DAYS = 365;

export const TIERS = Object.freeze({
  FREE: 'free',
  CASE_PASS: 'case_pass',
  GUEST_DEMO: 'guest_demo',
  PRO_PERPETUAL: 'pro_perpetual',
  FIRM: 'firm',
});

export function createFreeEntitlement() {
  return {
    tier: TIERS.FREE,
    key: null,
    purchasedAt: null,
    expiresAt: null,
    updatesUntil: null,
    guestLabel: null,
  };
}

export function readEntitlement() {
  try {
    const raw = localStorage.getItem(ENTITLEMENT_STORAGE);
    if (!raw) return createFreeEntitlement();
    const parsed = JSON.parse(raw);
    return normalizeEntitlement(parsed);
  } catch {
    return createFreeEntitlement();
  }
}

export function writeEntitlement(entitlement) {
  const normalized = normalizeEntitlement(entitlement);
  localStorage.setItem(ENTITLEMENT_STORAGE, JSON.stringify(normalized));
  return normalized;
}

export function clearEntitlement() {
  localStorage.removeItem(ENTITLEMENT_STORAGE);
  return createFreeEntitlement();
}

export function normalizeEntitlement(input = {}) {
  const tier = Object.values(TIERS).includes(input.tier) ? input.tier : TIERS.FREE;
  return {
    tier,
    key: input.key || null,
    purchasedAt: input.purchasedAt || null,
    expiresAt: input.expiresAt || null,
    updatesUntil: input.updatesUntil || null,
    guestLabel: input.guestLabel || null,
  };
}

function isTimedTier(tier) {
  return tier === TIERS.CASE_PASS || tier === TIERS.GUEST_DEMO;
}

/**
 * Effective access after applying Case Pass / Guest Demo expiration.
 * Expiration never deletes local files — it only removes Pro generation for new work.
 */
export function getEffectiveEntitlement(now = new Date(), entitlement = readEntitlement()) {
  const current = normalizeEntitlement(entitlement);
  if (isTimedTier(current.tier)) {
    if (!current.expiresAt || new Date(current.expiresAt).getTime() <= now.getTime()) {
      return {
        ...current,
        tier: TIERS.FREE,
        expiredCasePass: current.tier === TIERS.CASE_PASS,
        expiredGuestDemo: current.tier === TIERS.GUEST_DEMO,
        casePassExpiredAt: current.tier === TIERS.CASE_PASS ? current.expiresAt : null,
        guestDemoExpiredAt: current.tier === TIERS.GUEST_DEMO ? current.expiresAt : null,
      };
    }
  }
  return {
    ...current,
    expiredCasePass: false,
    expiredGuestDemo: false,
  };
}

export function hasProFeatures(now = new Date(), entitlement = readEntitlement()) {
  const effective = getEffectiveEntitlement(now, entitlement);
  return (
    effective.tier === TIERS.PRO_PERPETUAL ||
    effective.tier === TIERS.CASE_PASS ||
    effective.tier === TIERS.GUEST_DEMO ||
    effective.tier === TIERS.FIRM
  );
}

/** Perpetual license remains usable after the included update window. */
export function hasActiveUpdateCoverage(now = new Date(), entitlement = readEntitlement()) {
  const effective = getEffectiveEntitlement(now, entitlement);
  if (effective.tier !== TIERS.PRO_PERPETUAL && effective.tier !== TIERS.FIRM) return false;
  if (!effective.updatesUntil) return false;
  return new Date(effective.updatesUntil).getTime() > now.getTime();
}

export function canUseMultiExhibit(now = new Date(), entitlement = readEntitlement()) {
  return hasProFeatures(now, entitlement);
}

export function canExportBinder(now = new Date(), entitlement = readEntitlement()) {
  return hasProFeatures(now, entitlement);
}

export function canExportZipPackage(now = new Date(), entitlement = readEntitlement()) {
  return hasProFeatures(now, entitlement);
}

export function activateCasePass(key, purchasedAt = new Date()) {
  const cleanKey = (key || '').trim().toUpperCase();
  if (!isActivatableKey(cleanKey, TIERS.CASE_PASS)) return null;
  const start = new Date(purchasedAt);
  const expires = new Date(start.getTime() + CASE_PASS_DAYS * 24 * 60 * 60 * 1000);
  return writeEntitlement({
    tier: TIERS.CASE_PASS,
    key: cleanKey,
    purchasedAt: start.toISOString(),
    expiresAt: expires.toISOString(),
    updatesUntil: null,
    guestLabel: null,
  });
}

export function activateGuestDemo(key, purchasedAt = new Date(), guestLabel = 'Law Firm Guest') {
  const cleanKey = (key || '').trim().toUpperCase();
  if (!isActivatableKey(cleanKey, TIERS.GUEST_DEMO)) return null;
  const start = new Date(purchasedAt);
  const expires = new Date(start.getTime() + GUEST_DEMO_DAYS * 24 * 60 * 60 * 1000);
  return writeEntitlement({
    tier: TIERS.GUEST_DEMO,
    key: cleanKey,
    purchasedAt: start.toISOString(),
    expiresAt: expires.toISOString(),
    updatesUntil: null,
    guestLabel,
  });
}

export function activateProPerpetual(key, purchasedAt = new Date()) {
  const cleanKey = (key || '').trim().toUpperCase();
  if (!isActivatableKey(cleanKey, TIERS.PRO_PERPETUAL)) return null;
  const start = new Date(purchasedAt);
  const updatesUntil = new Date(start.getTime() + PRO_UPDATE_DAYS * 24 * 60 * 60 * 1000);
  return writeEntitlement({
    tier: TIERS.PRO_PERPETUAL,
    key: cleanKey,
    purchasedAt: start.toISOString(),
    expiresAt: null,
    updatesUntil: updatesUntil.toISOString(),
    guestLabel: null,
  });
}

/**
 * Activate from a license key.
 * Guest: EKIT-GUEST-XXXX-XXXX (10 days)
 * Case Pass: EKIT-CASE-XXXX-XXXX (30 days)
 * Pro: EKIT-XXXX-XXXX-XXXX
 */
export function activateFromKey(key, options = {}) {
  const cleanKey = (key || '').trim().toUpperCase();
  const forcedTier = options.tier;
  const purchasedAt = options.purchasedAt ? new Date(options.purchasedAt) : new Date();

  if (
    forcedTier === TIERS.GUEST_DEMO ||
    cleanKey.startsWith('EKIT-GUEST-') ||
    cleanKey === GUEST_DEMO_KEY
  ) {
    return activateGuestDemo(cleanKey, purchasedAt, options.guestLabel || 'Law Firm Guest');
  }
  if (forcedTier === TIERS.CASE_PASS || cleanKey.startsWith('EKIT-CASE-')) {
    return activateCasePass(cleanKey, purchasedAt);
  }
  return activateProPerpetual(cleanKey, purchasedAt);
}

function isActivatableKey(cleanKey, tier) {
  if (isDevMode() && cleanKey === DEV_TEST_KEY) return true;
  if (isDevMode() && cleanKey === 'EKIT-CASE-TEST-0001') return true;
  if (isDevMode() && cleanKey === 'EKIT-GUEST-TEST-0001') return true;
  if (tier === TIERS.GUEST_DEMO) {
    return /^EKIT-GUEST-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanKey) || cleanKey === GUEST_DEMO_KEY;
  }
  if (tier === TIERS.CASE_PASS) {
    return /^EKIT-CASE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanKey);
  }
  return validateKeyFormat(cleanKey);
}

/** Test helper: force an entitlement for controlled clocks. */
export function __setEntitlementForTests(entitlement) {
  return writeEntitlement(entitlement);
}

export const CASE_PASS_DURATION_DAYS = CASE_PASS_DAYS;
export const GUEST_DEMO_DURATION_DAYS = GUEST_DEMO_DAYS;
export const PRO_UPDATE_DURATION_DAYS = PRO_UPDATE_DAYS;
