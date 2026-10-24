BEGIN;

-- Expired windows are never read again. The longest limiter window in the app
-- is one day, so rows older than two days are safe to drop on the next consume.
CREATE INDEX IF NOT EXISTS exhibitkit_rate_limits_window_start_idx
  ON exhibitkit_rate_limits (window_start);

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

  DELETE FROM exhibitkit_rate_limits
  WHERE window_start < now() - interval '2 days';

  INSERT INTO exhibitkit_rate_limits (action, key_hash, window_start, request_count)
  VALUES (p_action, p_key_hash, v_window_start, 1)
  ON CONFLICT (action, key_hash, window_start)
  DO UPDATE SET request_count = exhibitkit_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

COMMIT;
