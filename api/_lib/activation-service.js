import {
  generateActivationToken,
  hashActivationToken,
  hashLicenseKey,
  hashWorkstationId,
  isLicenseKeyFormat,
  isWorkstationIdFormat,
  licenseFingerprint,
  normalizeLicenseKey,
} from './license-crypto.js';
import {
  activateLicense,
  transferLicense,
} from './license-repository.js';
import { entitlementFromDatabase } from './entitlement-response.js';
import { HttpError } from './http.js';

function cleanAppVersion(value) {
  const version = String(value || '').trim();
  return /^[a-zA-Z0-9._-]{1,40}$/.test(version) ? version : 'unknown';
}

export async function activateLicenseKey(body, { transfer = false } = {}) {
  const licenseKey = normalizeLicenseKey(body.licenseKey);
  const workstationId = String(body.workstationId || '').trim();

  if (!isLicenseKeyFormat(licenseKey)) {
    throw new HttpError(400, 'Enter a valid ExhibitKIT license key.', 'INVALID_LICENSE');
  }
  if (!isWorkstationIdFormat(workstationId)) {
    throw new HttpError(400, 'This workstation identifier is invalid.', 'INVALID_WORKSTATION');
  }

  const activationToken = generateActivationToken();
  const record = {
    licenseKeyHash: hashLicenseKey(licenseKey),
    workstationHash: hashWorkstationId(workstationId),
    workstationLabel: 'ExhibitKIT web workstation',
    activationTokenHash: hashActivationToken(activationToken),
    appVersion: cleanAppVersion(body.appVersion),
  };

  const configuredCooldown = Number(process.env.LICENSE_TRANSFER_COOLDOWN_HOURS || 24);
  const cooldownHours = Number.isFinite(configuredCooldown)
    ? Math.max(0, Math.min(720, configuredCooldown))
    : 24;
  const result = transfer
    ? await transferLicense({
        ...record,
        cooldownHours,
      })
    : await activateLicense(record);

  if (result.code === 'invalid') {
    throw new HttpError(401, 'That license key could not be verified.', 'INVALID_LICENSE');
  }
  if (result.code === 'expired') {
    throw new HttpError(403, 'This time-limited license has expired.', 'LICENSE_EXPIRED');
  }
  if (result.code === 'workstation_limit') {
    throw new HttpError(
      409,
      'This license is active on another workstation. You can transfer it here.',
      'WORKSTATION_LIMIT',
    );
  }
  if (result.code === 'transfer_cooldown') {
    const retryAt = result.retry_at ? new Date(result.retry_at).toISOString() : 'later';
    throw new HttpError(
      429,
      `This license was transferred recently. Try again after ${retryAt}.`,
      'TRANSFER_COOLDOWN',
    );
  }
  if (result.code !== 'active') {
    throw new Error('License activation returned an unexpected result.');
  }

  return entitlementFromDatabase(
    result,
    activationToken,
    licenseFingerprint(licenseKey),
  );
}
