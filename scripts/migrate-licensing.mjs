import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Pull or add it to .env.local first.');
}

const connectionString = process.env.DATABASE_URL;

function isLocalConnection(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

const migrationsDir = new URL('../db/migrations/', import.meta.url);
const migrationFiles = (await readdir(migrationsDir))
  .filter((name) => name.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  throw new Error('No SQL migrations found in db/migrations.');
}

const sql = postgres(connectionString, {
  prepare: false,
  ssl: isLocalConnection(connectionString) ? false : 'require',
  max: 1,
});

try {
  for (const name of migrationFiles) {
    const contents = await readFile(new URL(name, migrationsDir), 'utf8');
    // Migrations contain multiple statements and dollar-quoted PL/pgSQL; run them
    // through the simple query protocol.
    await sql.unsafe(contents).simple();
    console.log(`Applied migration ${name}.`);
  }
  console.log('ExhibitKIT licensing database is ready.');
} finally {
  await sql.end();
}
