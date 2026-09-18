import postgres from 'postgres';

let database = null;

function isLocalConnection(connectionString) {
  try {
    const { hostname } = new URL(connectionString);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

/**
 * Returns a shared postgres.js SQL client. Works with any standard Postgres
 * (Supabase, Railway, Neon, self-hosted). `prepare: false` keeps it compatible
 * with transaction-mode connection poolers (e.g. Supabase's Supavisor/pgBouncer),
 * and TLS is required for hosted databases but skipped for local development.
 */
export function getDatabase() {
  if (!database) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured.');
    }
    database = postgres(connectionString, {
      prepare: false,
      ssl: isLocalConnection(connectionString) ? false : 'require',
      max: 1,
      idle_timeout: 20,
    });
  }
  return database;
}

export function resetDatabaseForTesting() {
  database = null;
}
