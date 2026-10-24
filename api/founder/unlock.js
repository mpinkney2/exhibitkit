import { safeEqual } from '../_lib/license-crypto.js';
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

/**
 * POST /api/founder/unlock
 * Body: { secret: string }
 *
 * Validates against server-only FOUNDER_ADMIN_SECRET (never a VITE_ var).
 * On success the client may keep a sessionStorage unlock flag for this tab.
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

      assertRateLimitConfigured();
      const ip = getClientIp(request);
      const allowed = await consumeRateLimit('founder_unlock_ip', ip, 10, 900);
      if (!allowed) {
        return json(
          { ok: false, error: 'Too many unlock attempts. Try again later.', code: 'RATE_LIMITED' },
          429,
          { 'retry-after': '900' },
        );
      }

      const body = await readJson(request, 2_048);
      const candidate = String(body.secret || '').trim();
      if (!candidate || !safeEqual(candidate, expected)) {
        throw new HttpError(401, 'Incorrect founder secret.', 'FOUNDER_DENIED');
      }

      return json({ ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
