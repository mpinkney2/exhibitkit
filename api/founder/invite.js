import { safeEqual } from '../_lib/license-crypto.js';
import { configuredFounderSecret } from '../_lib/founder-secret.js';
import { assertRateLimitConfigured, consumeRateLimit } from '../_lib/rate-limit.js';
import {
  errorResponse,
  getClientIp,
  isAllowedBrowserOrigin,
  json,
  methodNotAllowed,
  readJson,
  HttpError,
} from '../_lib/http.js';
import { createBetaInvite, createBetaInvites } from '../_lib/beta-invite-service.js';

/** Requests per IP per hour, counted before the secret is checked. */
export const FOUNDER_INVITE_REQUESTS_PER_HOUR = 30;
/** Mints per hour for an authenticated bulk send. Invalid and already-active addresses do not count. */
export const FOUNDER_INVITE_MINTS_PER_HOUR = 200;

/** Server settings the beta-invite pipeline needs to mint a license (DB + license
 *  crypto). Email delivery (RESEND_API_KEY, LICENSE_EMAIL_FROM) is optional — when
 *  it is not configured, the key is still minted and returned for manual delivery. */
const REQUIRED_BACKEND_ENV = [
  'DATABASE_URL',
  'LICENSE_HASH_SECRET',
  'LICENSE_ENCRYPTION_KEY',
];

function missingBackendConfig() {
  return REQUIRED_BACKEND_ENV.filter((name) => !String(process.env[name] || '').trim());
}

const PROVIDER_NAME = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

// Founder-facing delivery failure: provider name and HTTP status only.
function publicEmailError(value) {
  if (!value || typeof value !== 'object') return null;
  const rawName = typeof value.name === 'string' ? value.name.trim() : '';
  const name = PROVIDER_NAME.test(rawName) && !/^re_/i.test(rawName)
    ? rawName
    : 'provider_error';
  const statusCode = Number.isInteger(value.statusCode)
    && value.statusCode >= 100
    && value.statusCode <= 599
    ? value.statusCode
    : null;
  return { name, statusCode };
}

/**
 * Map a low-level failure to a safe, actionable founder-facing error where we
 * can recognize it (e.g. the beta-invite migration has not been applied).
 */
function actionableConfigError(error) {
  const message = String(error?.message || '');
  if (/does not exist/i.test(message)
    && /(source|invitee_name|invite_note|invited_by|exhibitkit_licenses)/i.test(message)) {
    return new HttpError(
      503,
      'The licensing database is missing the beta-invite migration. Run "npm run db:migrate" against this environment\'s database.',
      'INVITE_DB_MIGRATION_REQUIRED',
    );
  }
  return null;
}

function isBulkInvite(body) {
  if (Array.isArray(body?.emails) && body.emails.length > 0) return true;
  return typeof body?.list === 'string' && body.list.trim().length > 0;
}

function publicBulkResults(results) {
  return (results || []).map((result) => {
    const emailError = publicEmailError(result.emailError);
    const next = { ...result };
    delete next.emailError;
    delete next.licenseId;
    if (emailError) next.emailError = emailError;
    return next;
  });
}

/**
 * POST /api/founder/invite
 * Single: { secret, email, name?, note?, days? }
 * Bulk:   { secret, emails: string[] | list: string, note?, days? }
 *
 * Founder-only. Validates the server-only FOUNDER_ADMIN_SECRET (same secret as
 * /api/founder/unlock), then mints a real, server-verified time-limited Pro
 * license and emails the key to a beta tester. The plaintext key is returned to
 * the authenticated founder so credentials can also be delivered manually.
 *
 * Bulk sends share one day count and one optional note. See createBetaInvites
 * for how duplicates, invalid addresses, and an existing active beta are reported.
 * Each HTTP request counts against 30 requests/hour/IP before the secret is
 * checked. After the secret checks out, each minted address in a bulk send
 * counts against 200 mints/hour. Addresses past that budget are returned as
 * rate_limited and are not minted.
 *
 * When a required dependency is missing, an authenticated founder gets a
 * specific, actionable message rather than a generic failure.
 */
export default {
  async fetch(request) {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    if (!isAllowedBrowserOrigin(request)) {
      return json({ ok: false, error: 'Request origin is not allowed.' }, 403);
    }

    try {
      const expected = configuredFounderSecret();
      if (!expected) {
        throw new HttpError(
          503,
          'Founder admin is not configured on the server.',
          'FOUNDER_NOT_CONFIGURED',
        );
      }

      assertRateLimitConfigured();
      const ip = getClientIp(request);
      const allowed = await consumeRateLimit('founder_invite_ip', ip, FOUNDER_INVITE_REQUESTS_PER_HOUR, 3600);
      if (!allowed) {
        return json(
          { ok: false, error: 'Too many invitations. Try again later.', code: 'RATE_LIMITED' },
          429,
          { 'retry-after': '3600' },
        );
      }

      const body = await readJson(request, 32_768);
      const candidate = String(body.secret || '').trim();
      if (!candidate || !safeEqual(candidate, expected)) {
        throw new HttpError(401, 'Incorrect founder secret.', 'FOUNDER_DENIED');
      }

      const missing = missingBackendConfig();
      if (missing.length > 0) {
        throw new HttpError(
          503,
          `Beta invites are not configured on the server. Missing: ${missing.join(', ')}.`,
          'INVITE_BACKEND_NOT_CONFIGURED',
        );
      }

      if (isBulkInvite(body)) {
        let outcome;
        try {
          outcome = await createBetaInvites({
            emails: Array.isArray(body.emails) ? body.emails : body.list,
            days: body.days,
            note: body.note,
            invitedBy: 'founder',
            reserveMint: () => consumeRateLimit('founder_invite_mint', 'founder', FOUNDER_INVITE_MINTS_PER_HOUR, 3600),
          });
        } catch (error) {
          const mapped = actionableConfigError(error);
          if (mapped) throw mapped;
          throw error;
        }

        const results = publicBulkResults(outcome.results);
        const minted = results.some((result) => (
          result.status === 'sent' || result.status === 'skipped' || result.status === 'email_failed'
        ));
        const rateLimited = results.some((result) => result.status === 'rate_limited');
        if (rateLimited && !minted) {
          return json(
            {
              ok: false,
              error: 'Too many invitations. Try again later.',
              code: 'RATE_LIMITED',
              bulk: true,
              days: outcome.days,
              duplicatesRemoved: outcome.duplicatesRemoved,
              results,
            },
            429,
            { 'retry-after': '3600' },
          );
        }

        return json({
          ok: true,
          bulk: true,
          days: outcome.days,
          duplicatesRemoved: outcome.duplicatesRemoved,
          results,
        });
      }

      let invite;
      try {
        invite = await createBetaInvite({
          email: body.email,
          days: body.days,
          name: body.name,
          note: body.note,
          invitedBy: 'founder',
        });
      } catch (error) {
        const mapped = actionableConfigError(error);
        if (mapped) throw mapped;
        throw error;
      }

      const emailError = publicEmailError(invite.emailError);
      return json({
        ok: true,
        key: invite.key,
        fingerprint: invite.fingerprint,
        email: invite.email,
        expiresAt: invite.expiresAt,
        days: invite.days,
        emailStatus: invite.emailStatus,
        ...(emailError ? { emailError } : {}),
      });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
