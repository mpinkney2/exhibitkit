# ExhibitKIT secure licensing setup

The codebase now includes a Vercel licensing service. It does not become live until the database, email sender, Stripe webhook, and Vercel secrets below are configured.

## What the service does

1. Stripe confirms a paid Checkout Session through a signed webhook.
2. ExhibitKIT verifies that the Session contains exactly one configured $149 Price.
3. A cryptographically random license key is created.
4. The database stores a keyed hash for lookup and an AES-256-GCM encrypted copy for recovery; it never stores the key in plaintext.
5. Resend emails the key to the address collected by Stripe.
6. Activation verifies the key on the server and reserves one workstation seat.
7. A deliberate transfer deactivates the old seat. Refunds and disputes revoke active seats.

No exhibit filenames, matter names, file contents, or export data are sent to these services.

## 1. Add Neon Postgres in Vercel

In the ExhibitKIT Vercel project:

1. Open **Storage** or **Integrations**.
2. Add **Neon Postgres** from the Vercel Marketplace.
3. Connect it to Production, Preview, and Development as appropriate.
4. Confirm Vercel added `DATABASE_URL`.
5. Open the Neon SQL Editor and run [`db/migrations/001_secure_licensing.sql`](../db/migrations/001_secure_licensing.sql).

For local setup, pull the Vercel variables into `.env.local`, then the migration can also be run with `npm run db:migrate`.

## 2. Add Resend and verify the sender

1. Add **Resend** from the Vercel Marketplace.
2. In Resend, verify `patentpreppers.com` (or a dedicated sending subdomain) by adding its DNS records.
3. Confirm Vercel added `RESEND_API_KEY`.
4. Add `LICENSE_EMAIL_FROM`, for example `ExhibitKIT <licenses@patentpreppers.com>`.

Resend's test sender can only email the account owner. A verified domain is required before customer delivery.

## 3. Configure the Stripe webhook

In Stripe live mode:

1. Open the $149 Product and copy the active $149 Price ID (`price_...`).
2. Add a webhook destination:
   `https://exhibitkit.patentpreppers.com/api/stripe-webhook`
3. Subscribe to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `charge.refunded`
   - `charge.dispute.created`
4. Reveal and copy that endpoint's signing secret (`whsec_...`).
5. Ensure the Payment Link collects the buyer's email.
6. Set its after-payment redirect to:
   `https://exhibitkit.patentpreppers.com/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`

Use the Price ID behind the new $149 Payment Link, not the old $150 Price.

## 4. Add Vercel environment variables

Set these as server-only variables for Production. Do not prefix any secret with `VITE_`.

```env
APP_URL=https://exhibitkit.patentpreppers.com
SUPPORT_EMAIL=support@patentpreppers.com
DATABASE_URL=postgresql://...

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

RESEND_API_KEY=re_...
LICENSE_EMAIL_FROM="ExhibitKIT <licenses@patentpreppers.com>"

LICENSE_HASH_SECRET=...
RATE_LIMIT_HASH_SECRET=...
LICENSE_ENCRYPTION_KEY=...
LICENSE_TRANSFER_COOLDOWN_HOURS=24
EXHIBITKIT_VERSION=v0.10.0
```

Generate the three license secrets locally with:

```bash
npm run license:secrets
```

Copy the output directly into Vercel. Do not save it in Git or share it in screenshots.

The only public values are:

```env
VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/dRm4gze2Ob4c4NF3mKg7e01
VITE_LICENSE_API_URL=/api/license
```

## 5. Redeploy and test before selling

1. Redeploy the latest commit after all variables are saved.
2. Use Stripe test mode first with test equivalents of the secret key, Price, Payment Link, and webhook secret.
3. Complete a `4242 4242 4242 4242` test checkout.
4. Confirm Stripe reports a `200` webhook response.
5. Confirm the license row exists in Neon and `email_delivery_status` is `sent`.
6. Confirm the email arrives and the key activates one workstation.
7. Try the same key on a second browser profile; it should offer a transfer instead of silently activating.
8. Confirm the recovery form sends the same key without revealing whether an arbitrary email exists.
9. Perform a test refund and confirm the next license-status check removes Pro access.

Only after that end-to-end test passes should the Stripe variables be switched to live mode.

## Operational notes

- Webhook fulfillment is safe to retry: the Stripe Checkout Session ID is unique and Resend receives a deterministic idempotency key.
- License and recovery requests are rate-limited in Postgres. Vercel Firewall rate limiting can be added as a second layer.
- The app checks active server-issued seats at startup and every six hours. A temporary network outage does not immediately disable a previously verified perpetual license.
- Because ExhibitKIT runs in the browser, no client-side licensing system can be absolute DRM against someone who modifies the application code. The implementation prevents arbitrary formatted keys, enforces seats centrally, and provides reliable fulfillment without sending legal documents to the server.
