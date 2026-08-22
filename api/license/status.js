import {
  hashActivationToken,
  hashWorkstationId,
  isWorkstationIdFormat,
} from '../_lib/license-crypto.js';
import { getActivationStatus } from '../_lib/license-repository.js';
import { entitlementFromDatabase } from '../_lib/entitlement-response.js';
import {
  errorResponse,
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
      const body = await readJson(request, 4_096);
      const token = String(body.activationToken || '').trim();
      const workstationId = String(body.workstationId || '').trim();
      if (token.length < 32 || !isWorkstationIdFormat(workstationId)) {
        return json({ ok: false, active: false }, 401);
      }

      const record = await getActivationStatus(
        hashActivationToken(token),
        hashWorkstationId(workstationId),
      );
      if (!record) return json({ ok: false, active: false }, 401);

      return json({
        ok: true,
        active: true,
        entitlement: entitlementFromDatabase(record, token),
      });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
