/**
 * Signed entitlement and founder tokens.
 *
 * The server signs with ENTITLEMENT_SIGNING_KEY. The browser only has public
 * keys (VITE_ENTITLEMENT_PUBLIC_KEY, plus optional overlap keys) and checks
 * the signature on every read. Tokens are `base64url(payload).base64url(signature)`.
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';

/** Offline use after the last signed issuance. Never extends past token expiry. */
export const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/** Lifetime of a founder unlock token issued by /api/founder/unlock. */
export const FOUNDER_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

/** Key id used when a token or deployment does not name one. */
export const DEFAULT_ENTITLEMENT_KEY_ID = 'current';

export const CONFIGURATION_MESSAGE =
  'This installation cannot verify the license signature. The activation on this browser is unchanged.';

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

function decodePublicKey(value) {
  try {
    const bytes = base64ToBytes(value);
    return bytes.length === 32 ? bytes : null;
  } catch {
    return null;
  }
}

/**
 * Production builds must be able to verify tokens. Accepts a 32-byte primary
 * public key and, when set, a JSON map of additional key ids.
 */
export function assertEntitlementPublicKeyConfig(env = {}) {
  if (!decodePublicKey(env.VITE_ENTITLEMENT_PUBLIC_KEY)) {
    throw new Error('VITE_ENTITLEMENT_PUBLIC_KEY must decode to 32 bytes.');
  }
  const extra = env.VITE_ENTITLEMENT_ADDITIONAL_PUBLIC_KEYS;
  if (extra == null || String(extra).trim() === '') return;
  let parsed;
  try {
    parsed = JSON.parse(extra);
  } catch {
    throw new Error('VITE_ENTITLEMENT_ADDITIONAL_PUBLIC_KEYS must be a JSON object of key ids to 32-byte public keys.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('VITE_ENTITLEMENT_ADDITIONAL_PUBLIC_KEYS must be a JSON object of key ids to 32-byte public keys.');
  }
  for (const [kid, value] of Object.entries(parsed)) {
    if (!String(kid).trim() || !decodePublicKey(value)) {
      throw new Error('VITE_ENTITLEMENT_ADDITIONAL_PUBLIC_KEYS must be a JSON object of key ids to 32-byte public keys.');
    }
  }
}

function readEnvPublicKeys() {
  const keys = new Map();
  const primary = decodePublicKey(import.meta.env?.VITE_ENTITLEMENT_PUBLIC_KEY || '');
  const primaryId = String(import.meta.env?.VITE_ENTITLEMENT_PUBLIC_KEY_ID || DEFAULT_ENTITLEMENT_KEY_ID).trim()
    || DEFAULT_ENTITLEMENT_KEY_ID;
  if (primary) keys.set(primaryId, primary);
  const extraRaw = import.meta.env?.VITE_ENTITLEMENT_ADDITIONAL_PUBLIC_KEYS || '';
  if (!String(extraRaw).trim()) return keys;
  try {
    const parsed = JSON.parse(extraRaw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return keys;
    for (const [kid, value] of Object.entries(parsed)) {
      const bytes = decodePublicKey(value);
      if (bytes && String(kid).trim()) keys.set(String(kid), bytes);
    }
  } catch {
    // A bad overlap map does not discard the primary key.
  }
  return keys;
}

/**
 * A caller-supplied key is used for the token's key id. Otherwise the
 * configured set is used.
 */
function resolveKeyMaterial(publicKey) {
  if (publicKey instanceof Uint8Array || typeof publicKey === 'string') {
    const bytes = publicKey instanceof Uint8Array ? publicKey : decodePublicKey(publicKey);
    return { explicit: bytes && bytes.length === 32 ? bytes : null };
  }
  if (publicKey instanceof Map) return { map: publicKey };
  return { map: readEnvPublicKeys() };
}

function keyForKid(material, kid) {
  if (Object.prototype.hasOwnProperty.call(material, 'explicit')) {
    return material.explicit
      ? { key: material.explicit }
      : { status: 'misconfigured', reason: 'missing-public-key' };
  }
  const map = material.map;
  if (!map || map.size === 0) return { status: 'misconfigured', reason: 'missing-public-key' };
  const key = map.get(kid);
  if (!key) return { status: 'misconfigured', reason: 'unknown-key' };
  return { key };
}

function readEnvelope(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const parsed = JSON.parse(textDecoder.decode(base64ToBytes(parts[0])));
    if (!parsed || typeof parsed !== 'object') return null;
    return { payloadPart: parts[0], signaturePart: parts[1], payload: parsed };
  } catch {
    return null;
  }
}

function signatureMatches(envelope, publicKey) {
  try {
    return ed25519.verify(
      base64ToBytes(envelope.signaturePart),
      textEncoder.encode(envelope.payloadPart),
      publicKey,
      { zip215: false },
    );
  } catch {
    return false;
  }
}

function signPayload(payload, secretKey) {
  if (!(secretKey instanceof Uint8Array) || secretKey.length !== 32) {
    throw new Error('Entitlement signing key is unavailable.');
  }
  const payloadPart = encodePart(textEncoder.encode(JSON.stringify(payload)));
  const signature = ed25519.sign(textEncoder.encode(payloadPart), secretKey);
  return `${payloadPart}.${encodePart(signature)}`;
}

/** SHA-256 of the workstation id, comparable on the client without a server secret. */
export function workstationClaimHash(workstationId) {
  const id = String(workstationId || '').trim();
  if (!id) return '';
  return bytesToBase64(sha256(textEncoder.encode(id)));
}

export function workstationClaimMatches(claims, workstationId) {
  const expected = String(claims?.workstationHash || '');
  const actual = workstationClaimHash(workstationId);
  return Boolean(expected) && expected === actual;
}

export function signEntitlementToken(claims, secretKey) {
  const plan = claims?.plan;
  const licenseId = String(claims?.licenseId || '');
  const issuedAt = Date.parse(claims?.issuedAt);
  const expiry = Date.parse(claims?.expiry);
  const kid = String(claims?.kid || DEFAULT_ENTITLEMENT_KEY_ID).trim() || DEFAULT_ENTITLEMENT_KEY_ID;
  const workstationHash = String(claims?.workstationHash || '');
  if (!PAID_PLANS.has(plan)) throw new Error('Entitlement plan cannot be signed.');
  if (!licenseId || licenseId.length > 128) throw new Error('Entitlement license id cannot be signed.');
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiry) || expiry <= issuedAt) {
    throw new Error('Entitlement expiry cannot be signed.');
  }
  if (workstationHash.length < 40 || workstationHash.length > 128) {
    throw new Error('Entitlement workstation cannot be signed.');
  }
  return signPayload({
    typ: 'entitlement',
    kid,
    plan,
    expiry: new Date(expiry).toISOString(),
    licenseId,
    issuedAt: new Date(issuedAt).toISOString(),
    workstationHash,
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

function entitlementClaims(payload) {
  if (!payload || payload.typ !== 'entitlement' || !PAID_PLANS.has(payload.plan)) return null;
  if (typeof payload.licenseId !== 'string' || payload.licenseId.length < 1 || payload.licenseId.length > 128) {
    return null;
  }
  const issuedAt = Date.parse(payload.issuedAt);
  const expiry = Date.parse(payload.expiry);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiry) || expiry <= issuedAt) return null;
  const workstationHash = String(payload.workstationHash || '');
  if (workstationHash.length < 40 || workstationHash.length > 128) return null;
  return {
    typ: 'entitlement',
    kid: String(payload.kid || DEFAULT_ENTITLEMENT_KEY_ID),
    plan: payload.plan,
    expiry: new Date(expiry).toISOString(),
    licenseId: payload.licenseId,
    issuedAt: new Date(issuedAt).toISOString(),
    workstationHash,
  };
}

/**
 * Classify a token without granting access.
 * misconfigured: the installation cannot check the signature (missing key,
 * unknown key id, or a signature that does not match the key set).
 * rejected: the token is not a well-formed entitlement.
 * valid: signature matches. Expiry and workstation are separate checks.
 */
export function inspectEntitlementToken(token, publicKey) {
  if (!String(token || '').trim()) return { status: 'absent' };
  const envelope = readEnvelope(token);
  if (!envelope) return { status: 'rejected', reason: 'malformed' };
  const kid = String(envelope.payload.kid || DEFAULT_ENTITLEMENT_KEY_ID).trim() || DEFAULT_ENTITLEMENT_KEY_ID;
  const selected = keyForKid(resolveKeyMaterial(publicKey), kid);
  if (selected.status) return { status: selected.status, reason: selected.reason };
  if (!signatureMatches(envelope, selected.key)) {
    return { status: 'misconfigured', reason: 'signature' };
  }
  const claims = entitlementClaims(envelope.payload);
  if (!claims) return { status: 'rejected', reason: 'malformed' };
  return { status: 'valid', claims };
}

export function verifyEntitlementToken(token, publicKey) {
  const inspection = inspectEntitlementToken(token, publicKey);
  return inspection.status === 'valid' ? inspection.claims : null;
}

export function signFounderToken(claims, secretKey) {
  const issuedAt = Date.parse(claims?.issuedAt);
  const expiry = Date.parse(claims?.expiry);
  const kid = String(claims?.kid || DEFAULT_ENTITLEMENT_KEY_ID).trim() || DEFAULT_ENTITLEMENT_KEY_ID;
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiry) || expiry <= issuedAt) {
    throw new Error('Founder token expiry cannot be signed.');
  }
  if (expiry - issuedAt > MAX_FOUNDER_TOKEN_MS) {
    throw new Error('Founder token lifetime cannot be signed.');
  }
  return signPayload({
    typ: 'founder',
    kid,
    issuedAt: new Date(issuedAt).toISOString(),
    expiry: new Date(expiry).toISOString(),
  }, secretKey);
}

export function verifyFounderToken(token, publicKey, now = Date.now()) {
  const envelope = readEnvelope(token);
  if (!envelope || envelope.payload.typ !== 'founder') return null;
  const kid = String(envelope.payload.kid || DEFAULT_ENTITLEMENT_KEY_ID).trim() || DEFAULT_ENTITLEMENT_KEY_ID;
  const selected = keyForKid(resolveKeyMaterial(publicKey), kid);
  if (!selected.key || !signatureMatches(envelope, selected.key)) return null;
  const issuedAt = Date.parse(envelope.payload.issuedAt);
  const expiry = Date.parse(envelope.payload.expiry);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiry) || expiry <= issuedAt) return null;
  if (expiry - issuedAt > MAX_FOUNDER_TOKEN_MS) return null;
  if (now + CLOCK_SKEW_MS < issuedAt || now > expiry) return null;
  return {
    typ: 'founder',
    kid,
    issuedAt: new Date(issuedAt).toISOString(),
    expiry: new Date(expiry).toISOString(),
  };
}
