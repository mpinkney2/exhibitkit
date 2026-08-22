import Stripe from 'stripe';
import {
  decryptLicenseKey,
  encryptLicenseKey,
  generateLicenseKey,
  hashEmail,
  hashLicenseKey,
  hashWorkstationId,
  licenseFingerprint,
  normalizeEmail,
} from './license-crypto.js';
import {
  updateLicenseEmailStatus,
  upsertLicenseFromCheckout,
} from './license-repository.js';
import { sendLicenseDelivery } from './license-email.js';

let stripe = null;

export function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured.');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2 });
  }
  return stripe;
}

function stripeId(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id || null;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next.toISOString();
}

function sanitizeWorkstationId(value) {
  const workstationId = String(value || '').trim();
  return /^EKIT-WORKSTATION-[A-Z0-9]{16}$/.test(workstationId)
    ? workstationId
    : null;
}

export async function fulfillCheckoutSession(sessionId) {
  const expectedPriceId = process.env.STRIPE_PRICE_ID;
  if (!expectedPriceId) throw new Error('STRIPE_PRICE_ID is not configured.');

  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ['line_items'],
  });

  if (session.mode !== 'payment' || session.payment_status !== 'paid') {
    throw new Error('Checkout Session is not a completed one-time payment.');
  }

  const lineItems = session.line_items?.data || [];
  const matchingItems = lineItems.filter((item) => stripeId(item.price) === expectedPriceId);
  const quantity = matchingItems.reduce((total, item) => total + (item.quantity || 0), 0);
  if (matchingItems.length !== 1 || quantity !== 1 || lineItems.length !== 1) {
    throw new Error('Checkout Session does not contain the configured ExhibitKIT price.');
  }

  const customerEmail = normalizeEmail(
    session.customer_details?.email || session.customer_email,
  );
  if (!customerEmail) throw new Error('Checkout Session is missing a customer email.');

  const purchasedAt = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000).toISOString();
  const generatedKey = generateLicenseKey();
  const workstationId = sanitizeWorkstationId(session.client_reference_id);
  const record = await upsertLicenseFromCheckout({
    licenseKeyHash: hashLicenseKey(generatedKey),
    licenseKeyCiphertext: encryptLicenseKey(generatedKey),
    licenseFingerprint: licenseFingerprint(generatedKey),
    customerEmail,
    customerEmailHash: hashEmail(customerEmail),
    checkoutSessionId: session.id,
    paymentIntentId: stripeId(session.payment_intent),
    customerId: stripeId(session.customer),
    priceId: expectedPriceId,
    plan: 'pro_perpetual',
    maxActivations: 1,
    purchasedAt,
    expiresAt: null,
    updatesIncludedUntil: addMonths(purchasedAt, 12),
    purchasedVersion: process.env.EXHIBITKIT_VERSION || 'v0.10.0',
    initialWorkstationHash: workstationId ? hashWorkstationId(workstationId) : null,
  });

  const licenseKey = decryptLicenseKey(record.license_key_ciphertext);
  try {
    const providerId = await sendLicenseDelivery({
      to: record.customer_email,
      licenseKey,
      checkoutSessionId: record.stripe_checkout_session_id,
      purchasedAt: record.purchased_at,
    });
    await updateLicenseEmailStatus(record.id, 'sent', providerId);
  } catch (error) {
    await updateLicenseEmailStatus(record.id, 'failed');
    throw error;
  }

  return record;
}
