import { beforeEach, describe, expect, it } from 'vitest';
import {
  BETA_INVITE_EMAIL_SUBJECT,
  DEVICE_LICENSE_STORAGE,
  LICENSE_SENDER,
  PRO_LICENSE_EMAIL_SUBJECT,
  activationSuccessMessage,
  decideLicenseReplacement,
  describeLicenseState,
  deviceRemovalPlan,
  ensureDeviceSession,
  forgetDeviceLicense,
  lostKeyHelp,
  noteFreshActivation,
  noteLicenseChecked,
  readDeviceSession,
  settleSessionForLoad,
} from './licenseDeviceStatus.js';
import { clearEntitlement } from './entitlement.js';

const FULL_KEY = 'EKIT-ABCD-EFGH-IJKL';
const OTHER_KEY = 'EKIT-ZZZZ-YYYY-XXXX';
const ACTIVATION_TOKEN = 'activation-token-SECRETVALUE99';
const EMAIL = 'owner@example.com';

function licensedRecord(overrides = {}) {
  return {
    plan: 'pro_perpetual',
    licenseSource: 'stripe',
    licenseEmail: EMAIL,
    licenseFingerprint: '••••-IJKL',
    licenseKey: FULL_KEY,
    activationToken: ACTIVATION_TOKEN,
    purchasedAt: '2026-11-01T15:00:00.000Z',
    verifiedAt: '2026-11-14T15:00:00.000Z',
    expiresAt: null,
    ...overrides,
  };
}

function viewOf(entitlement, session, extras = {}) {
  return describeLicenseState({
    entitlement,
    session,
    workstationId: 'EKIT-WORKSTATION-ABCDEFGH12345678',
    featuresActive: extras.featuresActive ?? true,
    now: new Date('2026-11-14T18:00:00.000Z'),
    formatDate: (iso) => (iso ? String(iso).slice(0, 10) : null),
    ...extras,
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe('license status on this device', () => {
  it('says when this browser has no license', () => {
    const view = viewOf({ plan: 'free' }, null, { featuresActive: false });
    expect(view.summary).toBe('Free — no license on this device');
    expect(view.planLabel).toBe('Free');
    expect(view.status).toBe('Not activated');
    expect(view.hasLicense).toBe(false);
    expect(view.email).toBeNull();
  });

  it('shows plan, masked email, and active status without the full key or token', () => {
    const session = noteFreshActivation(licensedRecord(), {
      loadId: 'load-1',
      now: new Date('2026-11-14T18:00:00.000Z'),
    });
    const view = viewOf(licensedRecord(), session);
    const packed = JSON.stringify({ view, stored: localStorage.getItem(DEVICE_LICENSE_STORAGE) });

    expect(view.planLabel).toBe('Pro');
    expect(view.status).toBe('Active');
    expect(view.maskedEmail).toBe('o***@example.com');
    expect(view.summary).toBe('Signed in as Pro · Active · o***@example.com');
    expect(view.keyLast4).toBe('IJKL');
    expect(view.deviceIdShort).toBe('12345678');
    expect(view.activationIdShort).toHaveLength(4);
    expect(view.sessionPhrase).toBe('Activated just now');
    expect(view.freshActivation).toBe(true);
    expect(packed).not.toContain(FULL_KEY);
    expect(packed).not.toContain(ACTIVATION_TOKEN);
    expect(packed).not.toContain('SECRETVALUE');
  });

  it('labels a beta invite separately from Pro and shows it as expired after its end date', () => {
    const entitlement = licensedRecord({
      licenseSource: 'beta',
      expiresAt: '2026-11-01T00:00:00.000Z',
    });
    const session = noteFreshActivation(entitlement, { loadId: 'load-1', now: new Date('2026-11-14T18:00:00.000Z') });
    const view = viewOf(entitlement, settleSessionForLoad(session, 'load-2'), { featuresActive: false });
    expect(view.planLabel).toBe('Beta');
    expect(view.status).toBe('Expired');
    expect(view.summary).toContain('Signed in as Beta · Expired');
    expect(view.endedLabel).toBe('Beta ended');
    expect(view.chipLabel).toContain('Beta ended');
    expect(view.chipTone).toBe('ended');
    expect(view.expiresLabel).toBe('2026-11-01 · Ended');
    expect(view.restoredFromPreviousSession).toBe(true);
    expect(view.sessionPhrase).toBe('Activated on this device on 2026-11-14');
  });

  it('shows days left on an active beta and warns inside 7 days', () => {
    const now = new Date('2026-11-14T18:00:00.000Z');
    const active = licensedRecord({
      licenseSource: 'beta',
      expiresAt: '2026-11-26T18:00:00.000Z',
    });
    const activeView = viewOf(active, noteFreshActivation(active, { loadId: 'load-1', now }), { now });
    expect(activeView.daysLeftLabel).toBe('12 days left');
    expect(activeView.chipLabel).toBe('Signed in as Beta · 12 days left · o***@example.com');
    expect(activeView.expiresLabel).toBe('2026-11-26 · 12 days left');
    expect(activeView.nearExpiry).toBe(false);
    expect(activeView.chipTone).toBe('active');

    const ending = licensedRecord({
      licenseSource: 'beta',
      expiresAt: '2026-11-17T18:00:00.000Z',
    });
    const warning = viewOf(ending, noteFreshActivation(ending, { loadId: 'load-2', now }), { now });
    expect(warning.daysLeftLabel).toBe('3 days left');
    expect(warning.nearExpiry).toBe(true);
    expect(warning.chipTone).toBe('warning');
    expect(warning.upgradeNote).toMatch(/3 days left on this beta/);
    expect(warning.upgradeNote).toMatch(/Upgrade to Pro/);

    const lastDay = licensedRecord({
      licenseSource: 'beta',
      expiresAt: '2026-11-14T22:00:00.000Z',
    });
    const last = viewOf(lastDay, noteFreshActivation(lastDay, { loadId: 'load-3', now }), { now });
    expect(last.daysLeftLabel).toBe('Last day');
    expect(last.nearExpiry).toBe(true);
    expect(last.upgradeNote).toMatch(/last day of this beta/i);

    const oneDay = licensedRecord({
      plan: 'case_pass',
      licenseSource: 'stripe',
      expiresAt: '2026-11-15T18:00:00.000Z',
      casePassStatus: 'active',
    });
    const singular = viewOf(oneDay, noteFreshActivation(oneDay, { loadId: 'load-4', now }), { now });
    expect(singular.planLabel).toBe('Case Pass');
    expect(singular.daysLeftLabel).toBe('1 day left');
    expect(singular.chipLabel).toBe('Signed in as Case Pass · 1 day left · o***@example.com');
    expect(singular.expiresLabel).toBe('2026-11-15 · 1 day left');
  });

  it('names an ended beta and Case Pass without dropping the stored license', () => {
    const entitlement = licensedRecord({
      plan: 'case_pass',
      licenseSource: 'stripe',
      casePassStatus: 'expired',
      expiresAt: '2026-10-01T00:00:00.000Z',
      verifiedAt: null,
      licenseFingerprint: '••••-CASE',
    });
    const view = viewOf(entitlement, ensureDeviceSession(entitlement, { loadId: 'load-2' }), { featuresActive: false });
    expect(view.planLabel).toBe('Case Pass');
    expect(view.status).toBe('Expired');
    expect(view.endedLabel).toBe('Case Pass ended');
    expect(view.chipLabel).toContain('Case Pass ended');
    expect(view.endedNotice.kept).toMatch(/files and matter profiles/i);
    expect(view.endedNotice.limited).toMatch(/5 files per batch/);
    expect(view.sessionPhrase).toBe('Activated on this device on 2026-11-01');
  });
});

describe('replace, restore, and removal', () => {
  it('asks before a different key replaces the license already on this device', () => {
    const session = noteFreshActivation(licensedRecord(), { loadId: 'load-1' });
    const view = viewOf(licensedRecord(), session);
    const decision = decideLicenseReplacement(view, OTHER_KEY);
    expect(decision.needsConfirm).toBe(true);
    expect(decision.message).toBe(
      `This device already has a license for ${EMAIL} (ending IJKL). Replace it with the new key?`,
    );
    expect(decision.message).not.toContain(FULL_KEY);
    expect(decision.message).not.toContain(OTHER_KEY);
  });

  it('does not ask when this device has no license or the same key is entered again', () => {
    const empty = viewOf({ plan: 'free' }, null, { featuresActive: false });
    expect(decideLicenseReplacement(empty, OTHER_KEY).needsConfirm).toBe(false);

    const session = noteFreshActivation(licensedRecord(), { loadId: 'load-1' });
    const view = viewOf(licensedRecord(), session);
    expect(decideLicenseReplacement(view, FULL_KEY).needsConfirm).toBe(false);
  });

  it('tells a later visit that the license was already activated on this device', () => {
    const fresh = noteFreshActivation(licensedRecord(), {
      loadId: 'load-1',
      now: new Date('2026-11-14T18:00:00.000Z'),
    });
    expect(viewOf(licensedRecord(), fresh).sessionPhrase).toBe('Activated just now');

    const restored = settleSessionForLoad(readDeviceSession(), 'load-2');
    localStorage.setItem(DEVICE_LICENSE_STORAGE, JSON.stringify(restored));
    const view = viewOf(licensedRecord(), restored);
    expect(view.freshActivation).toBe(false);
    expect(view.restoredFromPreviousSession).toBe(true);
    expect(view.sessionPhrase).toBe('Activated on this device on 2026-11-14');
  });

  it('names the new plan and email after a replacement, and keeps only the new key ending', () => {
    noteFreshActivation(licensedRecord(), { loadId: 'load-1', now: new Date('2026-11-01T00:00:00.000Z') });
    const replaced = noteFreshActivation(licensedRecord({
      licenseEmail: 'next@example.com',
      licenseSource: 'beta',
      licenseFingerprint: '••••-WXYZ',
      licenseKey: OTHER_KEY,
      plan: 'pro_perpetual',
    }), { loadId: 'load-1', now: new Date('2026-11-14T18:00:00.000Z') });
    const view = viewOf(licensedRecord({
      licenseEmail: 'next@example.com',
      licenseSource: 'beta',
      licenseFingerprint: '••••-WXYZ',
    }), replaced);
    expect(view.keyLast4).toBe('WXYZ');
    expect(view.planLabel).toBe('Beta');
    expect(view.sessionPhrase).toBe('Activated just now');
    expect(activationSuccessMessage(view)).toBe('Beta is now active for next@example.com on this device.');
    expect(activationSuccessMessage(view)).not.toContain(OTHER_KEY);
    expect(localStorage.getItem(DEVICE_LICENSE_STORAGE)).not.toContain(FULL_KEY);
  });

  it('removal clears this device and does not delete the server license', () => {
    noteFreshActivation(licensedRecord(), { loadId: 'load-1' });
    const plan = deviceRemovalPlan();
    expect(plan.deletesServerLicense).toBe(false);
    expect(plan.releasesThisDeviceSeat).toBe(true);
    expect(plan.confirmation).toMatch(/not deleted/i);

    forgetDeviceLicense();
    clearEntitlement();
    const view = viewOf({ plan: 'free' }, readDeviceSession(), { featuresActive: false });
    expect(view.summary).toBe('Free — no license on this device');
    expect(localStorage.getItem(DEVICE_LICENSE_STORAGE)).toBeNull();
  });

  it('records a re-check without turning a restored session into a new activation', () => {
    const fresh = noteFreshActivation(licensedRecord(), {
      loadId: 'load-1',
      now: new Date('2026-11-01T00:00:00.000Z'),
    });
    const restored = settleSessionForLoad(fresh, 'load-2');
    localStorage.setItem(DEVICE_LICENSE_STORAGE, JSON.stringify(restored));
    const checked = noteLicenseChecked(licensedRecord(), { now: new Date('2026-11-14T18:30:00.000Z') });
    const view = viewOf(licensedRecord(), checked);
    expect(view.freshActivation).toBe(false);
    expect(view.sessionPhrase).toBe('Activated on this device on 2026-11-01');
    expect(view.lastValidatedAt).toBe('2026-11-14T18:30:00.000Z');
  });
});

describe('lost key help', () => {
  it('names the license sender and the invite subject', () => {
    const help = lostKeyHelp();
    expect(help.title).toBe('Lost your key?');
    expect(help.sender).toBe(LICENSE_SENDER);
    expect(help.paragraphs.join(' ')).toContain(BETA_INVITE_EMAIL_SUBJECT);
    expect(help.paragraphs.join(' ')).toContain(PRO_LICENSE_EMAIL_SUBJECT);
    expect(help.paragraphs.join(' ')).toContain('support@patentpreppers.com');
    expect(help.paragraphs.join(' ')).toMatch(/inbox and spam/i);
  });
});
