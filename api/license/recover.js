import {
  decryptLicenseKey,
  hashEmail,
  isEmailFormat,
  normalizeEmail,
} from '../_lib/license-crypto.js';
import { findRecoverableLicenses } from '../_lib/license-repository.js';
import { sendLicenseRecovery } from '../_lib/license-email.js';
import { consumeRateLimit } from '../_lib/rate-limit.js';
import {
  errorResponse,
  getClientIp,
  isAllowedBrowserOrigin,
  json,
  methodNotAllowed,
  readJson,
} from '../_lib/http.js';

const GENERIC_MESSAGE = 'If that email matches an active license, a recovery message is on its way.';

export default {
  async fetch(request) {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    if (!isAllowedBrowserOrigin(request)) {
      return json({ ok: false, error: 'Request origin is not allowed.' }, 403);
    }

    try {
      const body = await readJson(request, 4_096);
      const email = normalizeEmail(body.email);
      const ipAllowed = await consumeRateLimit(
        'license_recovery_ip',
        getClientIp(request),
        10,
        3600,
      );
      if (!ipAllowed || !isEmailFormat(email)) {
        return json({ ok: true, message: GENERIC_MESSAGE }, 202);
      }

      const emailHash = hashEmail(email);
      const emailAllowed = await consumeRateLimit(
        'license_recovery_email',
        emailHash,
        3,
        86400,
      );
      if (!emailAllowed) {
        return json({ ok: true, message: GENERIC_MESSAGE }, 202);
      }

      const records = await findRecoverableLicenses(emailHash);
      if (records.length > 0) {
        const licenses = records.map((record) => ({
          key: decryptLicenseKey(record.license_key_ciphertext),
          purchasedAt: record.purchased_at,
        }));
        const dateBucket = new Date().toISOString().slice(0, 10);
        await sendLicenseRecovery({
          to: email,
          licenses,
          recoveryBucket: `${emailHash.slice(0, 32)}/${dateBucket}`,
        });
      }

      return json({ ok: true, message: GENERIC_MESSAGE }, 202);
    } catch (error) {
      return errorResponse(error);
    }
  },
};
