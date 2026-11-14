// @vitest-environment node
import { createHmac, randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  insertEmailEvent: vi.fn(),
}));

vi.mock('../_lib/license-repository.js', () => ({
  insertEmailEvent: mocks.insertEmailEvent,
}));

import webhook from './resend.js';
import { webhookKeyBytes } from '../_lib/resend-webhook.js';

function signed(payload, secret) {
  const id = 'msg_evt_1';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const digest = createHmac('sha256', webhookKeyBytes(secret))
    .update(`${id}.${timestamp}.${payload}`)
    .digest('base64');
  return { id, timestamp, signature: `v1,${digest}` };
}

describe('POST /api/webhooks/resend', () => {
  const secret = Buffer.from(randomBytes(24)).toString('base64');

  beforeEach(() => {
    process.env.RESEND_WEBHOOK_SECRET = secret;
    mocks.insertEmailEvent.mockReset();
    mocks.insertEmailEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.RESEND_WEBHOOK_SECRET;
  });

  it('rejects requests when the webhook secret is unset', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const response = await webhook.fetch(new Request('https://exhibitkit.example/api/webhooks/resend', {
      method: 'POST',
      body: '{}',
    }));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('WEBHOOK_NOT_CONFIGURED');
    expect(mocks.insertEmailEvent).not.toHaveBeenCalled();
  });

  it('stores a verified delivery event and ignores unrelated types', async () => {
    const payload = JSON.stringify({
      type: 'email.delivered',
      data: { email_id: 'email_42', created_at: '2026-11-14T18:00:00.000Z' },
    });
    const headers = signed(payload, secret);
    const response = await webhook.fetch(new Request('https://exhibitkit.example/api/webhooks/resend', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'svix-id': headers.id,
        'svix-timestamp': headers.timestamp,
        'svix-signature': headers.signature,
      },
      body: payload,
    }));
    expect(response.status).toBe(200);
    expect(mocks.insertEmailEvent).toHaveBeenCalledWith({
      providerMessageId: 'email_42',
      eventType: 'delivered',
      occurredAt: '2026-11-14T18:00:00.000Z',
      svixId: 'msg_evt_1',
    });

    const ignoredPayload = JSON.stringify({ type: 'email.sent', data: { email_id: 'email_42' } });
    const ignoredHeaders = signed(ignoredPayload, secret);
    const ignored = await webhook.fetch(new Request('https://exhibitkit.example/api/webhooks/resend', {
      method: 'POST',
      headers: {
        'svix-id': ignoredHeaders.id,
        'svix-timestamp': ignoredHeaders.timestamp,
        'svix-signature': ignoredHeaders.signature,
      },
      body: ignoredPayload,
    }));
    expect(ignored.status).toBe(200);
    expect((await ignored.json()).ignored).toBe(true);
  });

  it('rejects a bad signature', async () => {
    const response = await webhook.fetch(new Request('https://exhibitkit.example/api/webhooks/resend', {
      method: 'POST',
      headers: {
        'svix-id': 'msg_evt_1',
        'svix-timestamp': String(Math.floor(Date.now() / 1000)),
        'svix-signature': 'v1,bm90LWEgcmVhbC1zaWduYXR1cmU',
      },
      body: '{}',
    }));
    expect(response.status).toBe(400);
    expect(mocks.insertEmailEvent).not.toHaveBeenCalled();
  });
});
