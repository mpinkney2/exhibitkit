/**
 * Device-local license actions. Releasing a seat calls the license service.
 * Nothing here deletes the license record.
 */

import {
  clearEntitlement,
  deactivateCurrentWorkstation,
  getEntitlement,
  hasProFeatures,
  readStoredEntitlement,
  refreshVerifiedEntitlementStatus,
  restoreFromLicenseKey,
  settleLicenseRefresh,
} from './entitlement.js';
import {
  activationSuccessMessage,
  currentPageLoadId,
  decideLicenseReplacement,
  describeLicenseState,
  ensureDeviceSession,
  hasStoredLicense,
  noteFreshActivation,
  noteLicenseChecked,
  readDeviceSession,
} from './licenseDeviceStatus.js';

export function currentDeviceLicenseView(workstationId, { settle = false } = {}) {
  const entitlement = readStoredEntitlement();
  const effective = getEntitlement();
  const session = settle
    ? ensureDeviceSession(entitlement, { loadId: currentPageLoadId() })
    : readDeviceSession();
  return describeLicenseState({
    entitlement,
    session,
    workstationId,
    featuresActive: hasProFeatures(effective),
    configurationMessage: effective.configurationMessage || null,
  });
}

export async function activateLicenseOnDevice(key, options = {}) {
  const workstationId = options.workstationId;
  if (!options.confirmReplace) {
    const decision = decideLicenseReplacement(currentDeviceLicenseView(workstationId), key);
    if (decision.needsConfirm) {
      return { ok: false, needsReplace: true, message: decision.message };
    }
  }

  const result = await restoreFromLicenseKey(key, {
    workstationId,
    confirmTransfer: Boolean(options.confirmTransfer),
  });
  if (!result.ok) return result;

  noteFreshActivation({
    ...readStoredEntitlement(),
    ...result.entitlement,
    licenseKey: key,
  }, { loadId: currentPageLoadId() });

  const view = currentDeviceLicenseView(workstationId);
  return {
    ...result,
    successMessage: activationSuccessMessage(view),
    view,
  };
}

export async function recheckLicenseOnDevice(workstationId) {
  const result = await refreshVerifiedEntitlementStatus();
  const settled = settleLicenseRefresh(result);
  if (settled.clear) {
    clearEntitlement();
    return {
      ok: false,
      cleared: true,
      view: currentDeviceLicenseView(workstationId),
    };
  }

  const stored = readStoredEntitlement();
  if (hasStoredLicense(stored, readDeviceSession())) {
    noteLicenseChecked({ ...stored, ...(settled.entitlement || {}) });
  }
  return {
    ok: Boolean(result.ok),
    offline: Boolean(result.offline),
    misconfigured: Boolean(result.misconfigured),
    entitlement: getEntitlement(),
    view: currentDeviceLicenseView(workstationId),
  };
}

export async function removeLicenseFromDevice(entitlement, workstationId) {
  const deactivation = await deactivateCurrentWorkstation(entitlement);
  clearEntitlement();
  return {
    ok: deactivation.ok !== false,
    offline: Boolean(deactivation.offline),
    deletesServerLicense: false,
    view: currentDeviceLicenseView(workstationId),
  };
}
