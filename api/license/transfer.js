import { activateLicenseKey } from '../_lib/activation-service.js';
import { consumeRateLimit } from '../_lib/rate-limit.js';
import {
  errorResponse,
  getClientIp,
  isAllowedBrowserOrigin,
  json,
  methodNotAllowed,
  readJson,
} from '../_lib/http.js';

export default {
  async fetch(request) {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    if (!isAllowedBrowserOrigin(request)) {
      return json({ ok: false, error: 'Request origin is not allowed.' }, 403);
    }

    try {
      const body = await readJson(request);
      if (body.confirmTransfer !== true) {
        return json({ ok: false, error: 'Transfer confirmation is required.' }, 400);
      }

      const allowed = await consumeRateLimit(
        'license_transfer_ip',
        getClientIp(request),
        5,
        3600,
      );
      if (!allowed) {
        return json(
          { ok: false, error: 'Too many transfer attempts. Try again later.', code: 'RATE_LIMITED' },
          429,
          { 'retry-after': '3600' },
        );
      }

      const entitlement = await activateLicenseKey(body, { transfer: true });
      return json({ ok: true, entitlement });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
