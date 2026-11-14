// @vitest-environment node
import { createHmac, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  parseResendEmailEvent,
  verifySvixSignature,
  webhookKeyBytes,
} from './resend-webhook.js';

function signedRequest(payload, secret, { timestamp, id = 'msg_test_1' } = {}) {
  const key = webhookKeyBytes(secret);
  const ts = String(timestamp ?? Math.floor(Date.now() / 1000));
  const digest = createHmac('sha256', key).update(`${id}.${ts}.${payload}`).digest('base64');
  return { id, timestamp: ts, signature: `v1,${digest}` };
}

describe('Resend webhook signatures', () => {
  it('accepts a current Svix signature and rejects a bad one', () => {
    const secret = Buffer.from(randomBytes(24)).toString('base64');
    const payload = JSON.stringify({ type: 'email.delivered', data: { email_id: 'email_1' } });
    const good = signedRequest(payload, secret);
    expect(verifySvixSignature({ secret, payload, ...good })).toBe(true);
    expect(verifySvixSignature({
      secret,
      payload,
      ...good,
      signature: good.signature.replace('v1,', 'v1,AAAA'),
    })).toBe(false);
  });

  it('rejects a stale timestamp and a missing secret', () => {
    const secret = Buffer.from(randomBytes(24)).toString('base64');
    const payload = '{}';
    const stale = signedRequest(payload, secret, { timestamp: Math.floor(Date.now() / 1000) - 3600 });
    expect(verifySvixSignature({ secret, payload, ...stale })).toBe(false);
    expect(verifySvixSignature({ secret: '', payload, ...stale })).toBe(false);
    expect(webhookKeyBytes('')).toBeNull();
  });

  it('reads tracked email events and ignores the rest', () => {
    expect(parseResendEmailEvent({
      type: 'email.opened',
      created_at: '2026-11-14T18:00:00.000Z',
      data: { email_id: 'email_9', created_at: '2026-11-14T18:00:01.000Z' },
    })).toEqual({
      providerMessageId: 'email_9',
      eventType: 'opened',
      occurredAt: '2026-11-14T18:00:01.000Z',
    });
    expect(parseResendEmailEvent({ type: 'email.sent', data: { email_id: 'email_9' } })).toBeNull();
    expect(parseResendEmailEvent({ type: 'email.bounced', data: {} })).toBeNull();
  });
});
