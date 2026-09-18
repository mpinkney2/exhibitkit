BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS exhibitkit_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key_hash text NOT NULL UNIQUE,
  license_key_ciphertext text NOT NULL,
  license_fingerprint text NOT NULL,
  customer_email text NOT NULL,
  customer_email_hash text NOT NULL,
  stripe_checkout_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  stripe_price_id text NOT NULL,
  plan text NOT NULL CHECK (plan IN ('case_pass', 'pro_perpetual', 'firm')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'refunded', 'disputed', 'revoked')),
  max_activations integer NOT NULL DEFAULT 1 CHECK (max_activations > 0 AND max_activations <= 1000),
  purchased_at timestamptz NOT NULL,
  expires_at timestamptz,
  updates_included_until timestamptz,
  purchased_version text,
  initial_workstation_hash text,
  email_delivery_status text NOT NULL DEFAULT 'pending' CHECK (email_delivery_status IN ('pending', 'sent', 'failed')),
  email_provider_id text,
  last_transfer_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exhibitkit_licenses_email_hash_idx
  ON exhibitkit_licenses (customer_email_hash);
CREATE INDEX IF NOT EXISTS exhibitkit_licenses_payment_intent_idx
  ON exhibitkit_licenses (stripe_payment_intent_id);

CREATE TABLE IF NOT EXISTS exhibitkit_license_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES exhibitkit_licenses(id) ON DELETE CASCADE,
  workstation_hash text NOT NULL,
  workstation_label text,
  activation_token_hash text NOT NULL UNIQUE,
  app_version text,
  activated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  deactivation_reason text,
  UNIQUE (license_id, workstation_hash)
);

CREATE INDEX IF NOT EXISTS exhibitkit_active_activations_idx
  ON exhibitkit_license_activations (license_id)
  WHERE deactivated_at IS NULL;

CREATE TABLE IF NOT EXISTS exhibitkit_stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('processing', 'completed', 'failed', 'ignored')),
  checkout_session_id text,
  attempts integer NOT NULL DEFAULT 1,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exhibitkit_rate_limits (
  action text NOT NULL,
  key_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (action, key_hash, window_start)
);

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

  INSERT INTO exhibitkit_rate_limits (action, key_hash, window_start, request_count)
  VALUES (p_action, p_key_hash, v_window_start, 1)
  ON CONFLICT (action, key_hash, window_start)
  DO UPDATE SET request_count = exhibitkit_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION exhibitkit_activate_license(
  p_license_key_hash text,
  p_workstation_hash text,
  p_workstation_label text,
  p_activation_token_hash text,
  p_app_version text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_license exhibitkit_licenses%ROWTYPE;
  v_existing exhibitkit_license_activations%ROWTYPE;
  v_active_count integer;
BEGIN
  SELECT * INTO v_license
  FROM exhibitkit_licenses
  WHERE license_key_hash = p_license_key_hash
  FOR UPDATE;

  IF NOT FOUND OR v_license.status <> 'active' THEN
    RETURN jsonb_build_object('code', 'invalid');
  END IF;

  IF v_license.expires_at IS NOT NULL AND v_license.expires_at <= now() THEN
    RETURN jsonb_build_object('code', 'expired');
  END IF;

  SELECT * INTO v_existing
  FROM exhibitkit_license_activations
  WHERE license_id = v_license.id
    AND workstation_hash = p_workstation_hash;

  IF FOUND THEN
    UPDATE exhibitkit_license_activations
    SET activation_token_hash = p_activation_token_hash,
        workstation_label = left(p_workstation_label, 120),
        app_version = left(p_app_version, 40),
        deactivated_at = NULL,
        deactivation_reason = NULL,
        last_seen_at = now()
    WHERE id = v_existing.id;
  ELSE
    SELECT count(*) INTO v_active_count
    FROM exhibitkit_license_activations
    WHERE license_id = v_license.id
      AND deactivated_at IS NULL;

    IF v_active_count >= v_license.max_activations THEN
      RETURN jsonb_build_object(
        'code', 'workstation_limit',
        'last_transfer_at', v_license.last_transfer_at
      );
    END IF;

    INSERT INTO exhibitkit_license_activations (
      license_id,
      workstation_hash,
      workstation_label,
      activation_token_hash,
      app_version
    ) VALUES (
      v_license.id,
      p_workstation_hash,
      left(p_workstation_label, 120),
      p_activation_token_hash,
      left(p_app_version, 40)
    );
  END IF;

  RETURN jsonb_build_object(
    'code', 'active',
    'plan', v_license.plan,
    'purchased_at', v_license.purchased_at,
    'expires_at', v_license.expires_at,
    'updates_included_until', v_license.updates_included_until,
    'purchased_version', v_license.purchased_version,
    'license_fingerprint', v_license.license_fingerprint
  );
END;
$$;

CREATE OR REPLACE FUNCTION exhibitkit_transfer_license(
  p_license_key_hash text,
  p_workstation_hash text,
  p_workstation_label text,
  p_activation_token_hash text,
  p_app_version text,
  p_cooldown_hours integer
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_license exhibitkit_licenses%ROWTYPE;
  v_retry_at timestamptz;
BEGIN
  SELECT * INTO v_license
  FROM exhibitkit_licenses
  WHERE license_key_hash = p_license_key_hash
  FOR UPDATE;

  IF NOT FOUND OR v_license.status <> 'active' THEN
    RETURN jsonb_build_object('code', 'invalid');
  END IF;

  IF v_license.expires_at IS NOT NULL AND v_license.expires_at <= now() THEN
    RETURN jsonb_build_object('code', 'expired');
  END IF;

  IF v_license.last_transfer_at IS NOT NULL AND p_cooldown_hours > 0 THEN
    v_retry_at := v_license.last_transfer_at + make_interval(hours => p_cooldown_hours);
    IF v_retry_at > now() THEN
      RETURN jsonb_build_object('code', 'transfer_cooldown', 'retry_at', v_retry_at);
    END IF;
  END IF;

  UPDATE exhibitkit_license_activations
  SET deactivated_at = now(),
      deactivation_reason = 'transferred'
  WHERE license_id = v_license.id
    AND deactivated_at IS NULL;

  INSERT INTO exhibitkit_license_activations (
    license_id,
    workstation_hash,
    workstation_label,
    activation_token_hash,
    app_version,
    activated_at,
    last_seen_at,
    deactivated_at,
    deactivation_reason
  ) VALUES (
    v_license.id,
    p_workstation_hash,
    left(p_workstation_label, 120),
    p_activation_token_hash,
    left(p_app_version, 40),
    now(),
    now(),
    NULL,
    NULL
  )
  ON CONFLICT (license_id, workstation_hash)
  DO UPDATE SET activation_token_hash = excluded.activation_token_hash,
                workstation_label = excluded.workstation_label,
                app_version = excluded.app_version,
                activated_at = now(),
                last_seen_at = now(),
                deactivated_at = NULL,
                deactivation_reason = NULL;

  UPDATE exhibitkit_licenses
  SET last_transfer_at = now(), updated_at = now()
  WHERE id = v_license.id;

  RETURN jsonb_build_object(
    'code', 'active',
    'plan', v_license.plan,
    'purchased_at', v_license.purchased_at,
    'expires_at', v_license.expires_at,
    'updates_included_until', v_license.updates_included_until,
    'purchased_version', v_license.purchased_version,
    'license_fingerprint', v_license.license_fingerprint
  );
END;
$$;

COMMIT;
