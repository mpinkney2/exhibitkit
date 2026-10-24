# Migration 004 — rate-limit retention

Use the direct Neon connection string, the hostname without `-pooler`. A pooled Neon connection runs statements inside a transaction, and `CREATE INDEX CONCURRENTLY` fails there.

`scripts/migrate-licensing.mjs` applies `db/migrations/004_rate_limit_index.sql` one statement at a time because the first line is `-- migrate:no-transaction`. `db/migrations/005_rate_limit_cleanup.sql` replaces `exhibitkit_consume_rate_limit` and can run inside a transaction. The runner records each filename in `exhibitkit_schema_migrations` and skips it on the next run. A database that already has `exhibitkit_licenses`, the `source` column, and row level security on that table records `001` through `003` without running those files again.

After the function is replaced, about 1% of consume calls delete at most 100 expired rows. If `exhibitkit_rate_limits_window_start_idx` exists but is invalid, the runner stops.

## 1. Neon branch backup

In the Neon console, create a branch from the database you are about to change. Rehearse the steps below on that branch. Keep the branch until the production change is verified.

## 2. Count expired rows

```sql
SELECT count(*) AS expired_rows
FROM exhibitkit_rate_limits
WHERE window_start < now() - interval '2 days';
```

## 3. Build the index concurrently

Set a lock timeout so a busy table does not wait indefinitely:

```sql
SET lock_timeout = '5s';

CREATE INDEX CONCURRENTLY IF NOT EXISTS exhibitkit_rate_limits_window_start_idx
  ON exhibitkit_rate_limits (window_start);
```

Confirm the index is valid:

```sql
SELECT indisvalid
FROM pg_index
WHERE indexrelid = 'exhibitkit_rate_limits_window_start_idx'::regclass;
```

If that returns false, drop the invalid index and create it again:

```sql
DROP INDEX CONCURRENTLY IF EXISTS exhibitkit_rate_limits_window_start_idx;
```

## 4. Delete the backlog in batches

Repeat until the count from step 2 is zero.

```sql
DELETE FROM exhibitkit_rate_limits
WHERE ctid IN (
  SELECT ctid
  FROM exhibitkit_rate_limits
  WHERE window_start < now() - interval '2 days'
  LIMIT 1000
);
```

## 5. Apply the migration

```bash
npm run db:migrate
```

## 6. Rollback

Restore the Neon branch from step 1, or put the previous function body from `db/migrations/001_secure_licensing.sql` back in place and drop the index outside a transaction:

```sql
DROP INDEX CONCURRENTLY IF EXISTS exhibitkit_rate_limits_window_start_idx;
```

A rollback done that way is undone by the next `npm run db:migrate` unless `004_rate_limit_index.sql` and `005_rate_limit_cleanup.sql` are removed from `db/migrations`. If those filenames are still recorded in `exhibitkit_schema_migrations`, delete those rows as well so a later run does not skip the files you removed or reapply the files you left in place.
