// @vitest-environment node
import { mkdtempSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import postgres from 'postgres';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  applyLicensingMigrations,
  isNoTransactionMigration,
  migrationNoticeHandler,
  requireOneNoTransactionStatement,
  rethrowIndexLockTimeout,
  statementsOutsideTransaction,
} from './migrate-licensing.mjs';

const migrationsDir = new URL('../db/migrations/', import.meta.url);
const databaseUrl = process.env.MIGRATION_TEST_DATABASE_URL;

it('has a postgres url when CI runs the migration runner', () => {
  if (process.env.CI) {
    expect(databaseUrl).toBeTruthy();
  }
});

describe('migration transaction marker', () => {
  it('uses the first-line marker and ignores the word concurrently in comments', async () => {
    const cleanup = await readFile(new URL('005_rate_limit_cleanup.sql', migrationsDir), 'utf8');
    const index = await readFile(new URL('004_rate_limit_index.sql', migrationsDir), 'utf8');
    expect(isNoTransactionMigration(index)).toBe(true);
    expect(isNoTransactionMigration(cleanup)).toBe(false);
    expect(isNoTransactionMigration('-- Created concurrently in the index migration\nBEGIN;\nSELECT 1;\n')).toBe(false);
    expect(statementsOutsideTransaction(index)).toHaveLength(1);
    expect(() => requireOneNoTransactionStatement('bad.sql', '-- migrate:no-transaction\nSELECT 1;\nSELECT 2;\n')).toThrow(
      /exactly one statement/,
    );
  });

  it('tells the operator to retry when a concurrent build hits 55P03', async () => {
    const calls = [];
    const sql = {
      unsafe(query) {
        calls.push(query);
        return { simple: async () => {} };
      },
    };
    const locked = new Error('canceling statement due to lock timeout');
    locked.code = '55P03';
    await expect(rethrowIndexLockTimeout(sql, '004_rate_limit_index.sql', locked)).rejects.toThrow(/55P03/);
    expect(calls[0]).toBe('ROLLBACK');
    expect(calls.some((query) => query.includes('DROP INDEX CONCURRENTLY IF EXISTS exhibitkit_rate_limits_window_start_idx'))).toBe(true);

    const other = new Error('division by zero');
    other.code = '22012';
    await expect(rethrowIndexLockTimeout(sql, '004_rate_limit_index.sql', other)).rejects.toBe(other);
  });
});

describe.skipIf(!databaseUrl)('licensing migrations on postgres', () => {
  let admin;
  const databases = [];

  async function createDatabase() {
    const name = `exhibitkit_migrate_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await admin.unsafe(`CREATE DATABASE ${name}`);
    databases.push(name);
    const url = new URL(databaseUrl);
    url.pathname = `/${name}`;
    return postgres(url.toString(), {
      max: 1,
      prepare: false,
      ssl: false,
      connect_timeout: 10,
      onnotice: () => {},
    });
  }

  beforeAll(async () => {
    admin = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      ssl: false,
      connect_timeout: 10,
    });
    await admin`SELECT 1 AS ok`;
  });

  afterAll(async () => {
    for (const name of databases) {
      await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    }
    await admin.end({ timeout: 5 });
  });

  it('applies the migrations twice on an empty database', async () => {
    const sql = await createDatabase();
    const logs = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((message) => {
      logs.push(String(message));
    });
    try {
      await applyLicensingMigrations(sql, migrationsDir);
      await applyLicensingMigrations(sql, migrationsDir);
      const applied = await sql`
        SELECT filename FROM exhibitkit_schema_migrations ORDER BY filename
      `;
      expect(applied.map((row) => row.filename)).toEqual([
        '001_secure_licensing.sql',
        '002_beta_invites.sql',
        '003_enable_rls.sql',
        '004_rate_limit_index.sql',
        '005_rate_limit_cleanup.sql',
      ]);
      const definition = await sql`
        SELECT pg_get_functiondef('exhibitkit_consume_rate_limit'::regproc) AS body
      `;
      expect(definition[0].body).toContain('random() < 0.01');
      expect(definition[0].body).toContain('LIMIT 100');
      const index = await sql`
        SELECT indisvalid
        FROM pg_index
        WHERE indexrelid = 'exhibitkit_rate_limits_window_start_idx'::regclass
      `;
      expect(index[0].indisvalid).toBe(true);
      const timeout = await sql`SHOW lock_timeout`;
      expect(timeout[0].lock_timeout).toBe('5s');
      const lock = await sql`SELECT pg_try_advisory_lock(hashtext('exhibitkit_schema_migrations')) AS locked`;
      expect(lock[0].locked).toBe(true);
      await sql`SELECT pg_advisory_unlock(hashtext('exhibitkit_schema_migrations'))`;
      expect(logs.filter((line) => line.startsWith('Applied migration 004_rate_limit_index.sql'))).toHaveLength(1);
      expect(logs.filter((line) => line.startsWith('Skipping migration 004_rate_limit_index.sql'))).toHaveLength(1);
      expect(logs.filter((line) => line.startsWith('Skipping migration 005_rate_limit_cleanup.sql'))).toHaveLength(1);
    } finally {
      logSpy.mockRestore();
      await sql.end({ timeout: 5 });
    }
  });

  it('does not log duplicate-relation notices on a second run', async () => {
    const name = `exhibitkit_migrate_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await admin.unsafe(`CREATE DATABASE ${name}`);
    databases.push(name);
    const url = new URL(databaseUrl);
    url.pathname = `/${name}`;
    const notices = [];
    const logs = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((message) => {
      logs.push(String(message));
    });
    const sql = postgres(url.toString(), {
      max: 1,
      prepare: false,
      ssl: false,
      connect_timeout: 10,
      onnotice(notice) {
        notices.push(notice);
        migrationNoticeHandler(notice);
      },
    });
    try {
      await applyLicensingMigrations(sql, migrationsDir);
      await applyLicensingMigrations(sql, migrationsDir);
      expect(notices.some((notice) => notice.code === '42P07')).toBe(true);
      expect(logs.some((line) => line.includes('42P07') || line.includes('already exists'))).toBe(false);
    } finally {
      logSpy.mockRestore();
      await sql.end({ timeout: 5 });
    }
  });

  it('fails when the rate-limit index exists but is invalid', async () => {
    const sql = await createDatabase();
    try {
      await applyLicensingMigrations(sql, migrationsDir);
      await sql.unsafe(`
        UPDATE pg_index
        SET indisvalid = false
        WHERE indexrelid = 'exhibitkit_rate_limits_window_start_idx'::regclass
      `);
      await expect(applyLicensingMigrations(sql, migrationsDir)).rejects.toThrow(
        /exhibitkit_rate_limits_window_start_idx exists but is invalid/,
      );
      await sql.unsafe(`DROP INDEX exhibitkit_rate_limits_window_start_idx`);
      await expect(applyLicensingMigrations(sql, migrationsDir)).rejects.toThrow(
        /exhibitkit_rate_limits_window_start_idx is missing/,
      );
      const lock = await sql`SELECT pg_try_advisory_lock(hashtext('exhibitkit_schema_migrations')) AS locked`;
      expect(lock[0].locked).toBe(true);
      await sql`SELECT pg_advisory_unlock(hashtext('exhibitkit_schema_migrations'))`;
    } finally {
      await sql.end({ timeout: 5 });
    }
  });

  it('records 001-003 when they are already present, then applies the rest twice', async () => {
    const sql = await createDatabase();
    const logs = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((message) => {
      logs.push(String(message));
    });
    try {
      for (const name of [
        '001_secure_licensing.sql',
        '002_beta_invites.sql',
        '003_enable_rls.sql',
      ]) {
        const contents = await readFile(new URL(name, migrationsDir), 'utf8');
        await sql.unsafe(contents).simple();
      }
      await sql`
        INSERT INTO exhibitkit_rate_limits (action, key_hash, window_start, request_count)
        VALUES ('baseline', 'abc', now(), 3)
      `;
      await applyLicensingMigrations(sql, migrationsDir);
      await applyLicensingMigrations(sql, migrationsDir);
      const kept = await sql`
        SELECT request_count
        FROM exhibitkit_rate_limits
        WHERE action = 'baseline' AND key_hash = 'abc'
      `;
      expect(kept[0].request_count).toBe(3);
      expect(logs.some((line) => line.includes('Recorded already-applied migrations: 001_secure_licensing.sql, 002_beta_invites.sql, 003_enable_rls.sql'))).toBe(true);
      expect(logs.filter((line) => line.startsWith('Skipping migration 001_secure_licensing.sql'))).toHaveLength(2);
      expect(logs.filter((line) => line.startsWith('Applied migration 005_rate_limit_cleanup.sql'))).toHaveLength(1);
      const index = await sql`
        SELECT indisvalid
        FROM pg_index
        WHERE indexrelid = 'exhibitkit_rate_limits_window_start_idx'::regclass
      `;
      expect(index[0].indisvalid).toBe(true);
    } finally {
      logSpy.mockRestore();
      await sql.end({ timeout: 5 });
    }
  });

  it('reports the original error from a failed migration and releases the lock', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'exhibitkit-migrate-'));
    writeFileSync(join(dir, '001_fail.sql'), 'SELECT 1/0;\n');
    const sql = await createDatabase();
    try {
      await expect(applyLicensingMigrations(sql, pathToFileURL(`${dir}/`))).rejects.toThrow(/division by zero/);
      const lock = await sql`SELECT pg_try_advisory_lock(hashtext('exhibitkit_schema_migrations')) AS locked`;
      expect(lock[0].locked).toBe(true);
      await sql`SELECT pg_advisory_unlock(hashtext('exhibitkit_schema_migrations'))`;
    } finally {
      await sql.end({ timeout: 5 });
    }
  });

  it('uses a 5s lock timeout for transactional files and no lock timeout for the index build', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'exhibitkit-migrate-'));
    writeFileSync(join(dir, '001_tx.sql'), "CREATE TABLE tx_lock_probe AS SELECT current_setting('lock_timeout') AS value;\n");
    writeFileSync(join(dir, '002_index.sql'), "-- migrate:no-transaction\nCREATE TABLE nt_lock_probe AS SELECT current_setting('lock_timeout') AS value;\n");
    const sql = await createDatabase();
    try {
      await applyLicensingMigrations(sql, pathToFileURL(`${dir}/`));
      const tx = await sql`SELECT value FROM tx_lock_probe`;
      const concurrent = await sql`SELECT value FROM nt_lock_probe`;
      expect(tx[0].value).toBe('5s');
      expect(concurrent[0].value).toBe('0');
    } finally {
      await sql.end({ timeout: 5 });
    }
  });

  it('lets a second runner wait while the first builds the index', async () => {
    const name = `exhibitkit_migrate_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await admin.unsafe(`CREATE DATABASE ${name}`);
    databases.push(name);
    const url = new URL(databaseUrl);
    url.pathname = `/${name}`;
    const options = {
      max: 1,
      prepare: false,
      ssl: false,
      connect_timeout: 10,
      onnotice: migrationNoticeHandler,
    };
    const runnerA = postgres(url.toString(), options);
    const runnerB = postgres(url.toString(), options);
    const logs = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((message) => {
      logs.push(String(message));
    });
    try {
      for (const filename of [
        '001_secure_licensing.sql',
        '002_beta_invites.sql',
        '003_enable_rls.sql',
      ]) {
        const contents = await readFile(new URL(filename, migrationsDir), 'utf8');
        await runnerA.unsafe(contents).simple();
      }
      await runnerA.unsafe("SET statement_timeout = '0'");
      await runnerA.unsafe(`
        INSERT INTO exhibitkit_rate_limits (action, key_hash, window_start, request_count)
        SELECT 'load', md5(g::text), timestamptz '2000-01-01' + make_interval(secs => g), 1
        FROM generate_series(1, 2000000) AS g
      `);
      await Promise.all([
        applyLicensingMigrations(runnerA, migrationsDir),
        applyLicensingMigrations(runnerB, migrationsDir),
      ]);
      expect(logs.filter((line) => line.startsWith('Applied migration 004_rate_limit_index.sql'))).toHaveLength(1);
      expect(logs.filter((line) => line.startsWith('Skipping migration 004_rate_limit_index.sql'))).toHaveLength(1);
      expect(logs.filter((line) => line.startsWith('Applied migration 005_rate_limit_cleanup.sql'))).toHaveLength(1);
      expect(logs.filter((line) => line.startsWith('Skipping migration 005_rate_limit_cleanup.sql'))).toHaveLength(1);
      const index = await runnerA`
        SELECT indisvalid
        FROM pg_index
        WHERE indexrelid = 'exhibitkit_rate_limits_window_start_idx'::regclass
      `;
      expect(index[0].indisvalid).toBe(true);
    } finally {
      logSpy.mockRestore();
      await runnerA.end({ timeout: 5 });
      await runnerB.end({ timeout: 5 });
    }
  }, 180_000);
});
