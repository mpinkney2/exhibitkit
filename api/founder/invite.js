import { safeEqual } from '../_lib/license-crypto.js';
import {
  errorResponse,
  getClientIp,
  isAllowedBrowserOrigin,
  json,
  methodNotAllowed,
  readJson,
  HttpError,
} from '../_lib/http.js';
import { createBetaInvite } from '../_lib/beta-invite-service.js';

/** Server settings the beta-invite pipeline needs to mint a license (DB + license
 *  crypto). Email delivery (RESEND_API_KEY, LICENSE_EMAIL_FROM) is optional — when
 *  it is not configured, the key is still minted and returned for manual delivery. */
const REQUIRED_BACKEND_ENV = [
  'DATABASE_URL',
  'LICENSE_HASH_SECRET',
  'LICENSE_ENCRYPTION_KEY',
];

/** In-process rate limit (per isolate). Enough to slow casual abuse; does not
 *  depend on the database, so an authenticated founder can still receive a clear
 *  configuration error when the database itself is the missing piece. */
const inviteAttempts = new Map();

function consumeInviteRateLimit(ip, limit = 30, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const key = String(ip || 'unknown');
  let entry = inviteAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
  }
  entry.count += 1;
  inviteAttempts.set(key, entry);
  return entry.count <= limit;
}

export function resetFounderInviteRateLimitForTesting() {
  inviteAttempts.clear();
}

function missingBackendConfig() {
  return REQUIRED_BACKEND_ENV.filter((name) => !String(process.env[name] || '').trim());
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

/**
 * POST /api/founder/invite
 * Body: { secret: string, email: string, name?: string, note?: string, days?: number }
 *
 * Founder-only. Validates the server-only FOUNDER_ADMIN_SECRET (same secret as
 * /api/founder/unlock), then mints a real, server-verified time-limited Pro
 * license and emails the key to a beta tester. The plaintext key is returned to
 * the authenticated founder so credentials can also be delivered manually.
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
      const expected = String(process.env.FOUNDER_ADMIN_SECRET || '').trim();
      if (!expected || expected.length < 16) {
        throw new HttpError(
          503,
          'Founder admin is not configured on the server.',
          'FOUNDER_NOT_CONFIGURED',
        );
      }

      const ip = getClientIp(request);
      if (!consumeInviteRateLimit(ip)) {
        return json(
          { ok: false, error: 'Too many invitations. Try again later.', code: 'RATE_LIMITED' },
          429,
          { 'retry-after': '3600' },
        );
      }

      const body = await readJson(request, 4_096);
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

      return json({
        ok: true,
        key: invite.key,
        fingerprint: invite.fingerprint,
        email: invite.email,
        expiresAt: invite.expiresAt,
        days: invite.days,
        emailStatus: invite.emailStatus,
      });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
