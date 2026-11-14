import { issueEntitlementToken } from './entitlement-token.js';

export function entitlementFromDatabase(row, activationToken, fingerprint = null, workstationId = null) {
  const signed = issueEntitlementToken({
    plan: row.plan,
    licenseId: row.license_id || row.id,
    licenseExpiresAt: row.expires_at,
    workstationId,
  });

  return {
    plan: row.plan,
    purchasedAt: new Date(row.purchased_at).toISOString(),
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    casePassStatus: row.plan === 'case_pass' ? 'active' : 'none',
    updatesIncludedUntil: row.updates_included_until
      ? new Date(row.updates_included_until).toISOString()
      : null,
    updateRenewalStatus: row.updates_included_until ? 'included' : 'none',
    purchasedVersion: row.purchased_version || null,
    serverVerified: true,
    verifiedAt: signed.issuedAt,
    entitlementToken: signed.token,
    activationToken,
    licenseFingerprint: fingerprint || row.license_fingerprint || null,
    licenseEmail: cleanLicenseEmail(row.customer_email),
    licenseSource: cleanLicenseSource(row.source),
    migratedFromLegacy: false,
  };
}

function cleanLicenseEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function cleanLicenseSource(value) {
  const source = String(value || '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,32}$/.test(source) ? source : null;
}
