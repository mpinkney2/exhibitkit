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
    } catch {
      // Keep the minted license; the founder still receives the key to send manually.
      await updateLicenseEmailStatus(record.id, 'failed');
      emailStatus = 'failed';
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
  };
}
