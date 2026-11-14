import { safeEqual } from '../_lib/license-crypto.js';
import { configuredFounderSecret } from '../_lib/founder-secret.js';
import { assertRateLimitConfigured, consumeRateLimit } from '../_lib/rate-limit.js';
import { loadBetaInviteReport } from '../_lib/beta-invite-query.js';
import {
  errorResponse,
  getClientIp,
  isAllowedBrowserOrigin,
  json,
  methodNotAllowed,
  readJson,
  HttpError,
} from '../_lib/http.js';

/**
 * POST /api/founder/invites
 * Body: { secret: string, status?: string }
 *
 * Founder-only list of beta invites. Same FOUNDER_ADMIN_SECRET check as
 * /api/founder/unlock. Does not return license keys.
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
      const allowed = await consumeRateLimit('founder_invite_report_ip', ip, 60, 3600);
      if (!allowed) {
        return json(
          { ok: false, error: 'Too many report requests. Try again later.', code: 'RATE_LIMITED' },
          429,
          { 'retry-after': '3600' },
        );
      }

      const body = await readJson(request, 4_096);
      const candidate = String(body.secret || '').trim();
      if (!candidate || !safeEqual(candidate, expected)) {
        throw new HttpError(401, 'Incorrect founder secret.', 'FOUNDER_DENIED');
      }

      let report;
      try {
        report = await loadBetaInviteReport({ status: body.status });
      } catch (error) {
        if (error?.code === 'INVITE_DB_MIGRATION_REQUIRED') {
          throw new HttpError(503, error.message, error.code);
        }
        throw error;
      }

      return json({ ok: true, ...report });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
