BEGIN;

-- Distinguish how a license row was created. Existing rows are Stripe purchases.
ALTER TABLE exhibitkit_licenses
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'stripe';

-- Optional founder-supplied metadata for beta invitations.
ALTER TABLE exhibitkit_licenses
  ADD COLUMN IF NOT EXISTS invitee_name text;
ALTER TABLE exhibitkit_licenses
  ADD COLUMN IF NOT EXISTS invite_note text;
ALTER TABLE exhibitkit_licenses
  ADD COLUMN IF NOT EXISTS invited_by text;

CREATE INDEX IF NOT EXISTS exhibitkit_licenses_source_idx
  ON exhibitkit_licenses (source);

COMMIT;
