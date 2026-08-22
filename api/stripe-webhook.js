import {
  finishStripeEvent,
  recordStripeEvent,
  revokeLicenseByPaymentIntent,
} from './_lib/license-repository.js';
import { fulfillCheckoutSession, getStripe } from './_lib/stripe-fulfillment.js';
import { json, methodNotAllowed } from './_lib/http.js';

function stripeId(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id || null;
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);

    const signature = request.headers.get('stripe-signature');
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return json({ ok: false, error: 'Webhook signature is missing.' }, 400);
    }

    let event;
    try {
      const rawBody = await request.text();
      event = getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      return json({ ok: false, error: 'Webhook signature verification failed.' }, 400);
    }

    const checkoutSessionId = event.type.startsWith('checkout.session.')
      ? event.data.object?.id
      : null;

    try {
      await recordStripeEvent(event.id, event.type, checkoutSessionId);

      if (
        event.type === 'checkout.session.completed'
        || event.type === 'checkout.session.async_payment_succeeded'
      ) {
        await fulfillCheckoutSession(event.data.object.id);
        await finishStripeEvent(event.id, 'completed');
      } else if (event.type === 'charge.refunded' && event.data.object.refunded === true) {
        await revokeLicenseByPaymentIntent(
          stripeId(event.data.object.payment_intent),
          'refunded',
        );
        await finishStripeEvent(event.id, 'completed');
      } else if (event.type === 'charge.dispute.created') {
        await revokeLicenseByPaymentIntent(
          stripeId(event.data.object.payment_intent),
          'disputed',
        );
        await finishStripeEvent(event.id, 'completed');
      } else {
        await finishStripeEvent(event.id, 'ignored');
      }

      return json({ received: true });
    } catch (error) {
      console.error('Stripe fulfillment failed', {
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'unknown_error',
      });
      try {
        await finishStripeEvent(event.id, 'failed', 'fulfillment_failed');
      } catch (auditError) {
        console.error('Stripe event audit update failed', auditError);
      }
      return json({ received: false, error: 'Fulfillment failed and will be retried.' }, 500);
    }
  },
};
