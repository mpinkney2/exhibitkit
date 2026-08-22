export function entitlementFromDatabase(row, activationToken, fingerprint = null) {
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
    verifiedAt: new Date().toISOString(),
    activationToken,
    licenseFingerprint: fingerprint || row.license_fingerprint || null,
    migratedFromLegacy: false,
  };
}
