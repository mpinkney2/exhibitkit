-- migrate:no-transaction
-- The first line tells scripts/migrate-licensing.mjs to run this file one
-- statement at a time, outside a transaction. See docs/runbooks/migration-004.md.
CREATE INDEX CONCURRENTLY IF NOT EXISTS exhibitkit_rate_limits_window_start_idx
  ON exhibitkit_rate_limits (window_start);
