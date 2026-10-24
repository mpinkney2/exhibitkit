import { HttpError } from './http.js';
import {
  FOUNDER_TOKEN_TTL_MS,
  base64ToBytes,
  signEntitlementToken,
  signFounderToken,
} from '../../src/utils/entitlementToken.js';

/** Signed lifetime for plans that do not themselves expire (Pro / Firm). */
export const PERPETUAL_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const SIGNING_UNAVAILABLE = 'License signing is not configured on the server.';

function signingSeed() {
  const raw = String(process.env.ENTITLEMENT_SIGNING_KEY || '').trim();
  if (!raw) {
    throw new HttpError(503, SIGNING_UNAVAILABLE, 'ENTITLEMENT_SIGNING_UNAVAILABLE');
  }
  try {
    const seed = base64ToBytes(raw);
    if (seed.length !== 32) throw new Error('bad length');
    return seed;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, SIGNING_UNAVAILABLE, 'ENTITLEMENT_SIGNING_UNAVAILABLE');
  }
}

/**
 * Issue an Ed25519 entitlement token.
 * Claims: plan, expiry, license id, issued-at.
 * Expiry is the license end when the license expires, otherwise a bounded token lifetime.
 */
export function issueEntitlementToken({
  plan,
  licenseId,
  licenseExpiresAt = null,
  now = new Date(),
} = {}) {
  const id = String(licenseId || '').trim();
  if (!id) {
    throw new HttpError(503, SIGNING_UNAVAILABLE, 'ENTITLEMENT_SIGNING_UNAVAILABLE');
  }
  const issuedAt = now instanceof Date ? now : new Date(now);
  const licenseExpiry = licenseExpiresAt ? new Date(licenseExpiresAt) : null;
  const expiry = licenseExpiry && Number.isFinite(licenseExpiry.getTime())
    ? licenseExpiry
    : new Date(issuedAt.getTime() + PERPETUAL_TOKEN_TTL_MS);

  try {
    const token = signEntitlementToken({
      plan,
      licenseId: id,
      expiry: expiry.toISOString(),
      issuedAt: issuedAt.toISOString(),
    }, signingSeed());
    return {
      token,
      issuedAt: issuedAt.toISOString(),
      expiry: expiry.toISOString(),
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error('ExhibitKIT entitlement token was not issued');
    throw new HttpError(503, SIGNING_UNAVAILABLE, 'ENTITLEMENT_SIGNING_UNAVAILABLE');
  }
}

/** Short-lived founder session token. Not an entitlement. */
export function issueFounderToken(now = new Date()) {
  const issuedAt = now instanceof Date ? now : new Date(now);
  const expiry = new Date(issuedAt.getTime() + FOUNDER_TOKEN_TTL_MS);
  try {
    return signFounderToken({
      issuedAt: issuedAt.toISOString(),
      expiry: expiry.toISOString(),
    }, signingSeed());
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error('ExhibitKIT founder token was not issued');
    throw new HttpError(503, SIGNING_UNAVAILABLE, 'ENTITLEMENT_SIGNING_UNAVAILABLE');
  }
}
