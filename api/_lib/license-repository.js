import { getDatabase } from './database.js';

export async function recordStripeEvent(eventId, eventType, checkoutSessionId = null) {
  const sql = getDatabase();
  await sql`
    INSERT INTO exhibitkit_stripe_events (
      event_id, event_type, status, checkout_session_id
    ) VALUES (
      ${eventId}, ${eventType}, 'processing', ${checkoutSessionId}
    )
    ON CONFLICT (event_id)
    DO UPDATE SET attempts = exhibitkit_stripe_events.attempts + 1,
                  status = 'processing',
                  updated_at = now()
  `;
}

export async function finishStripeEvent(eventId, status, errorCode = null) {
  const sql = getDatabase();
  await sql`
    UPDATE exhibitkit_stripe_events
    SET status = ${status},
        last_error_code = ${errorCode},
        updated_at = now()
    WHERE event_id = ${eventId}
  `;
}

export async function upsertLicenseFromCheckout(record) {
  const sql = getDatabase();
  const rows = await sql`
    INSERT INTO exhibitkit_licenses (
      license_key_hash,
      license_key_ciphertext,
      license_fingerprint,
      customer_email,
      customer_email_hash,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      stripe_customer_id,
      stripe_price_id,
      plan,
      max_activations,
      purchased_at,
      expires_at,
      updates_included_until,
      purchased_version,
      initial_workstation_hash
    ) VALUES (
      ${record.licenseKeyHash},
      ${record.licenseKeyCiphertext},
      ${record.licenseFingerprint},
      ${record.customerEmail},
      ${record.customerEmailHash},
      ${record.checkoutSessionId},
      ${record.paymentIntentId},
      ${record.customerId},
      ${record.priceId},
      ${record.plan},
      ${record.maxActivations},
      ${record.purchasedAt},
      ${record.expiresAt},
      ${record.updatesIncludedUntil},
      ${record.purchasedVersion},
      ${record.initialWorkstationHash}
    )
    ON CONFLICT (stripe_checkout_session_id)
    DO UPDATE SET stripe_payment_intent_id = COALESCE(
                    exhibitkit_licenses.stripe_payment_intent_id,
                    excluded.stripe_payment_intent_id
                  ),
                  stripe_customer_id = COALESCE(
                    exhibitkit_licenses.stripe_customer_id,
                    excluded.stripe_customer_id
                  ),
                  updated_at = now()
    RETURNING *
  `;
  return rows[0];
}

export async function updateLicenseEmailStatus(licenseId, status, providerId = null) {
  const sql = getDatabase();
  await sql`
    UPDATE exhibitkit_licenses
    SET email_delivery_status = ${status},
        email_provider_id = ${providerId},
        updated_at = now()
    WHERE id = ${licenseId}
  `;
}

export async function activateLicense(record) {
  const sql = getDatabase();
  const rows = await sql`
    SELECT exhibitkit_activate_license(
      ${record.licenseKeyHash},
      ${record.workstationHash},
      ${record.workstationLabel},
      ${record.activationTokenHash},
      ${record.appVersion}
    ) AS result
  `;
  return rows[0]?.result || { code: 'invalid' };
}

export async function transferLicense(record) {
  const sql = getDatabase();
  const rows = await sql`
    SELECT exhibitkit_transfer_license(
      ${record.licenseKeyHash},
      ${record.workstationHash},
      ${record.workstationLabel},
      ${record.activationTokenHash},
      ${record.appVersion},
      ${record.cooldownHours}
    ) AS result
  `;
  return rows[0]?.result || { code: 'invalid' };
}

export async function getActivationStatus(activationTokenHash, workstationHash) {
  const sql = getDatabase();
  const rows = await sql`
    UPDATE exhibitkit_license_activations AS activation
    SET last_seen_at = now()
    FROM exhibitkit_licenses AS license
    WHERE activation.activation_token_hash = ${activationTokenHash}
      AND activation.workstation_hash = ${workstationHash}
      AND activation.deactivated_at IS NULL
      AND license.id = activation.license_id
      AND license.status = 'active'
      AND (license.expires_at IS NULL OR license.expires_at > now())
    RETURNING
      license.plan,
      license.purchased_at,
      license.expires_at,
      license.updates_included_until,
      license.purchased_version,
      license.license_fingerprint
  `;
  return rows[0] || null;
}

export async function deactivateWorkstation(activationTokenHash, workstationHash) {
  const sql = getDatabase();
  const rows = await sql`
    UPDATE exhibitkit_license_activations
    SET deactivated_at = now(),
        deactivation_reason = 'customer_deactivated'
    WHERE activation_token_hash = ${activationTokenHash}
      AND workstation_hash = ${workstationHash}
      AND deactivated_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export async function findRecoverableLicenses(customerEmailHash) {
  const sql = getDatabase();
  return sql`
    SELECT id, license_key_ciphertext, license_fingerprint, plan, purchased_at
    FROM exhibitkit_licenses
    WHERE customer_email_hash = ${customerEmailHash}
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY purchased_at DESC
    LIMIT 10
  `;
}

export async function revokeLicenseByPaymentIntent(paymentIntentId, status) {
  if (!paymentIntentId) return 0;
  const sql = getDatabase();
  const rows = await sql`
    WITH revoked AS (
      UPDATE exhibitkit_licenses
      SET status = ${status}, updated_at = now()
      WHERE stripe_payment_intent_id = ${paymentIntentId}
        AND status = 'active'
      RETURNING id
    ), deactivated AS (
      UPDATE exhibitkit_license_activations
      SET deactivated_at = now(),
          deactivation_reason = ${status}
      WHERE license_id IN (SELECT id FROM revoked)
        AND deactivated_at IS NULL
      RETURNING id
    )
    SELECT count(*)::integer AS count FROM revoked
  `;
  return rows[0]?.count || 0;
}
