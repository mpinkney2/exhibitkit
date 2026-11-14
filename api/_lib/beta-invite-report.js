import { calendarDaysRemaining, daysBetween, daysRemainingPhrase } from '../../src/utils/licenseTime.js';

export const INVITE_REPORT_LIMIT = 500;

export const INVITE_REPORT_FILTERS = Object.freeze([
  'all',
  'pending',
  'activated',
  'expired',
  'email_failed',
  'bounced',
]);

const EVENT_ORDER = ['delivered', 'opened', 'clicked', 'bounced', 'complained'];

export const EMAIL_TRACKING_NOT_CONFIGURED = 'email tracking not configured';

function iso(value) {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function eventList(events) {
  const rows = Array.isArray(events) ? events : [];
  return rows
    .map((event) => ({
      type: String(event.event_type || event.type || ''),
      at: iso(event.occurred_at || event.at),
    }))
    .filter((event) => event.type && event.at)
    .sort((left, right) => {
      const byType = EVENT_ORDER.indexOf(left.type) - EVENT_ORDER.indexOf(right.type);
      if (byType !== 0 && EVENT_ORDER.includes(left.type) && EVENT_ORDER.includes(right.type)) {
        return Date.parse(left.at) - Date.parse(right.at);
      }
      return Date.parse(left.at) - Date.parse(right.at);
    });
}

/**
 * One founder-facing invite row. No license key, ciphertext, or activation token.
 */
export function presentBetaInvite(row, events = [], now = new Date()) {
  const expiresAt = iso(row.expires_at || row.expiresAt);
  const sentAt = iso(row.purchased_at || row.sentAt);
  const days = daysBetween(sentAt, expiresAt);
  const remaining = calendarDaysRemaining(expiresAt, now);
  const expired = remaining != null && remaining < 0;
  const emailEvents = eventList(events);
  const activatedAt = iso(row.activated_at || row.activatedAt);
  const emailStatus = String(row.email_delivery_status || row.emailStatus || 'pending');
  const bounced = emailEvents.some((event) => event.type === 'bounced');

  let activity = 'pending';
  if (expired) activity = 'expired';
  else if (activatedAt) activity = 'activated';
  else if (emailStatus === 'failed') activity = 'email_failed';
  else if (bounced) activity = 'bounced';

  return {
    email: String(row.customer_email || row.email || ''),
    name: row.invitee_name || row.name || null,
    note: row.invite_note || row.note || null,
    sentAt,
    days: Number.isInteger(days) && days >= 0 ? days : null,
    expiresAt,
    emailStatus,
    activatedAt,
    lastSeenAt: iso(row.last_seen_at || row.lastSeenAt),
    daysLeft: remaining != null && remaining >= 0 ? remaining : null,
    daysLeftLabel: expired ? 'Expired' : daysRemainingPhrase(remaining),
    expired,
    bounced,
    emailEvents,
    activity,
  };
}

export function inviteMatchesFilter(invite, filter = 'all') {
  const selected = INVITE_REPORT_FILTERS.includes(filter) ? filter : 'all';
  if (selected === 'all') return true;
  if (selected === 'bounced') return invite.bounced;
  if (selected === 'email_failed') return invite.emailStatus === 'failed' || invite.activity === 'email_failed';
  return invite.activity === selected;
}

export function filterBetaInvites(invites, filter = 'all') {
  return invites.filter((invite) => inviteMatchesFilter(invite, filter));
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
  if (/[",\n\r]/.test(guarded)) return `"${guarded.replaceAll('"', '""')}"`;
  return guarded;
}

export function betaInvitesToCsv(invites) {
  const header = [
    'email',
    'name',
    'note',
    'sent_at',
    'days',
    'expires_at',
    'email_status',
    'activated_at',
    'last_seen_at',
    'days_left',
    'activity',
    'email_events',
  ];
  const lines = [header.join(',')];
  for (const invite of invites) {
    const events = (invite.emailEvents || [])
      .map((event) => `${event.type} ${event.at}`)
      .join('; ');
    lines.push([
      invite.email,
      invite.name,
      invite.note,
      invite.sentAt,
      invite.days,
      invite.expiresAt,
      invite.emailStatus,
      invite.activatedAt,
      invite.lastSeenAt,
      invite.expired ? 'expired' : invite.daysLeftLabel,
      invite.activity,
      events,
    ].map(csvCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}
