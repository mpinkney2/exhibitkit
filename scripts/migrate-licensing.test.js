// @vitest-environment node
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  applyLicensingMigrations,
  isNoTransactionMigration,
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
      expect(logs.filter((line) => line.startsWith('Applied migration 004_rate_limit_index.sql'))).toHaveLength(1);
      expect(logs.filter((line) => line.startsWith('Skipping migration 004_rate_limit_index.sql'))).toHaveLength(1);
      expect(logs.filter((line) => line.startsWith('Skipping migration 005_rate_limit_cleanup.sql'))).toHaveLength(1);
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
});
