/**
 * What this browser should say about the license on this device.
 * Display only. Never returns or stores a full license key or activation token.
 */

import { SUPPORT_EMAIL } from '../config/pricing.js';

export const DEVICE_LICENSE_STORAGE = 'exhibitkit_device_license_v1';

export const LICENSE_SENDER = 'licenses@patentpreppers.com';
export const BETA_INVITE_EMAIL_SUBJECT = 'Your ExhibitKIT Pro beta invitation';
export const PRO_LICENSE_EMAIL_SUBJECT = 'Your ExhibitKIT Pro license key';
export const RECOVERY_EMAIL_SUBJECT = 'Recover your ExhibitKIT license';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function maskLicenseEmail(email) {
  const value = cleanEmail(email);
  if (!value) return null;
  const at = value.indexOf('@');
  return `${value.slice(0, 1)}***@${value.slice(at + 1)}`;
}

export function cleanEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!value || value.length > 254 || !EMAIL_PATTERN.test(value)) return null;
  return value;
}

/** Last 4 letters or digits. Hyphens and bullets are ignored, so a full key never comes back. */
export function keyLast4From(value) {
  const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (compact.length < 4) return null;
  return compact.slice(-4);
}

export function shortTail(value, size = 4) {
  const compact = String(value || '').replace(/[^A-Za-z0-9]/g, '');
  if (compact.length < size) return null;
  return compact.slice(-size);
}

export function readDeviceSession(storage = localStorage) {
  try {
    const raw = storage.getItem(DEVICE_LICENSE_STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizeSession(parsed);
  } catch {
    return null;
  }
}

export function writeDeviceSession(session, storage = localStorage) {
  const clean = sanitizeSession(session);
  if (!clean) {
    storage.removeItem(DEVICE_LICENSE_STORAGE);
    return null;
  }
  storage.setItem(DEVICE_LICENSE_STORAGE, JSON.stringify(clean));
  return clean;
}

export function forgetDeviceLicense(storage = localStorage) {
  try {
    storage.removeItem(DEVICE_LICENSE_STORAGE);
  } catch {
    // Already gone.
  }
}

function sanitizeSession(session) {
  if (!session || typeof session !== 'object') return null;
  const keyLast4 = keyLast4From(session.keyLast4) || keyLast4From(session.licenseFingerprint);
  const email = cleanEmail(session.email);
  const plan = ['free', 'case_pass', 'pro_perpetual', 'firm'].includes(session.plan) ? session.plan : null;
  const source = session.source === 'beta' || session.source === 'stripe' ? session.source : null;
  const activatedAt = validIso(session.activatedAt);
  const lastValidatedAt = validIso(session.lastValidatedAt);
  const expiresAt = validIso(session.expiresAt);
  const activationIdShort = keyLast4From(session.activationIdShort) || (
    typeof session.activationIdShort === 'string' && /^[A-Za-z0-9]{4}$/.test(session.activationIdShort)
      ? session.activationIdShort
      : null
  );
  if (!keyLast4 && !email && !plan) return null;
  return {
    keyLast4,
    email,
    plan,
    source,
    activatedAt,
    expiresAt,
    lastValidatedAt,
    activationIdShort,
    fresh: Boolean(session.fresh),
    freshLoadId: typeof session.freshLoadId === 'string' ? session.freshLoadId.slice(0, 80) : null,
  };
}

function validIso(value) {
  if (typeof value !== 'string' || !value) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function snapshotFrom(input = {}) {
  return sanitizeSession({
    keyLast4: keyLast4From(input.keyLast4)
      || keyLast4From(input.licenseFingerprint)
      || keyLast4From(input.licenseKey),
    email: input.licenseEmail || input.email || null,
    plan: input.plan || null,
    source: input.licenseSource || input.source || null,
    expiresAt: input.expiresAt || null,
    activatedAt: input.activatedAt || null,
    lastValidatedAt: input.verifiedAt || input.lastValidatedAt || null,
    activationIdShort: input.activationIdShort || shortTail(input.activationToken, 4),
    fresh: input.fresh,
    freshLoadId: input.freshLoadId,
  });
}

export function hasStoredLicense(entitlement, session = null) {
  if (entitlement?.guestDemo || entitlement?.guestDemoExpired) return false;
  if (String(entitlement?.licenseKey || '').toUpperCase().startsWith('EKIT-GUEST-')) return false;
  const plan = entitlement?.plan || session?.plan;
  const paidPlan = plan === 'case_pass' || plan === 'pro_perpetual' || plan === 'firm';
  return Boolean(
    paidPlan
    || entitlement?.licenseFingerprint
    || entitlement?.licenseEmail
    || entitlement?.activationToken
    || session?.keyLast4
    || session?.email,
  );
}

/**
 * First paint of a document. A license already in storage is a previous
 * session. "Just now" survives only for the page load that activated it.
 */
export function ensureDeviceSession(entitlement, { loadId, now = new Date(), storage = localStorage } = {}) {
  let session = readDeviceSession(storage);
  if (!session && hasStoredLicense(entitlement)) {
    session = snapshotFrom({
      ...entitlement,
      activatedAt: entitlement?.verifiedAt || entitlement?.purchasedAt || now.toISOString(),
      fresh: false,
      freshLoadId: loadId || null,
      lastValidatedAt: entitlement?.verifiedAt || null,
    });
    return writeDeviceSession(session, storage);
  }
  if (!session) return null;
  const settled = settleSessionForLoad(session, loadId);
  if (settled !== session) return writeDeviceSession(settled, storage);
  return settled;
}

export function settleSessionForLoad(session, loadId) {
  if (!session?.fresh) return session;
  if (session.freshLoadId && session.freshLoadId === loadId) return session;
  return { ...session, fresh: false, freshLoadId: loadId || session.freshLoadId };
}

export function noteFreshActivation(input, { loadId, now = new Date(), storage = localStorage } = {}) {
  const previous = readDeviceSession(storage);
  const incoming = snapshotFrom(input);
  if (!incoming) return previous;
  const sameLicense = Boolean(previous?.keyLast4 && incoming.keyLast4 && previous.keyLast4 === incoming.keyLast4);
  const session = {
    ...incoming,
    activatedAt: sameLicense && previous?.activatedAt ? previous.activatedAt : now.toISOString(),
    lastValidatedAt: incoming.lastValidatedAt || now.toISOString(),
    fresh: true,
    freshLoadId: loadId || null,
  };
  return writeDeviceSession(session, storage);
}

export function noteLicenseChecked(input, { now = new Date(), storage = localStorage } = {}) {
  const previous = readDeviceSession(storage);
  const incoming = snapshotFrom({ ...previous, ...input, fresh: previous?.fresh, freshLoadId: previous?.freshLoadId });
  if (!incoming && !previous) return null;
  const session = {
    ...(previous || {}),
    ...(incoming || {}),
    activatedAt: previous?.activatedAt || incoming?.activatedAt || null,
    fresh: Boolean(previous?.fresh),
    freshLoadId: previous?.freshLoadId || null,
    lastValidatedAt: now.toISOString(),
  };
  return writeDeviceSession(session, storage);
}

export function formatLicenseDate(iso, { withTime = false } = {}) {
  const ms = Date.parse(iso || '');
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toLocaleString('en-US', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' });
}

export function sessionPhrase(session, formatDate = (iso) => formatLicenseDate(iso)) {
  if (!session?.activatedAt) return null;
  if (session.fresh) return 'Activated just now';
  const label = formatDate(session.activatedAt);
  return label ? `Activated on this device on ${label}` : 'Activated on this device';
}

export function planLabelFor(entitlement, session) {
  const source = entitlement?.licenseSource || session?.source;
  const plan = entitlement?.plan || session?.plan;
  if (!hasStoredLicense(entitlement, session) && !session?.keyLast4 && !session?.email) return 'Free';
  if (source === 'beta') return 'Beta';
  if (plan === 'case_pass') return 'Case Pass';
  if (plan === 'firm') return 'Firm';
  if (plan === 'pro_perpetual') return 'Pro';
  if (session?.email || session?.keyLast4) return 'Pro';
  return 'Free';
}

export function licenseStatusFor(entitlement, session, now = new Date()) {
  if (!hasStoredLicense(entitlement, session)) return 'Not activated';
  const source = entitlement?.licenseSource || session?.source;
  const plan = entitlement?.plan || session?.plan;
  const expiry = Date.parse(entitlement?.expiresAt || session?.expiresAt || '');
  const dated = plan === 'case_pass' || source === 'beta';
  const caseExpired = plan === 'case_pass' && entitlement?.casePassStatus === 'expired';
  if (caseExpired || (dated && Number.isFinite(expiry) && expiry <= now.getTime())) return 'Expired';
  return 'Active';
}

export const BROWSER_STORAGE_INFO = 'Saved in this browser’s local storage for this device only. ExhibitKit has no account password. This screen shows the last 4 characters of the key, never the full key. Removing the license signs out this device and does not delete the license.';

export function describeLicenseState({
  entitlement = null,
  session = null,
  workstationId = '',
  featuresActive = false,
  configurationMessage = null,
  now = new Date(),
  formatDate = formatLicenseDate,
} = {}) {
  const storedSession = session ? sanitizeSession(session) : null;
  const hasLicense = hasStoredLicense(entitlement, storedSession);
  const planLabel = hasLicense ? planLabelFor(entitlement, storedSession) : 'Free';
  const status = hasLicense ? licenseStatusFor(entitlement, storedSession, now) : 'Not activated';
  const email = cleanEmail(entitlement?.licenseEmail) || storedSession?.email || null;
  const maskedEmail = maskLicenseEmail(email);
  const keyLast4 = keyLast4From(entitlement?.licenseFingerprint)
    || keyLast4From(entitlement?.licenseKey)
    || storedSession?.keyLast4
    || null;
  const activationDate = storedSession?.activatedAt || null;
  const expiryDate = validIso(entitlement?.expiresAt) || storedSession?.expiresAt || null;
  const datedPlan = planLabel === 'Case Pass' || planLabel === 'Beta';
  const expiresLabel = datedPlan
    ? (formatDate(expiryDate) || 'Not recorded')
    : (hasLicense ? 'Does not expire' : '—');
  const deviceIdShort = shortTail(workstationId, 8);
  const activationIdShort = storedSession?.activationIdShort
    || shortTail(entitlement?.activationToken, 4)
    || null;
  const phrase = hasLicense ? sessionPhrase(storedSession, (iso) => formatDate(iso)) : null;
  const restoredFromPreviousSession = Boolean(hasLicense && storedSession && !storedSession.fresh);
  const summary = !hasLicense
    ? 'Free — no license on this device'
    : (maskedEmail
      ? `Signed in as ${planLabel} · ${status} · ${maskedEmail}`
      : `Signed in as ${planLabel} · ${status}`);

  return {
    hasLicense,
    planLabel,
    status,
    email,
    maskedEmail,
    keyLast4,
    activationDate,
    expiryDate,
    expiresLabel,
    deviceIdShort,
    activationIdShort,
    restoredFromPreviousSession,
    freshActivation: Boolean(storedSession?.fresh),
    sessionPhrase: phrase,
    storageInfo: BROWSER_STORAGE_INFO,
    lastValidatedAt: storedSession?.lastValidatedAt || validIso(entitlement?.verifiedAt),
    summary,
    featuresActive: Boolean(hasLicense && featuresActive && status === 'Active'),
    accessNote: hasLicense && status === 'Active' && !featuresActive
      ? 'Paid renaming is paused until this browser re-checks the license.'
      : null,
    configurationMessage: configurationMessage || null,
  };
}

export function decideLicenseReplacement(view, incomingKey) {
  if (!view?.hasLicense || view.status === 'Not activated') {
    return { needsConfirm: false, message: '' };
  }
  const incomingLast4 = keyLast4From(incomingKey);
  if (incomingLast4 && view.keyLast4 && incomingLast4 === view.keyLast4) {
    return { needsConfirm: false, message: '' };
  }
  const who = view.email || view.planLabel || 'another license';
  const ending = view.keyLast4 ? ` (ending ${view.keyLast4})` : '';
  return {
    needsConfirm: true,
    message: `This device already has a license for ${who}${ending}. Replace it with the new key?`,
  };
}

export function activationSuccessMessage(view) {
  const plan = view?.planLabel || 'License';
  const who = view?.email ? ` for ${view.email}` : '';
  return `${plan} is now active${who} on this device.`;
}

export function deviceRemovalPlan() {
  return {
    deletesServerLicense: false,
    releasesThisDeviceSeat: true,
    storageKeys: [DEVICE_LICENSE_STORAGE],
    confirmation: 'Remove the license from this browser? This signs out this device only. The license itself is not deleted and can be entered again.',
  };
}

export function lostKeyHelp(supportEmail = SUPPORT_EMAIL) {
  return {
    title: 'Lost your key?',
    supportEmail,
    sender: LICENSE_SENDER,
    paragraphs: [
      `License keys are emailed from ${LICENSE_SENDER}. A beta invitation uses the subject “${BETA_INVITE_EMAIL_SUBJECT}”. A purchased key uses the subject “${PRO_LICENSE_EMAIL_SUBJECT}”.`,
      'Search your inbox and spam for those messages. The key looks like EKIT-XXXX-XXXX-XXXX-XXXX.',
      `A recovery email, when one is sent, uses the subject “${RECOVERY_EMAIL_SUBJECT}”. If you still cannot find the key, contact ${supportEmail}.`,
    ],
  };
}

export function currentPageLoadId() {
  if (typeof window === 'undefined') return 'server';
  if (!window.__exhibitkitLicenseLoadId) {
    window.__exhibitkitLicenseLoadId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return window.__exhibitkitLicenseLoadId;
}
