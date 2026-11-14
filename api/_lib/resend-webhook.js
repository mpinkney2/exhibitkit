import { createHmac, timingSafeEqual } from 'node:crypto';

/** Resend signs webhooks with Svix. The signing secret is server-only. */
export const RESEND_WEBHOOK_SECRET_ENV = 'RESEND_WEBHOOK_SECRET';

const TOLERANCE_MS = 5 * 60 * 1000;
const TRACKED_EVENTS = new Map([
  ['email.delivered', 'delivered'],
  ['email.opened', 'opened'],
  ['email.clicked', 'clicked'],
  ['email.bounced', 'bounced'],
  ['email.complained', 'complained'],
]);

export function resendWebhookSecret() {
  return String(process.env[RESEND_WEBHOOK_SECRET_ENV] || '').trim();
}

export function webhookKeyBytes(secret) {
  const trimmed = String(secret || '').trim();
  if (!trimmed) return null;
  const encoded = trimmed.startsWith('whsec_') ? trimmed.slice('whsec_'.length) : trimmed;
  if (!encoded || !/^[A-Za-z0-9+/_=-]+$/.test(encoded)) return null;
  try {
    const bytes = Buffer.from(encoded, 'base64');
    return bytes.length >= 16 ? bytes : null;
  } catch {
    return null;
  }
}

/**
 * Verify a Svix signature over the raw request body.
 * `signature` is the svix-signature header: one or more `v1,<base64>` tokens.
 */
export function verifySvixSignature({
  secret,
  payload,
  id,
  timestamp,
  signature,
  now = Date.now(),
} = {}) {
  const messageId = String(id || '').trim();
  const signedAt = String(timestamp || '').trim();
  const header = String(signature || '').trim();
  if (!messageId || !signedAt || !header || typeof payload !== 'string') return false;
  if (messageId.length > 200 || signedAt.length > 20) return false;

  const seconds = Number(signedAt);
  if (!Number.isInteger(seconds)) return false;
  if (Math.abs(now - seconds * 1000) > TOLERANCE_MS) return false;

  const key = webhookKeyBytes(secret);
  if (!key) return false;

  const expected = createHmac('sha256', key)
    .update(`${messageId}.${signedAt}.${payload}`)
    .digest('base64');
  const expectedBytes = Buffer.from(expected);

  const candidates = header.split(' ').map((part) => part.trim()).filter(Boolean);
  for (const candidate of candidates) {
    if (!candidate.startsWith('v1,')) continue;
    const value = candidate.slice(3);
    const actual = Buffer.from(value);
    if (actual.length !== expectedBytes.length) continue;
    if (timingSafeEqual(actual, expectedBytes)) return true;
  }
  return false;
}

/**
 * Pull the fields we store from a verified Resend event.
 * Returns null for event types this app does not track.
 */
export function parseResendEmailEvent(body) {
  if (!body || typeof body !== 'object') return null;
  const type = TRACKED_EVENTS.get(String(body.type || ''));
  const emailId = String(body.data?.email_id || '').trim();
  if (!type || !emailId || emailId.length > 200) return null;
  const occurredAt = body.data?.created_at || body.created_at;
  const occurredMs = Date.parse(occurredAt || '');
  return {
    providerMessageId: emailId,
    eventType: type,
    occurredAt: Number.isFinite(occurredMs) ? new Date(occurredMs).toISOString() : new Date().toISOString(),
  };
}

export function isMissingSchemaError(error) {
  return error?.code === '42P01' || error?.code === '42703';
}
