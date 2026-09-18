import { getDatabase } from './database.js';
import { hashRateLimitKey } from './license-crypto.js';

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
