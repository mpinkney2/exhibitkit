import { randomBytes } from 'node:crypto';
import { ed25519 } from '@noble/curves/ed25519.js';
import { bytesToBase64 } from '../src/utils/entitlementToken.js';

console.log(`LICENSE_HASH_SECRET=${randomBytes(48).toString('base64url')}`);
console.log(`RATE_LIMIT_HASH_SECRET=${randomBytes(48).toString('base64url')}`);
console.log(`LICENSE_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}`);

const { secretKey, publicKey } = ed25519.keygen();
console.log(`ENTITLEMENT_SIGNING_KEY=${bytesToBase64(secretKey)}`);
console.log(`VITE_ENTITLEMENT_PUBLIC_KEY=${bytesToBase64(publicKey)}`);
