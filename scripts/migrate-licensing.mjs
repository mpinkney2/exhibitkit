import { readFile } from 'node:fs/promises';
import { Client, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Pull or add it to .env.local first.');
}

const migrationUrl = new URL('../db/migrations/001_secure_licensing.sql', import.meta.url);
const migration = await readFile(migrationUrl, 'utf8');
neonConfig.webSocketConstructor = ws;
const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
  await client.query(migration);
  console.log('ExhibitKIT licensing database is ready.');
} finally {
  await client.end();
}
