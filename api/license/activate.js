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
      const ipAllowed = await consumeRateLimit(
        'license_activation_ip',
        getClientIp(request),
        20,
        900,
      );
      const keyAllowed = await consumeRateLimit(
        'license_activation_key',
        String(body.licenseKey || '').trim().toUpperCase(),
        10,
        900,
      );
      if (!ipAllowed || !keyAllowed) {
        return json(
          { ok: false, error: 'Too many activation attempts. Try again later.', code: 'RATE_LIMITED' },
          429,
          { 'retry-after': '900' },
        );
      }

      const entitlement = await activateLicenseKey(body);
      return json({ ok: true, entitlement });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
