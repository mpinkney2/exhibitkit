BEGIN;

-- Delivery events for license emails, keyed by the Resend email id stored on
-- the license row at send time (email_provider_id). The invite report still
-- runs when this table is missing.

CREATE TABLE IF NOT EXISTS exhibitkit_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_message_id text NOT NULL,
  event_type text NOT NULL CHECK (
    event_type IN ('delivered', 'opened', 'clicked', 'bounced', 'complained')
  ),
  occurred_at timestamptz NOT NULL,
  svix_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_message_id, event_type, svix_id)
);

CREATE INDEX IF NOT EXISTS exhibitkit_email_events_message_idx
  ON exhibitkit_email_events (provider_message_id, occurred_at);

-- Allow the beta invite flow to record that email was not configured.
-- Existing databases reject 'skipped' until this constraint is replaced.
ALTER TABLE exhibitkit_licenses DROP CONSTRAINT IF EXISTS exhibitkit_licenses_email_delivery_status_check;
ALTER TABLE exhibitkit_licenses
  ADD CONSTRAINT exhibitkit_licenses_email_delivery_status_check
  CHECK (email_delivery_status IN ('pending', 'sent', 'failed', 'skipped'));

ALTER TABLE IF EXISTS exhibitkit_email_events ENABLE ROW LEVEL SECURITY;

COMMIT;
