BEGIN;

-- Expired windows are never read again. The longest limiter window in the app
-- is one day, so rows older than two days are safe to drop. The supporting
-- index is created in 004_rate_limit_index.sql before this function is replaced.
CREATE OR REPLACE FUNCTION exhibitkit_consume_rate_limit(
  p_action text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  -- About one percent of calls delete a small batch. A request never clears
  -- a large backlog; do that with docs/runbooks/migration-004.md.
  IF random() < 0.01 THEN
    DELETE FROM exhibitkit_rate_limits
    WHERE ctid IN (
      SELECT ctid
      FROM exhibitkit_rate_limits
      WHERE window_start < now() - interval '2 days'
      LIMIT 100
    );
  END IF;

  INSERT INTO exhibitkit_rate_limits (action, key_hash, window_start, request_count)
  VALUES (p_action, p_key_hash, v_window_start, 1)
  ON CONFLICT (action, key_hash, window_start)
  DO UPDATE SET request_count = exhibitkit_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

COMMIT;
