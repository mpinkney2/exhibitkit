import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import postgres from 'postgres';

const MIGRATION_MARKER = '-- migrate:no-transaction';
const RATE_LIMIT_INDEX = 'exhibitkit_rate_limits_window_start_idx';
const BASELINE_MIGRATIONS = [
  '001_secure_licensing.sql',
  '002_beta_invites.sql',
  '003_enable_rls.sql',
];

export function isNoTransactionMigration(contents) {
  const firstLine = contents.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0].trim();
  return firstLine === MIGRATION_MARKER;
}

export function statementsOutsideTransaction(contents) {
  return contents
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export function requireOneNoTransactionStatement(name, contents) {
  const statements = statementsOutsideTransaction(contents);
  if (statements.length !== 1) {
    throw new Error(
      `Migration ${name} is marked ${MIGRATION_MARKER} and must contain exactly one statement.`,
    );
  }
  return statements[0];
}

const MIGRATION_LOCK_KEY = 'exhibitkit_schema_migrations';
const LOCK_POLL_INTERVAL_MS = 500;
const LOCK_WAIT_TIMEOUT_MS = 15 * 60 * 1000;

export function migrationNoticeHandler(notice) {
  if (notice?.code === '42P07') return;
  console.log(notice?.message || notice);
}

async function listMigrationFiles(migrationsDir) {
  const migrationFiles = (await readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  if (migrationFiles.length === 0) {
    throw new Error('No SQL migrations found in db/migrations.');
  }
  return migrationFiles;
}

async function ensureMigrationsTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS exhibitkit_schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

async function baselineExistingDatabase(sql, migrationFiles) {
  const [{ count }] = await sql`
    SELECT count(*)::int AS count FROM exhibitkit_schema_migrations
  `;
  if (count > 0) return;

  const [{ ready }] = await sql`
    SELECT (
      to_regclass('public.exhibitkit_licenses') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'exhibitkit_licenses'
          AND column_name = 'source'
      )
      AND EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'exhibitkit_licenses'
          AND c.relrowsecurity
      )
    ) AS ready
  `;
  if (!ready) return;

  const present = BASELINE_MIGRATIONS.filter((name) => migrationFiles.includes(name));
  for (const name of present) {
    await sql`
      INSERT INTO exhibitkit_schema_migrations (filename)
      VALUES (${name})
      ON CONFLICT (filename) DO NOTHING
    `;
  }
  console.log(`Recorded already-applied migrations: ${present.join(', ')}.`);
}

export async function assertRateLimitIndexValid(sql, { required = false } = {}) {
  const rows = await sql`
    SELECT indisvalid
    FROM pg_index
    WHERE indexrelid = to_regclass('public.exhibitkit_rate_limits_window_start_idx')
  `;
  if (rows.length === 0) {
    if (required) {
      throw new Error(
        `${RATE_LIMIT_INDEX} is missing. Migration 004_rate_limit_index.sql is recorded, so the index should exist.`,
      );
    }
    return;
  }
  if (rows[0].indisvalid !== true) {
    throw new Error(
      `${RATE_LIMIT_INDEX} exists but is invalid. Drop it with DROP INDEX CONCURRENTLY and run the migration again.`,
    );
  }
}

async function recordMigration(sql, name) {
  await sql`
    INSERT INTO exhibitkit_schema_migrations (filename)
    VALUES (${name})
  `;
}

function sleep(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

// Session-level try-lock. A blocking pg_advisory_lock holds a snapshot that
// CREATE INDEX CONCURRENTLY waits on, and the index build waits on that lock.
export async function acquireMigrationLock(sql, {
  pollIntervalMs = LOCK_POLL_INTERVAL_MS,
  timeoutMs = LOCK_WAIT_TIMEOUT_MS,
} = {}) {
  const started = Date.now();
  for (;;) {
    const [row] = await sql`
      SELECT pg_try_advisory_lock(hashtext(${MIGRATION_LOCK_KEY})) AS locked
    `;
    if (row?.locked === true) return;
    if (Date.now() - started >= timeoutMs) {
      throw new Error(`Timed out waiting for the migration lock after ${timeoutMs}ms.`);
    }
    await sleep(pollIntervalMs);
  }
}

export async function rethrowIndexLockTimeout(sql, name, error) {
  if (error?.code !== '55P03') throw error;
  await sql.unsafe('ROLLBACK').simple().catch(() => {});
  await sql.unsafe(`DROP INDEX CONCURRENTLY IF EXISTS ${RATE_LIMIT_INDEX}`).simple().catch(() => {});
  throw new Error(
    `${name} stopped because a lock was unavailable (55P03). ${RATE_LIMIT_INDEX} was dropped if it was left invalid. Retry the migration.`,
  );
}

async function releaseMigrationLock(sql) {
  await sql.unsafe('ROLLBACK').simple().catch(() => {});
  try {
    await sql`SELECT pg_advisory_unlock(hashtext(${MIGRATION_LOCK_KEY}))`;
  } catch {
    // A failed unlock must not replace the migration error.
  }
}

export async function applyLicensingMigrations(sql, migrationsDir) {
  const migrationFiles = await listMigrationFiles(migrationsDir);
  await acquireMigrationLock(sql);
  try {
    // Session settings do not carry between connections. Transactional files
    // keep a short lock timeout. Concurrent index builds wait (lock_timeout 0)
    // so a busy transaction cannot abort them and leave an invalid index.
    await sql.unsafe("SET lock_timeout = '5s'");
    await ensureMigrationsTable(sql);
    await baselineExistingDatabase(sql, migrationFiles);

    for (const name of migrationFiles) {
      const applied = await sql`
        SELECT 1 FROM exhibitkit_schema_migrations WHERE filename = ${name}
      `;
      if (applied.length > 0) {
        if (name === '004_rate_limit_index.sql') {
          await assertRateLimitIndexValid(sql, { required: true });
        }
        console.log(`Skipping migration ${name}; already applied.`);
        continue;
      }

      const contents = await readFile(new URL(name, migrationsDir), 'utf8');
      if (isNoTransactionMigration(contents)) {
        await sql.unsafe("SET lock_timeout = '0'");
        await sql.unsafe("SET statement_timeout = '0'");
        try {
          const statement = requireOneNoTransactionStatement(name, contents);
          await sql.unsafe(statement).simple();
        } catch (error) {
          await rethrowIndexLockTimeout(sql, name, error);
        } finally {
          await sql.unsafe("SET lock_timeout = '5s'").catch(() => {});
        }
        await assertRateLimitIndexValid(sql);
        await recordMigration(sql, name);
        console.log(`Applied migration ${name} outside a transaction.`);
        continue;
      }

      await sql.unsafe("SET lock_timeout = '5s'");
      await sql.unsafe(contents).simple();
      await recordMigration(sql, name);
      console.log(`Applied migration ${name}.`);
    }

    await assertRateLimitIndexValid(sql);
    console.log('ExhibitKIT licensing database is ready.');
  } finally {
    await releaseMigrationLock(sql);
  }
}

function isLocalConnection(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (invokedDirectly()) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Pull or add it to .env.local first.');
  }

  const connectionString = process.env.DATABASE_URL;
  const migrationsDir = new URL('../db/migrations/', import.meta.url);
  const sql = postgres(connectionString, {
    prepare: false,
    ssl: isLocalConnection(connectionString) ? false : 'require',
    max: 1,
    onnotice: migrationNoticeHandler,
  });

  try {
    await applyLicensingMigrations(sql, migrationsDir);
  } finally {
    await sql.end();
  }
}
