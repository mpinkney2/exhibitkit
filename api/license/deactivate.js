import {
  hashActivationToken,
  hashWorkstationId,
  isWorkstationIdFormat,
} from '../_lib/license-crypto.js';
import { deactivateWorkstation } from '../_lib/license-repository.js';
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
      if (token.length >= 32 && isWorkstationIdFormat(workstationId)) {
        await deactivateWorkstation(
          hashActivationToken(token),
          hashWorkstationId(workstationId),
        );
      }
      return json({ ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
