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
  findActiveBetaLicense,
  insertBetaLicense,
  updateLicenseEmailStatus,
} from './license-repository.js';
import { sendBetaInviteEmail } from './license-email.js';
import { HttpError } from './http.js';

export const DEFAULT_BETA_DAYS = 30;
export const MIN_BETA_DAYS = 1;
export const MAX_BETA_DAYS = 180;
export const MAX_INVITES_PER_BATCH = 50;

/**
 * Bulk duplicate policy:
 * - The paste is split on commas, semicolons, and newlines.
 * - Addresses are trimmed and compared case-insensitively. Repeats in one
 *   paste are removed. Only the first is invited. `duplicatesRemoved` counts them.
 * - An address that already has an active, unexpired beta license is not
 *   minted again. The result status is `already_active`. A beta that has
 *   expired, or a license that is revoked, can be invited again.
 * - Addresses that are not emails are returned as `invalid` and are not minted.
 * - After dedupe, more than MAX_INVITES_PER_BATCH addresses is rejected and
 *   nothing is minted.
 * - One shared day count (clamped to 1–180) and one optional note apply to
 *   every address. Bulk invites do not take a per-address name.
 */

// Non-Stripe origin marker used for the required unique session id + price id.
const BETA_PRICE_SENTINEL = 'beta-invite';

function clampDays(value) {
  const days = Number(value);
  if (!Number.isFinite(days)) return DEFAULT_BETA_DAYS;
  return Math.max(MIN_BETA_DAYS, Math.min(MAX_BETA_DAYS, Math.round(days)));
}

export function parseInviteList(input) {
  const raw = Array.isArray(input) ? input.join('\n') : String(input || '');
  const pieces = raw.split(/[,;\n\r]+/).map((part) => part.trim()).filter(Boolean);
  const seen = new Set();
  let duplicatesRemoved = 0;
  const addresses = [];
  for (const piece of pieces) {
    const normalized = normalizeEmail(piece);
    const valid = isEmailFormat(normalized);
    const key = valid ? normalized : `invalid:${piece.toLowerCase()}`;
    if (seen.has(key)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(key);
    addresses.push({
      input: piece,
      email: valid ? normalized : null,
      valid,
    });
  }
  return { addresses, duplicatesRemoved };
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

function publicInviteResult(invite) {
  return {
    email: invite.email,
    status: invite.emailStatus === 'failed' ? 'email_failed' : invite.emailStatus,
    key: invite.key,
    fingerprint: invite.fingerprint,
    expiresAt: invite.expiresAt,
    days: invite.days,
    emailStatus: invite.emailStatus,
    ...(invite.emailError ? { emailError: invite.emailError } : {}),
  };
}

/**
 * Mint beta invites for a pasted list. `reserveMint` returns false when the
 * founder mint budget for this hour is used up. Invalid addresses and
 * addresses that already have an active beta do not consume that budget.
 *
 * @param {{ emails: string | string[], days?: number, note?: string, invitedBy?: string, reserveMint?: () => Promise<boolean> }} params
 */
export async function createBetaInvites({
  emails,
  days = DEFAULT_BETA_DAYS,
  note,
  invitedBy = 'founder',
  reserveMint,
} = {}) {
  const parsed = parseInviteList(emails);
  if (parsed.addresses.length === 0) {
    throw new HttpError(400, 'Enter at least one email address.', 'INVALID_EMAIL');
  }
  if (parsed.addresses.length > MAX_INVITES_PER_BATCH) {
    throw new HttpError(
      400,
      `A batch can include up to ${MAX_INVITES_PER_BATCH} addresses after duplicates are removed. Split the list and send again.`,
      'BATCH_TOO_LARGE',
    );
  }

  const betaDays = clampDays(days);
  const results = [];
  let budgetSpent = false;

  for (const address of parsed.addresses) {
    if (!address.valid) {
      results.push({ email: address.input, status: 'invalid' });
      continue;
    }
    if (budgetSpent) {
      results.push({ email: address.email, status: 'rate_limited' });
      continue;
    }

    const existing = await findActiveBetaLicense(hashEmail(address.email));
    if (existing) {
      results.push({
        email: address.email,
        status: 'already_active',
        expiresAt: existing.expires_at ? new Date(existing.expires_at).toISOString() : null,
      });
      continue;
    }

    if (reserveMint) {
      const allowed = await reserveMint();
      if (!allowed) {
        budgetSpent = true;
        results.push({ email: address.email, status: 'rate_limited' });
        continue;
      }
    }

    const invite = await createBetaInvite({
      email: address.email,
      days: betaDays,
      note,
      invitedBy,
    });
    results.push(publicInviteResult(invite));
  }

  return {
    days: betaDays,
    duplicatesRemoved: parsed.duplicatesRemoved,
    results,
  };
}
