BEGIN;

-- Supabase exposes tables in the `public` schema through its auto-generated Data
-- API. Enabling row level security with no policies denies all access to the
-- anon/authenticated API roles, while the backend's direct connection (table
-- owner) bypasses RLS and continues to work. On non-Supabase Postgres this is a
-- harmless no-op hardening step.
ALTER TABLE IF EXISTS exhibitkit_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exhibitkit_license_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exhibitkit_stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exhibitkit_rate_limits ENABLE ROW LEVEL SECURITY;

COMMIT;
