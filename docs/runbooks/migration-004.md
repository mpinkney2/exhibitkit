# Migration 004 — rate-limit retention

Use a direct database connection. `CREATE INDEX CONCURRENTLY` and `DROP INDEX CONCURRENTLY` fail inside a transaction, including a transaction-mode pooler.

`scripts/migrate-licensing.mjs` applies `db/migrations/004_rate_limit_index.sql` one statement at a time because that file contains `CONCURRENTLY`. `db/migrations/004_rate_limit_cleanup.sql` replaces `exhibitkit_consume_rate_limit` and can run inside a transaction. After the function is replaced, about 1% of consume calls delete at most 100 expired rows.

## 1. Neon branch backup

In the Neon console, create a branch from the database you are about to change. Rehearse the steps below on that branch. Keep the branch until the production change is verified.

## 2. Count expired rows

```sql
SELECT count(*) AS expired_rows
FROM exhibitkit_rate_limits
WHERE window_start < now() - interval '2 days';
```

## 3. Build the index concurrently

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS exhibitkit_rate_limits_window_start_idx
  ON exhibitkit_rate_limits (window_start);
```

If the statement fails, drop the invalid index and run it again:

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
