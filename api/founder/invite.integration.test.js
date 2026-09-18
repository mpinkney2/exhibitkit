// @vitest-environment node
//
// End-to-end wiring test: real endpoint -> real beta-invite-service -> real
// license-repository -> real license-crypto/email, faking only the Neon SQL
// client and the Resend SDK (the two things unavailable in this environment).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const captured = [];
  const fakeSql = (strings, ...values) => {
    const text = strings.join(' ');
    captured.push({ text, values });
    if (text.includes('exhibitkit_consume_rate_limit')) {
      return Promise.resolve([{ allowed: true }]);
    }
    if (text.includes('INSERT INTO exhibitkit_licenses')) {
      return Promise.resolve([{
        id: 'lic_int_1',
        customer_email: values[3],
        license_fingerprint: values[2],
        expires_at: values[10],
      }]);
    }
    return Promise.resolve([]);
  };
  const sent = [];
  return { captured, fakeSql, sent };
});

vi.mock('../_lib/database.js', () => ({
  getDatabase: () => h.fakeSql,
  resetDatabaseForTesting: () => {},
}));

vi.mock('resend', () => ({
  Resend: class {
    constructor() {
      this.emails = {
        send: async (payload, options) => {
          h.sent.push({ payload, options });
          return { data: { id: 'msg_int_1' }, error: null };
        },
      };
    }
  },
}));

import invite from './invite.js';
import { isLicenseKeyFormat } from '../_lib/license-crypto.js';

const ORIGIN = 'https://exhibitkit.patentpreppers.com';

beforeEach(() => {
  process.env.FOUNDER_ADMIN_SECRET = 'production-founder-secret-ok';
  process.env.APP_URL = ORIGIN;
  process.env.LICENSE_HASH_SECRET = 'x'.repeat(48);
  process.env.LICENSE_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.LICENSE_EMAIL_FROM = 'ExhibitKIT <licenses@example.com>';
  process.env.EXHIBITKIT_VERSION = 'v1.2.3';
  h.captured.length = 0;
  h.sent.length = 0;
});

afterEach(() => {
  delete process.env.FOUNDER_ADMIN_SECRET;
  delete process.env.APP_URL;
  delete process.env.LICENSE_HASH_SECRET;
  delete process.env.LICENSE_ENCRYPTION_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.LICENSE_EMAIL_FROM;
  delete process.env.EXHIBITKIT_VERSION;
});

describe('POST /api/founder/invite (end-to-end wiring)', () => {
  it('mints a server-verified 30-day Pro license and emails the tester the key', async () => {
    const request = new Request(`${ORIGIN}/api/founder/invite`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-forwarded-for': '203.0.113.7' },
      body: JSON.stringify({
        secret: 'production-founder-secret-ok',
        email: 'Beta.Tester@Example.com',
        name: 'Beta Tester',
        note: 'cohort 1',
        days: 30,
      }),
    });

    const response = await invite.fetch(request);
    expect(response.status).toBe(200);
    const body = await response.json();

    // A real, activatable license key is produced and returned to the founder.
    expect(body.ok).toBe(true);
    expect(isLicenseKeyFormat(body.key)).toBe(true);
    expect(body.email).toBe('beta.tester@example.com');
    expect(body.days).toBe(30);
    expect(body.emailStatus).toBe('sent');

    // The row inserted into exhibitkit_licenses is a time-limited Pro beta grant.
    const insert = h.captured.find((c) => c.text.includes('INSERT INTO exhibitkit_licenses'));
    expect(insert).toBeTruthy();
    const v = insert.values;
    expect(v[3]).toBe('beta.tester@example.com'); // customer_email
    expect(v[6]).toBe('beta-invite');             // stripe_price_id sentinel
    expect(v[7]).toBe('pro_perpetual');           // plan
    expect(v[8]).toBe(1);                         // max_activations
    expect(v[13]).toBe('beta');                   // source
    const spanMs = new Date(v[10]).getTime() - new Date(v[9]).getTime(); // expires_at - purchased_at
    expect(spanMs).toBe(30 * 24 * 60 * 60 * 1000);

    // The plaintext key (not a hash) was emailed to the tester.
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0].payload.to).toBe('beta.tester@example.com');
    expect(h.sent[0].payload.html).toContain(body.key);
    expect(h.sent[0].options.idempotencyKey).toBe('beta-invite/lic_int_1');
  });
});
