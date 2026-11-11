import { randomUUID } from 'node:crypto';
import {
  encryptLicenseKey,
  generateLicenseKey,
  hashEmail,
  hashLicenseKey,
  isEmailFormat,
  licenseFingerprint,
  normalizeEmail,
} from './license-crypto.js';
import {
  insertBetaLicense,
  updateLicenseEmailStatus,
} from './license-repository.js';
import { sendBetaInviteEmail } from './license-email.js';
import { HttpError } from './http.js';

export const DEFAULT_BETA_DAYS = 30;
export const MIN_BETA_DAYS = 1;
export const MAX_BETA_DAYS = 180;

// Non-Stripe origin marker used for the required unique session id + price id.
const BETA_PRICE_SENTINEL = 'beta-invite';

function clampDays(value) {
  const days = Number(value);
  if (!Number.isFinite(days)) return DEFAULT_BETA_DAYS;
  return Math.max(MIN_BETA_DAYS, Math.min(MAX_BETA_DAYS, Math.round(days)));
}

function cleanText(value, maxLength) {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : null;
}

function addDays(isoDate, days) {
  const next = new Date(isoDate);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

const DIAGNOSTIC_MESSAGE_LIMIT = 300;
const PROVIDER_NAME = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

function safeProviderName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!PROVIDER_NAME.test(name) || /^re_/i.test(name)) return 'provider_error';
  return name;
}

function safeStatusCode(value) {
  return Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;
}

function secretLiterals(values) {
  return values
    .filter((value) => typeof value === 'string' && value.length >= 4)
    .sort((left, right) => right.length - left.length);
}

// Strip values that must never appear in logs, then cap the length. Redact
// before truncating so a value split by the cap cannot survive as a fragment.
function redactDiagnosticMessage(message, literals) {
  let text = typeof message === 'string' ? message : '';
  for (const secret of secretLiterals(literals)) {
    if (text.includes(secret)) text = text.split(secret).join('[redacted]');
  }
  text = text
    .replace(/\b(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key)\s*[:=][^\n]*/gi, '[redacted]')
    .replace(/\bbearer\s+\S+/gi, '[redacted]')
    .replace(/\bre_[A-Za-z0-9_-]+/gi, '[redacted]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted]')
    .replace(/\bEKIT-(?:[A-Z0-9]{4}-){2,3}[A-Z0-9]{4}\b/gi, '[redacted]');
  return text.length > DIAGNOSTIC_MESSAGE_LIMIT
    ? text.slice(0, DIAGNOSTIC_MESSAGE_LIMIT)
    : text;
}

function emailFailureLog(error, context) {
  const message = typeof error?.message === 'string'
    ? error.message
    : (typeof error === 'string' ? error : '');
  return {
    name: safeProviderName(error?.name),
    message: redactDiagnosticMessage(message, [
      process.env.RESEND_API_KEY,
      process.env.LICENSE_EMAIL_FROM,
      context.recipient,
      context.licenseKey,
      context.licenseId,
    ]),
    statusCode: safeStatusCode(error?.statusCode),
  };
}

/**
 * Mint a real, server-verified time-limited Pro license for a beta tester and
 * email the key. Reuses the same crypto, storage, and activation pipeline as
 * Stripe fulfillment, so the tester activates through the normal license flow.
 *
 * The plaintext key is returned to the (already authenticated) caller so the
 * founder can also deliver credentials manually. A delivery failure does not
 * discard the license — it is returned with emailStatus: 'failed'.
 *
 * @param {{ email: string, days?: number, invitedBy?: string, name?: string, note?: string }} params
 */
export async function createBetaInvite({
  email,
  days = DEFAULT_BETA_DAYS,
  invitedBy = 'founder',
  name,
  note,
} = {}) {
  const customerEmail = normalizeEmail(email);
  if (!isEmailFormat(customerEmail)) {
    throw new HttpError(400, 'Enter a valid tester email address.', 'INVALID_EMAIL');
  }

  const betaDays = clampDays(days);
  const purchasedAt = new Date().toISOString();
  const expiresAt = addDays(purchasedAt, betaDays);
  const licenseKey = generateLicenseKey();

  const record = await insertBetaLicense({
    licenseKeyHash: hashLicenseKey(licenseKey),
    licenseKeyCiphertext: encryptLicenseKey(licenseKey),
    licenseFingerprint: licenseFingerprint(licenseKey),
    customerEmail,
    customerEmailHash: hashEmail(customerEmail),
    checkoutSessionId: `beta-invite-${randomUUID()}`,
    priceId: BETA_PRICE_SENTINEL,
    plan: 'pro_perpetual',
    maxActivations: 1,
    purchasedAt,
    expiresAt,
    updatesIncludedUntil: expiresAt,
    purchasedVersion: process.env.EXHIBITKIT_VERSION || 'v0.10.0',
    source: 'beta',
    inviteeName: cleanText(name, 120),
    inviteNote: cleanText(note, 500),
    invitedBy: cleanText(invitedBy, 120) || 'founder',
  });

  // Email is optional: when Resend is not configured, the license is still
  // minted and the key is returned so the founder can deliver it manually.
  const emailConfigured = Boolean(
    String(process.env.RESEND_API_KEY || '').trim()
    && String(process.env.LICENSE_EMAIL_FROM || '').trim(),
  );

  let emailStatus;
  let emailError;
  if (!emailConfigured) {
    emailStatus = 'skipped';
  } else {
    try {
      const providerId = await sendBetaInviteEmail({
        to: record.customer_email,
        licenseKey,
        expiresAt: record.expires_at,
        licenseId: record.id,
      });
      await updateLicenseEmailStatus(record.id, 'sent', providerId);
      emailStatus = 'sent';
    } catch (error) {
      // Keep the minted license; the founder still receives the key to send manually.
      const diagnostic = emailFailureLog(error, {
        recipient: record.customer_email,
        licenseKey,
        licenseId: record.id,
      });
      console.error('[beta-invite] email send failed', diagnostic);
      await updateLicenseEmailStatus(record.id, 'failed');
      emailStatus = 'failed';
      emailError = { name: diagnostic.name, statusCode: diagnostic.statusCode };
    }
  }

  return {
    licenseId: record.id,
    key: licenseKey,
    fingerprint: record.license_fingerprint,
    email: record.customer_email,
    expiresAt: new Date(record.expires_at).toISOString(),
    days: betaDays,
    emailStatus,
    ...(emailError ? { emailError } : {}),
  };
}
