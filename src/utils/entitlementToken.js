/**
 * Signed entitlement and founder tokens.
 *
 * The server signs with ENTITLEMENT_SIGNING_KEY. The browser only has the
 * matching public key (VITE_ENTITLEMENT_PUBLIC_KEY) and checks the signature
 * on every read. Tokens are `base64url(payload).base64url(signature)`.
 */

import { ed25519 } from '@noble/curves/ed25519.js';

/** Offline use after the last signed issuance. Never extends past token expiry. */
export const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/** Lifetime of a founder unlock token issued by /api/founder/unlock. */
export const FOUNDER_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

const MAX_FOUNDER_TOKEN_MS = 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 2 * 60 * 1000;
const PAID_PLANS = new Set(['case_pass', 'pro_perpetual', 'firm']);

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function bytesToBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary);
}

export function base64ToBytes(value) {
  const normalized = String(value || '').trim().replace(/-/g, '+').replace(/_/g, '/');
  if (!normalized) return new Uint8Array();
  const padded = normalized + (normalized.length % 4 === 0
    ? ''
    : '='.repeat(4 - (normalized.length % 4)));
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function encodePart(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function signPayload(payload, secretKey) {
  if (!(secretKey instanceof Uint8Array) || secretKey.length !== 32) {
    throw new Error('Entitlement signing key is unavailable.');
  }
  const payloadPart = encodePart(textEncoder.encode(JSON.stringify(payload)));
  const signature = ed25519.sign(textEncoder.encode(payloadPart), secretKey);
  return `${payloadPart}.${encodePart(signature)}`;
}

function openToken(token, publicKey) {
  if (!(publicKey instanceof Uint8Array) || publicKey.length !== 32) return null;
  const parts = String(token || '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const valid = ed25519.verify(
      base64ToBytes(parts[1]),
      textEncoder.encode(parts[0]),
      publicKey,
      { zip215: false },
    );
    if (!valid) return null;
    const parsed = JSON.parse(textDecoder.decode(base64ToBytes(parts[0])));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function readConfiguredPublicKey() {
  try {
    const configured = import.meta.env?.VITE_ENTITLEMENT_PUBLIC_KEY || '';
    if (!String(configured).trim()) return null;
    const bytes = base64ToBytes(configured);
    return bytes.length === 32 ? bytes : null;
  } catch {
    return null;
  }
}

function resolvePublicKey(publicKey) {
  if (publicKey instanceof Uint8Array) return publicKey.length === 32 ? publicKey : null;
  if (typeof publicKey === 'string' && publicKey.trim()) {
    try {
      const bytes = base64ToBytes(publicKey);
      return bytes.length === 32 ? bytes : null;
    } catch {
      return null;
    }
  }
  return readConfiguredPublicKey();
}

export function signEntitlementToken(claims, secretKey) {
  const plan = claims?.plan;
  const licenseId = String(claims?.licenseId || '');
  const issuedAt = Date.parse(claims?.issuedAt);
  const expiry = Date.parse(claims?.expiry);
  if (!PAID_PLANS.has(plan)) throw new Error('Entitlement plan cannot be signed.');
  if (!licenseId || licenseId.length > 128) throw new Error('Entitlement license id cannot be signed.');
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiry) || expiry <= issuedAt) {
    throw new Error('Entitlement expiry cannot be signed.');
  }
  return signPayload({
    typ: 'entitlement',
    plan,
    expiry: new Date(expiry).toISOString(),
    licenseId,
    issuedAt: new Date(issuedAt).toISOString(),
  }, secretKey);
}

/**
 * True when a signature-valid entitlement is still inside its offline grace
 * window and has not passed its signed expiry.
 */
export function isEntitlementTokenInForce(claims, now = Date.now()) {
  if (!claims || claims.typ !== 'entitlement' || !PAID_PLANS.has(claims.plan)) return false;
  const issuedAt = Date.parse(claims.issuedAt);
  const expiry = Date.parse(claims.expiry);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiry) || expiry <= issuedAt) return false;
  if (now + CLOCK_SKEW_MS < issuedAt) return false;
  const accessUntil = Math.min(expiry, issuedAt + OFFLINE_GRACE_MS);
  return now <= accessUntil;
}

export function verifyEntitlementToken(token, publicKey) {
  const claims = openToken(token, resolvePublicKey(publicKey));
  if (!claims || claims.typ !== 'entitlement' || !PAID_PLANS.has(claims.plan)) return null;
  if (typeof claims.licenseId !== 'string' || claims.licenseId.length < 1 || claims.licenseId.length > 128) {
    return null;
  }
  const issuedAt = Date.parse(claims.issuedAt);
  const expiry = Date.parse(claims.expiry);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiry) || expiry <= issuedAt) return null;
  return {
    typ: 'entitlement',
    plan: claims.plan,
    expiry: new Date(expiry).toISOString(),
    licenseId: claims.licenseId,
    issuedAt: new Date(issuedAt).toISOString(),
  };
}

export function signFounderToken(claims, secretKey) {
  const issuedAt = Date.parse(claims?.issuedAt);
  const expiry = Date.parse(claims?.expiry);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiry) || expiry <= issuedAt) {
    throw new Error('Founder token expiry cannot be signed.');
  }
  if (expiry - issuedAt > MAX_FOUNDER_TOKEN_MS) {
    throw new Error('Founder token lifetime cannot be signed.');
  }
  return signPayload({
    typ: 'founder',
    issuedAt: new Date(issuedAt).toISOString(),
    expiry: new Date(expiry).toISOString(),
  }, secretKey);
}

export function verifyFounderToken(token, publicKey, now = Date.now()) {
  const claims = openToken(token, resolvePublicKey(publicKey));
  if (!claims || claims.typ !== 'founder') return null;
  const issuedAt = Date.parse(claims.issuedAt);
  const expiry = Date.parse(claims.expiry);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiry) || expiry <= issuedAt) return null;
  if (expiry - issuedAt > MAX_FOUNDER_TOKEN_MS) return null;
  if (now + CLOCK_SKEW_MS < issuedAt || now > expiry) return null;
  return {
    typ: 'founder',
    issuedAt: new Date(issuedAt).toISOString(),
    expiry: new Date(expiry).toISOString(),
  };
}
