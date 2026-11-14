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

export async function getLicenseHolderProfile(licenseId) {
  if (!licenseId) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT customer_email, source, license_fingerprint
    FROM exhibitkit_licenses
    WHERE id = ${licenseId}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function getLicenseIdByKeyHash(licenseKeyHash) {
  if (!licenseKeyHash) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT id
    FROM exhibitkit_licenses
    WHERE license_key_hash = ${licenseKeyHash}
    LIMIT 1
  `;
  const id = rows[0]?.id;
  return id ? String(id) : null;
}

/**
 * Seat check that distinguishes an expired time-limited license from a
 * revoked, transferred, or missing seat.
 * kind: 'active' | 'expired' | 'inactive' | 'missing'
 */
export async function lookupActivation(activationTokenHash, workstationHash) {
  const sql = getDatabase();
  const rows = await sql`
    SELECT
      license.id AS license_id,
      license.plan,
      license.status AS license_status,
      license.purchased_at,
      license.expires_at,
      license.updates_included_until,
      license.purchased_version,
      license.license_fingerprint,
      license.customer_email,
      license.source,
      activation.deactivated_at
    FROM exhibitkit_license_activations AS activation
    JOIN exhibitkit_licenses AS license
      ON license.id = activation.license_id
    WHERE activation.activation_token_hash = ${activationTokenHash}
      AND activation.workstation_hash = ${workstationHash}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { kind: 'missing' };
  if (row.deactivated_at || row.license_status !== 'active') return { kind: 'inactive' };

  const expiresMs = row.expires_at ? new Date(row.expires_at).getTime() : null;
  const expired = Number.isFinite(expiresMs) && expiresMs <= Date.now();

  await sql`
    UPDATE exhibitkit_license_activations
    SET last_seen_at = now()
    WHERE activation_token_hash = ${activationTokenHash}
      AND workstation_hash = ${workstationHash}
      AND deactivated_at IS NULL
  `;

  return { kind: expired ? 'expired' : 'active', record: row };
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
      license.id AS license_id,
      license.plan,
      license.purchased_at,
      license.expires_at,
      license.updates_included_until,
      license.purchased_version,
      license.license_fingerprint,
      license.customer_email,
      license.source
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

export async function insertBetaLicense(record) {
  const sql = getDatabase();
  const rows = await sql`
    INSERT INTO exhibitkit_licenses (
      license_key_hash,
      license_key_ciphertext,
      license_fingerprint,
      customer_email,
      customer_email_hash,
      stripe_checkout_session_id,
      stripe_price_id,
      plan,
      max_activations,
      purchased_at,
      expires_at,
      updates_included_until,
      purchased_version,
      source,
      invitee_name,
      invite_note,
      invited_by
    ) VALUES (
      ${record.licenseKeyHash},
      ${record.licenseKeyCiphertext},
      ${record.licenseFingerprint},
      ${record.customerEmail},
      ${record.customerEmailHash},
      ${record.checkoutSessionId},
      ${record.priceId},
      ${record.plan},
      ${record.maxActivations},
      ${record.purchasedAt},
      ${record.expiresAt},
      ${record.updatesIncludedUntil},
      ${record.purchasedVersion},
      ${record.source},
      ${record.inviteeName},
      ${record.inviteNote},
      ${record.invitedBy}
    )
    RETURNING *
  `;
  return rows[0];
}

export async function findActiveBetaLicense(customerEmailHash) {
  if (!customerEmailHash) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT id, expires_at, customer_email
    FROM exhibitkit_licenses
    WHERE customer_email_hash = ${customerEmailHash}
      AND source = 'beta'
      AND status = 'active'
      AND expires_at > now()
    ORDER BY expires_at DESC
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function listBetaInviteRows(limit = 500) {
  const sql = getDatabase();
  return sql`
    SELECT
      license.customer_email,
      license.invitee_name,
      license.invite_note,
      license.purchased_at,
      license.expires_at,
      license.email_delivery_status,
      license.email_provider_id,
      min(activation.activated_at) AS activated_at,
      max(activation.last_seen_at) AS last_seen_at
    FROM exhibitkit_licenses AS license
    LEFT JOIN exhibitkit_license_activations AS activation
      ON activation.license_id = license.id
    WHERE license.source = 'beta'
    GROUP BY license.id
    ORDER BY license.purchased_at DESC
    LIMIT ${limit}
  `;
}

export async function listEmailEvents(providerMessageIds) {
  const ids = [...new Set((providerMessageIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (ids.length === 0) return [];
  const sql = getDatabase();
  return sql`
    SELECT provider_message_id, event_type, occurred_at
    FROM exhibitkit_email_events
    WHERE provider_message_id = ANY(${ids})
    ORDER BY occurred_at ASC
  `;
}

export async function insertEmailEvent({ providerMessageId, eventType, occurredAt, svixId }) {
  const sql = getDatabase();
  await sql`
    INSERT INTO exhibitkit_email_events (
      provider_message_id,
      event_type,
      occurred_at,
      svix_id
    ) VALUES (
      ${providerMessageId},
      ${eventType},
      ${occurredAt},
      ${svixId}
    )
    ON CONFLICT (provider_message_id, event_type, svix_id) DO NOTHING
  `;
}

export async function listBetaInvites(limit = 25) {
  const sql = getDatabase();
  return sql`
    SELECT
      license.id,
      license.customer_email,
      license.license_fingerprint,
      license.invitee_name,
      license.invite_note,
      license.status,
      license.purchased_at,
      license.expires_at,
      license.email_delivery_status,
      count(activation.id) FILTER (WHERE activation.deactivated_at IS NULL) AS active_activations
    FROM exhibitkit_licenses AS license
    LEFT JOIN exhibitkit_license_activations AS activation
      ON activation.license_id = license.id
    WHERE license.source = 'beta'
    GROUP BY license.id
    ORDER BY license.purchased_at DESC
    LIMIT ${limit}
  `;
}

export async function revokeLicenseById(licenseId, status = 'revoked') {
  if (!licenseId) return 0;
  const sql = getDatabase();
  const rows = await sql`
    WITH revoked AS (
      UPDATE exhibitkit_licenses
      SET status = ${status}, updated_at = now()
      WHERE id = ${licenseId}
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
