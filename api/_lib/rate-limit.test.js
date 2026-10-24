// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  calls: [],
  result: [{ allowed: true }],
}));

vi.mock('./database.js', () => ({
  getDatabase: () => (strings, ...values) => {
    h.calls.push({ text: strings.join(' '), values });
    return Promise.resolve(h.result);
  },
  resetDatabaseForTesting: () => {},
}));

import { consumeRateLimit } from './rate-limit.js';

const HASH_SECRET = 'hash-secret-with-at-least-thirty-two-characters';

beforeEach(() => {
  process.env.LICENSE_HASH_SECRET = HASH_SECRET;
  delete process.env.RATE_LIMIT_HASH_SECRET;
  h.calls.length = 0;
  h.result = [{ allowed: true }];
});

afterEach(() => {
  delete process.env.LICENSE_HASH_SECRET;
  delete process.env.RATE_LIMIT_HASH_SECRET;
});

describe('consumeRateLimit', () => {
  it('stores a hash of the key and the window passed by the caller', async () => {
    const allowed = await consumeRateLimit('founder_unlock_ip', '203.0.113.10', 10, 900);
    expect(allowed).toBe(true);
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0].text).toContain('exhibitkit_consume_rate_limit');
    expect(h.calls[0].values).toHaveLength(4);
    expect(h.calls[0].values[0]).toBe('founder_unlock_ip');
    expect(h.calls[0].values[1]).toMatch(/^[a-f0-9]{64}$/);
    expect(h.calls[0].values[1]).not.toContain('203.0.113.10');
    expect(h.calls[0].values[2]).toBe(10);
    expect(h.calls[0].values[3]).toBe(900);
  });

  it('hashes the same key the same way and a different key differently', async () => {
    await consumeRateLimit('founder_invite_ip', '203.0.113.10', 30, 3600);
    await consumeRateLimit('founder_invite_ip', '203.0.113.10', 30, 3600);
    await consumeRateLimit('founder_invite_ip', '203.0.113.11', 30, 3600);
    expect(h.calls[0].values[1]).toBe(h.calls[1].values[1]);
    expect(h.calls[0].values[1]).not.toBe(h.calls[2].values[1]);
  });

  it('returns false when the database denies the request', async () => {
    h.result = [{ allowed: false }];
    await expect(consumeRateLimit('founder_invite_ip', '203.0.113.10', 30, 3600)).resolves.toBe(false);
  });

  it('returns false when the database returns no row or a non-boolean', async () => {
    h.result = [];
    await expect(consumeRateLimit('founder_unlock_ip', '203.0.113.10', 10, 900)).resolves.toBe(false);

    h.result = [{ allowed: 'true' }];
    await expect(consumeRateLimit('founder_unlock_ip', '203.0.113.10', 10, 900)).resolves.toBe(false);
  });
});
