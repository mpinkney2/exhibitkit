# Stripe and License Hardening

ExhibitKIT uses a Stripe-hosted Payment Link for the checkout surface. This keeps card handling out of the React application and avoids exposing Stripe secrets in the browser.

## Current client flow

1. ExhibitKIT builds the configured HTTPS Payment Link.
2. The workstation ID is attached as `client_reference_id` for reconciliation.
3. Stripe hosts and processes checkout.
4. Stripe redirects the buyer back to the ExhibitKIT completion screen.
5. The buyer enters the license key delivered through the fulfillment process.

The redirect is a convenience screen, not payment verification. Anyone can construct a success URL, so it must never unlock Pro access by itself.

## Implemented production service

The repository now includes a server-side service that:

1. Receives Stripe's `checkout.session.completed` webhook.
2. Verifies the raw request body with `STRIPE_WEBHOOK_SECRET`.
3. Confirms the expected product/price and that payment is complete.
4. Creates an idempotent fulfillment record keyed by Checkout Session ID.
5. Issues a random or signed license credential associated with the Stripe customer and `client_reference_id`.
6. Exposes an activation endpoint that validates the credential, enforces seat policy, and returns signed activation data.
7. Supports license recovery and workstation transfer without storing exhibit filenames or contents.
8. Revokes active seats after a full refund or dispute.
9. Applies database-backed throttling to activation, transfer, and recovery requests.

Recommended server-only variables:

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
DATABASE_URL=postgresql://...
RESEND_API_KEY=re_...
LICENSE_HASH_SECRET=...
RATE_LIMIT_HASH_SECRET=...
LICENSE_ENCRYPTION_KEY=...
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

## Deployment status

New keys are no longer accepted by format alone. The activation endpoint must verify them against the durable license store. Existing local licenses are preserved as a legacy migration.

The code does not become operational until Neon, Resend, the Stripe webhook, the SQL migration, and all server-only Vercel variables are configured. See [`LICENSE_BACKEND_SETUP.md`](LICENSE_BACKEND_SETUP.md).
