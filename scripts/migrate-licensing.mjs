import { readFile, readdir } from 'node:fs/promises';
import { Client, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Pull or add it to .env.local first.');
}

const migrationsDir = new URL('../db/migrations/', import.meta.url);
const migrationFiles = (await readdir(migrationsDir))
  .filter((name) => name.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  throw new Error('No SQL migrations found in db/migrations.');
}

neonConfig.webSocketConstructor = ws;
const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
  for (const name of migrationFiles) {
    const sql = await readFile(new URL(name, migrationsDir), 'utf8');
    await client.query(sql);
    console.log(`Applied migration ${name}.`);
  }
  console.log('ExhibitKIT licensing database is ready.');
} finally {
  await client.end();
}
