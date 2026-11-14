// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  betaInvitesToCsv,
  filterBetaInvites,
  presentBetaInvite,
} from './beta-invite-report.js';

const NOW = new Date('2026-11-14T18:00:00.000Z');

function row(overrides = {}) {
  return {
    customer_email: 'tester@example.com',
    invitee_name: 'Tester',
    invite_note: 'round 1',
    purchased_at: '2026-11-01T18:00:00.000Z',
    expires_at: '2026-11-26T18:00:00.000Z',
    email_delivery_status: 'sent',
    activated_at: null,
    last_seen_at: null,
    ...overrides,
  };
}

describe('beta invite report rows', () => {
  it('shows days left, activation, last seen, and email events', () => {
    const invite = presentBetaInvite(row({
      activated_at: '2026-11-02T12:00:00.000Z',
      last_seen_at: '2026-11-14T16:00:00.000Z',
    }), [
      { event_type: 'delivered', occurred_at: '2026-11-01T18:05:00.000Z' },
      { event_type: 'opened', occurred_at: '2026-11-01T19:00:00.000Z' },
    ], NOW);

    expect(invite.email).toBe('tester@example.com');
    expect(invite.name).toBe('Tester');
    expect(invite.note).toBe('round 1');
    expect(invite.days).toBe(25);
    expect(invite.daysLeft).toBe(12);
    expect(invite.daysLeftLabel).toBe('12 days left');
    expect(invite.expired).toBe(false);
    expect(invite.activity).toBe('activated');
    expect(invite.activatedAt).toBe('2026-11-02T12:00:00.000Z');
    expect(invite.lastSeenAt).toBe('2026-11-14T16:00:00.000Z');
    expect(invite.emailEvents.map((event) => event.type)).toEqual(['delivered', 'opened']);
    expect(JSON.stringify(invite)).not.toMatch(/EKIT-|ciphertext|activation_token/i);
  });

  it('labels an ended beta and filters by status', () => {
    const expired = presentBetaInvite(row({
      expires_at: '2026-11-10T18:00:00.000Z',
      email_delivery_status: 'sent',
    }), [], NOW);
    const failed = presentBetaInvite(row({
      customer_email: 'failed@example.com',
      email_delivery_status: 'failed',
      expires_at: '2026-12-01T18:00:00.000Z',
    }), [], NOW);
    const bounced = presentBetaInvite(row({
      customer_email: 'bounced@example.com',
      expires_at: '2026-12-01T18:00:00.000Z',
    }), [{ event_type: 'bounced', occurred_at: '2026-11-02T00:00:00.000Z' }], NOW);

    expect(expired.expired).toBe(true);
    expect(expired.daysLeftLabel).toBe('Expired');
    expect(expired.activity).toBe('expired');
    expect(filterBetaInvites([expired, failed, bounced], 'expired')).toEqual([expired]);
    expect(filterBetaInvites([expired, failed, bounced], 'email_failed')).toEqual([failed]);
    expect(filterBetaInvites([expired, failed, bounced], 'bounced')).toEqual([bounced]);
    expect(filterBetaInvites([expired, failed], 'pending')).toEqual([]);
  });

  it('exports a csv without a license key', () => {
    const csv = betaInvitesToCsv([presentBetaInvite(row(), [], NOW)]);
    expect(csv.split('\n')[0]).toContain('email');
    expect(csv).toContain('tester@example.com');
    expect(csv).toContain('12 days left');
    expect(csv).not.toMatch(/EKIT-/);
  });
});
