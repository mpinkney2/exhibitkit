# Stripe and License Hardening

ExhibitKIT uses a Stripe-hosted Payment Link for the checkout surface. This keeps card handling out of the React application and avoids exposing Stripe secrets in the browser.

## Current client flow

1. ExhibitKIT builds the configured HTTPS Payment Link.
2. The workstation ID is attached as `client_reference_id` for reconciliation.
3. Stripe hosts and processes checkout.
4. Stripe redirects the buyer back to the ExhibitKIT completion screen.
5. The buyer enters the license key delivered through the fulfillment process.

The redirect is a convenience screen, not payment verification. Anyone can construct a success URL, so it must never unlock Pro access by itself.

## Required production service

Before calling licensing production-hardened, add a small server-side service that:

1. Receives Stripe's `checkout.session.completed` webhook.
2. Verifies the raw request body with `STRIPE_WEBHOOK_SECRET`.
3. Confirms the expected product/price and that payment is complete.
4. Creates an idempotent fulfillment record keyed by Checkout Session ID.
5. Issues a random or signed license credential associated with the Stripe customer and `client_reference_id`.
6. Exposes an activation endpoint that validates the credential, enforces seat policy, and returns signed activation data.
7. Supports license recovery and workstation transfer without storing exhibit filenames or contents.

Recommended server-only variables:

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

These values must never appear in `.env` variables prefixed with `VITE_`, because Vite exposes those values to the browser bundle.

## Stripe dashboard checklist

- Set the Payment Link product to the intended one-time $149 price.
- Collect the customer email used for license delivery and recovery.
- Configure the post-payment redirect with `{CHECKOUT_SESSION_ID}`.
- Add the refund policy, terms, privacy link, and support contact to Checkout.
- Configure branding and a statement descriptor customers will recognize.
- Use Stripe test mode and the Stripe CLI before enabling live webhook fulfillment.
- Make webhook processing idempotent and retry-safe.

## Known licensing gap

The current browser implementation checks license-key format and local state; it does not yet prove that a key was issued after a Stripe payment. Do not market it as tamper-resistant licensing until the activation endpoint above replaces client-only validation.
