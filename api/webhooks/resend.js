import { insertEmailEvent } from '../_lib/license-repository.js';
import { isMissingSchemaError } from '../_lib/resend-webhook.js';
import {
  parseResendEmailEvent,
  resendWebhookSecret,
  verifySvixSignature,
} from '../_lib/resend-webhook.js';
import { json, methodNotAllowed } from '../_lib/http.js';

const SVIX_ID = 'svix-id';
const SVIX_TIMESTAMP = 'svix-timestamp';
const SVIX_SIGNATURE = 'svix-signature';

/**
 * POST /api/webhooks/resend
 *
 * Resend (Svix) delivery events. Verifies the signature with the server-only
 * RESEND_WEBHOOK_SECRET. When that variable is unset, every request is rejected.
 * Events are stored by the Resend email id saved on the license at send time.
 * A missing email-events table returns 503 so the provider can retry after migrate.
 */
export default {
  async fetch(request) {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);

    const secret = resendWebhookSecret();
    if (!secret) {
      return json(
        { ok: false, error: 'Email tracking is not configured.', code: 'WEBHOOK_NOT_CONFIGURED' },
        503,
      );
    }

    const payload = await request.text();
    const svixId = request.headers.get(SVIX_ID) || '';
    const verified = verifySvixSignature({
      secret,
      payload,
      id: svixId,
      timestamp: request.headers.get(SVIX_TIMESTAMP) || '',
      signature: request.headers.get(SVIX_SIGNATURE) || '',
    });
    if (!verified) {
      return json({ ok: false, error: 'Webhook signature verification failed.' }, 400);
    }

    let body;
    try {
      body = JSON.parse(payload || '{}');
    } catch {
      return json({ ok: false, error: 'Invalid JSON.' }, 400);
    }

    const event = parseResendEmailEvent(body);
    if (!event) return json({ ok: true, ignored: true });

    try {
      await insertEmailEvent({
        ...event,
        svixId: svixId.slice(0, 200),
      });
    } catch (error) {
      if (isMissingSchemaError(error)) {
        console.error('[resend-webhook] email event storage is not migrated');
        return json(
          { ok: false, error: 'Email event storage is not available.', code: 'MIGRATION_REQUIRED' },
          503,
        );
      }
      console.error('[resend-webhook] email event was not stored', {
        type: event.eventType,
      });
      return json({ ok: false, error: 'Email event was not stored.' }, 500);
    }

    return json({ ok: true });
  },
};
