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
import { consumeRateLimit } from '../_lib/rate-limit.js';
import { createBetaInvite } from '../_lib/beta-invite-service.js';

/**
 * POST /api/founder/invite
 * Body: { secret: string, email: string, name?: string, note?: string, days?: number }
 *
 * Founder-only. Validates the server-only FOUNDER_ADMIN_SECRET (same secret as
 * /api/founder/unlock), then mints a real, server-verified time-limited Pro
 * license and emails the key to a beta tester. The plaintext key is returned to
 * the authenticated founder so credentials can also be delivered manually.
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
      const allowed = await consumeRateLimit('founder_invite', ip, 30, 3600);
      if (!allowed) {
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

      const invite = await createBetaInvite({
        email: body.email,
        days: body.days,
        name: body.name,
        note: body.note,
        invitedBy: 'founder',
      });

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
