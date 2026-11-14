// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listBetaInviteRows: vi.fn(),
  listEmailEvents: vi.fn(),
}));

vi.mock('./license-repository.js', () => ({
  listBetaInviteRows: mocks.listBetaInviteRows,
  listEmailEvents: mocks.listEmailEvents,
}));

import { loadBetaInviteReport } from './beta-invite-query.js';
import { EMAIL_TRACKING_NOT_CONFIGURED } from './beta-invite-report.js';

describe('loadBetaInviteReport', () => {
  beforeEach(() => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    mocks.listBetaInviteRows.mockReset();
    mocks.listEmailEvents.mockReset();
    mocks.listBetaInviteRows.mockResolvedValue([{
      customer_email: 'tester@example.com',
      invitee_name: null,
      invite_note: 'pilot',
      purchased_at: '2026-11-01T00:00:00.000Z',
      expires_at: '2026-12-01T00:00:00.000Z',
      email_delivery_status: 'sent',
      email_provider_id: 'email_1',
      activated_at: null,
      last_seen_at: '2026-11-14T00:00:00.000Z',
    }]);
    mocks.listEmailEvents.mockResolvedValue([
      { provider_message_id: 'email_1', event_type: 'delivered', occurred_at: '2026-11-01T01:00:00.000Z' },
    ]);
  });

  it('says email tracking is not configured when the webhook secret is unset', async () => {
    const report = await loadBetaInviteReport({ now: new Date('2026-11-14T00:00:00.000Z') });
    expect(report.emailTracking).toBe('not_configured');
    expect(report.emailTrackingMessage).toBe(EMAIL_TRACKING_NOT_CONFIGURED);
    expect(report.invites[0].email).toBe('tester@example.com');
    expect(report.invites[0].note).toBe('pilot');
    expect(report.invites[0].lastSeenAt).toBe('2026-11-14T00:00:00.000Z');
    expect(report.invites[0].emailEvents[0].type).toBe('delivered');
  });

  it('still returns invites when the email events table is missing', async () => {
    process.env.RESEND_WEBHOOK_SECRET = 'configured-for-test';
    const missing = new Error('relation does not exist');
    missing.code = '42P01';
    mocks.listEmailEvents.mockRejectedValueOnce(missing);
    const report = await loadBetaInviteReport({ now: new Date('2026-11-14T00:00:00.000Z') });
    expect(report.emailTracking).toBe('unavailable');
    expect(report.invites).toHaveLength(1);
    expect(report.invites[0].emailEvents).toEqual([]);
    delete process.env.RESEND_WEBHOOK_SECRET;
  });
});
