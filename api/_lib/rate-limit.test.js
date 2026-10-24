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

import { readFileSync } from 'node:fs';
import { assertRateLimitConfigured, consumeRateLimit } from './rate-limit.js';

const HASH_SECRET = 'hash-secret-with-at-least-thirty-two-characters';

beforeEach(() => {
  process.env.LICENSE_HASH_SECRET = HASH_SECRET;
  delete process.env.RATE_LIMIT_HASH_SECRET;
  h.calls.length = 0;
  h.result = [{ allowed: true }];
});

afterEach(() => {
  delete process.env.DATABASE_URL;
  delete process.env.LICENSE_HASH_SECRET;
  delete process.env.RATE_LIMIT_HASH_SECRET;
});

describe('assertRateLimitConfigured', () => {
  it('returns a generic error and logs the missing settings', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.DATABASE_URL;
    delete process.env.LICENSE_HASH_SECRET;
    delete process.env.RATE_LIMIT_HASH_SECRET;
    try {
      assertRateLimitConfigured();
      expect.unreachable();
    } catch (error) {
      expect(error.status).toBe(503);
      expect(error.code).toBe('RATE_LIMIT_NOT_CONFIGURED');
      expect(error.message).toBe('Rate limiting is not configured on the server.');
      expect(error.message).not.toMatch(/DATABASE_URL|LICENSE_HASH_SECRET|RATE_LIMIT_HASH_SECRET/);
    }
    const logged = errorSpy.mock.calls.flat().join(' ');
    expect(logged).toContain('DATABASE_URL');
    expect(logged).toContain('RATE_LIMIT_HASH_SECRET or LICENSE_HASH_SECRET');
    errorSpy.mockRestore();
  });

  it('accepts either hash secret when the database is configured', () => {
    process.env.DATABASE_URL = 'postgres://test';
    delete process.env.LICENSE_HASH_SECRET;
    process.env.RATE_LIMIT_HASH_SECRET = 'y'.repeat(32);
    expect(() => assertRateLimitConfigured()).not.toThrow();
  });

  it('rejects a hash secret that is present but too short', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.DATABASE_URL = 'postgres://test';
    process.env.LICENSE_HASH_SECRET = 'short';
    delete process.env.RATE_LIMIT_HASH_SECRET;
    expect(() => assertRateLimitConfigured()).toThrowError(/Rate limiting is not configured on the server/);
    const logged = errorSpy.mock.calls.flat().join(' ');
    expect(logged).toContain('RATE_LIMIT_HASH_SECRET or LICENSE_HASH_SECRET');
    expect(logged).not.toContain('DATABASE_URL');
    errorSpy.mockRestore();
  });
});

describe('rate limit retention migration', () => {
  it('deletes a bounded batch of expired rows on about one percent of calls', () => {
    const sql = readFileSync(new URL('../../db/migrations/005_rate_limit_cleanup.sql', import.meta.url), 'utf8');
    expect(sql.startsWith('-- migrate:no-transaction')).toBe(false);
    expect(sql.toLowerCase()).not.toContain('concurrently');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION exhibitkit_consume_rate_limit');
    expect(sql).toContain('DELETE FROM exhibitkit_rate_limits');
    expect(sql).toContain("window_start < now() - interval '2 days'");
    expect(sql).toContain('random() < 0.01');
    expect(sql).toContain('LIMIT 100');
    expect(sql).not.toContain('CREATE INDEX');
  });

  it('creates the window index outside a transaction before the cleanup migration', () => {
    const sql = readFileSync(new URL('../../db/migrations/004_rate_limit_index.sql', import.meta.url), 'utf8');
    const migrator = readFileSync(new URL('../../scripts/migrate-licensing.mjs', import.meta.url), 'utf8');
    expect(sql.startsWith('-- migrate:no-transaction\n')).toBe(true);
    expect(sql).toContain('CREATE INDEX CONCURRENTLY IF NOT EXISTS exhibitkit_rate_limits_window_start_idx');
    expect(sql).not.toMatch(/\bBEGIN\b/);
    expect(migrator).toContain("const MIGRATION_MARKER = '-- migrate:no-transaction'");
    expect(migrator).toContain('isNoTransactionMigration');
  });
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
