import {
  hashActivationToken,
  hashWorkstationId,
  isWorkstationIdFormat,
} from '../_lib/license-crypto.js';
import { lookupActivation } from '../_lib/license-repository.js';
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

      const lookup = await lookupActivation(
        hashActivationToken(token),
        hashWorkstationId(workstationId),
      );
      // A revoked, transferred, or unknown seat drops the local activation.
      // An expired time-limited license stays on the device so the tester
      // sees that it ended. No entitlement token is issued for that seat.
      if (lookup.kind === 'expired') {
        const record = lookup.record;
        return json({
          ok: true,
          active: false,
          reason: 'expired',
          license: {
            plan: record.plan,
            licenseSource: record.source || null,
            expiresAt: record.expires_at ? new Date(record.expires_at).toISOString() : null,
            purchasedAt: record.purchased_at ? new Date(record.purchased_at).toISOString() : null,
            licenseEmail: record.customer_email || null,
            licenseFingerprint: record.license_fingerprint || null,
          },
        });
      }
      if (lookup.kind !== 'active' || !lookup.record) {
        return json({ ok: false, active: false }, 401);
      }

      return json({
        ok: true,
        active: true,
        entitlement: entitlementFromDatabase(lookup.record, token, null, workstationId),
      });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
