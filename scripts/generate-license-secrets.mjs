import { randomBytes } from 'node:crypto';

console.log(`LICENSE_HASH_SECRET=${randomBytes(48).toString('base64url')}`);
console.log(`RATE_LIMIT_HASH_SECRET=${randomBytes(48).toString('base64url')}`);
console.log(`LICENSE_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}`);
