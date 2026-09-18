import { neon } from '@neondatabase/serverless';

let database = null;

export function getDatabase() {
  if (!database) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured.');
    }
    database = neon(process.env.DATABASE_URL);
  }
  return database;
}

export function resetDatabaseForTesting() {
  database = null;
}
