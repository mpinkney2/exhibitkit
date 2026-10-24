import { getDatabase } from './database.js';
import { HttpError } from './http.js';
import { hashRateLimitKey } from './license-crypto.js';

const RATE_LIMIT_SECRET_LABEL = 'RATE_LIMIT_HASH_SECRET or LICENSE_HASH_SECRET';

export function missingRateLimitSettings() {
  const missing = [];
  if (!String(process.env.DATABASE_URL || '').trim()) {
    missing.push('DATABASE_URL');
  }
  const secret = String(
    process.env.RATE_LIMIT_HASH_SECRET || process.env.LICENSE_HASH_SECRET || '',
  ).trim();
  if (secret.length < 32) {
    missing.push(RATE_LIMIT_SECRET_LABEL);
  }
  return missing;
}

export function assertRateLimitConfigured() {
  const missing = missingRateLimitSettings();
  if (missing.length === 0) return;
  console.error('ExhibitKIT rate limiting is not configured.', missing.join(', '));
  throw new HttpError(
    503,
    'Rate limiting is not configured on the server.',
    'RATE_LIMIT_NOT_CONFIGURED',
  );
}

export async function consumeRateLimit(action, rawKey, limit, windowSeconds) {
  const sql = getDatabase();
  const keyHash = hashRateLimitKey(rawKey);
  const rows = await sql`
    SELECT exhibitkit_consume_rate_limit(
      ${action},
      ${keyHash},
      ${limit},
      ${windowSeconds}
    ) AS allowed
  `;
  return rows[0]?.allowed === true;
}
