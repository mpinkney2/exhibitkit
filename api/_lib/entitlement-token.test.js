// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';
import { entitlementFromDatabase } from './entitlement-response.js';
import { issueEntitlementToken, issueFounderToken } from './entitlement-token.js';
import {
  bytesToBase64,
  isEntitlementTokenInForce,
  OFFLINE_GRACE_MS,
  verifyEntitlementToken,
  verifyFounderToken,
} from '../../src/utils/entitlementToken.js';

const { secretKey, publicKey } = ed25519.keygen();

function useSigningKey() {
  process.env.ENTITLEMENT_SIGNING_KEY = bytesToBase64(secretKey);
}

afterEach(() => {
  delete process.env.ENTITLEMENT_SIGNING_KEY;
});

describe('entitlement tokens', () => {
  it('signs plan, expiry, license id, and issued-at for the client to verify', () => {
    useSigningKey();
    const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const entitlement = entitlementFromDatabase({
      plan: 'case_pass',
      license_id: 'lic_db_1',
      purchased_at: '2026-10-01T00:00:00.000Z',
      expires_at: expiresAt,
      updates_included_until: null,
      purchased_version: 'v1.0.0',
      license_fingerprint: '••••-DB01',
    }, 'activation-token-value');

    const claims = verifyEntitlementToken(entitlement.entitlementToken, publicKey);
    expect(claims).toMatchObject({
      typ: 'entitlement',
      plan: 'case_pass',
      licenseId: 'lic_db_1',
      expiry: new Date(expiresAt).toISOString(),
    });
    expect(Date.parse(claims.issuedAt)).toBeGreaterThan(Date.now() - 5000);
    expect(isEntitlementTokenInForce(claims)).toBe(true);
    expect(entitlement.plan).toBe('case_pass');
  });

  it('caps perpetual tokens with a signed expiry and a 7-day offline grace', () => {
    useSigningKey();
    const issued = issueEntitlementToken({
      plan: 'pro_perpetual',
      licenseId: 'lic_pro_1',
      now: new Date('2026-10-01T00:00:00.000Z'),
    });
    const claims = verifyEntitlementToken(issued.token, publicKey);
    const issuedAt = Date.parse(claims.issuedAt);
    const expiry = Date.parse(claims.expiry);
    expect(expiry - issuedAt).toBe(30 * 24 * 60 * 60 * 1000);
    expect(isEntitlementTokenInForce(claims, issuedAt + OFFLINE_GRACE_MS)).toBe(true);
    expect(isEntitlementTokenInForce(claims, issuedAt + OFFLINE_GRACE_MS + 1000)).toBe(false);
    expect(isEntitlementTokenInForce(claims, expiry + 1000)).toBe(false);
  });

  it('rejects a tampered token and does not treat a founder token as an entitlement', () => {
    useSigningKey();
    const issued = issueEntitlementToken({
      plan: 'pro_perpetual',
      licenseId: 'lic_pro_2',
    });
    const tampered = `${issued.token.slice(0, -2)}aa`;
    expect(verifyEntitlementToken(tampered, publicKey)).toBeNull();

    const founderToken = issueFounderToken();
    expect(verifyFounderToken(founderToken, publicKey)?.typ).toBe('founder');
    expect(verifyEntitlementToken(founderToken, publicKey)).toBeNull();
  });

  it('refuses to issue a token without a signing key', () => {
    expect(() => issueEntitlementToken({
      plan: 'pro_perpetual',
      licenseId: 'lic_missing',
    })).toThrow(/not configured/i);
  });
});
