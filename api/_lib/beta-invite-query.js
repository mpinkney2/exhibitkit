import { resendWebhookSecret } from './resend-webhook.js';
import { isMissingSchemaError } from './resend-webhook.js';
import { listBetaInviteRows, listEmailEvents } from './license-repository.js';
import {
  EMAIL_TRACKING_NOT_CONFIGURED,
  INVITE_REPORT_FILTERS,
  INVITE_REPORT_LIMIT,
  filterBetaInvites,
  presentBetaInvite,
} from './beta-invite-report.js';

/**
 * Founder invite report. Email events are included when the table exists.
 * A missing migration does not fail the report. When RESEND_WEBHOOK_SECRET
 * is unset, emailTrackingMessage is the exact phrase the founder UI shows.
 */
export async function loadBetaInviteReport({ status = 'all', now = new Date() } = {}) {
  const filter = INVITE_REPORT_FILTERS.includes(status) ? status : 'all';
  const secretConfigured = Boolean(resendWebhookSecret());
  let eventsAvailable = true;
  let rows;
  try {
    rows = await listBetaInviteRows(INVITE_REPORT_LIMIT);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      const mapped = new Error('The licensing database is missing the beta-invite migration. Run "npm run db:migrate" against this environment\'s database.');
      mapped.status = 503;
      mapped.code = 'INVITE_DB_MIGRATION_REQUIRED';
      throw mapped;
    }
    throw error;
  }

  const providerIds = rows.map((row) => row.email_provider_id).filter(Boolean);
  let events = [];
  if (providerIds.length > 0) {
    try {
      events = await listEmailEvents(providerIds);
    } catch (error) {
      if (!isMissingSchemaError(error)) throw error;
      eventsAvailable = false;
      events = [];
    }
  }

  const byMessage = new Map();
  for (const event of events) {
    const key = event.provider_message_id;
    const list = byMessage.get(key) || [];
    list.push(event);
    byMessage.set(key, list);
  }

  const presented = rows.map((row) => presentBetaInvite(
    row,
    byMessage.get(row.email_provider_id) || [],
    now,
  ));
  const invites = filterBetaInvites(presented, filter);

  let emailTracking = 'configured';
  let emailTrackingMessage = null;
  if (!secretConfigured) {
    emailTracking = 'not_configured';
    emailTrackingMessage = EMAIL_TRACKING_NOT_CONFIGURED;
  } else if (!eventsAvailable) {
    emailTracking = 'unavailable';
    emailTrackingMessage = 'Email events are not available until the database migration is applied.';
  }

  return {
    emailTracking,
    emailTrackingMessage,
    filter,
    invites,
  };
}
