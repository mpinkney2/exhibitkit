-- Build this index outside a transaction. scripts/migrate-licensing.mjs runs
-- any migration that contains CONCURRENTLY one statement at a time.
-- See docs/runbooks/migration-004.md before applying this on a shared database.
CREATE INDEX CONCURRENTLY IF NOT EXISTS exhibitkit_rate_limits_window_start_idx
  ON exhibitkit_rate_limits (window_start);
