# Billing backend requirements

ExhibitKIT is currently a **static Vite SPA**. This repository has **no** deployable server runtime (no Vercel/Netlify functions, no Express host, no durable database).

Until a billing backend is provisioned on your hosting platform, the client:

- Shows the full pricing UI (Free, Case Pass, Pro, Firm)
- **Disables** paid purchase CTAs with a clear configuration message
- Continues to support **license key restoration** for existing/migrated Pro customers
- Does **not** mint licenses or simulate Stripe Checkout in the browser

## Required components

1. **Server-side Checkout Session creation**
   - Use Stripe Price IDs from environment variables (`STRIPE_PRICE_CASE_PASS`, `STRIPE_PRICE_PRO`).
   - Never trust client-submitted amounts.
   - Session metadata may contain only an opaque license/customer identifier and plan ID.
   - Never include filenames, matter names, export data, or document contents.

2. **Durable entitlement store**
   - Not ephemeral serverless memory and not a local JSON file on a function instance.
   - Suitable options: Postgres, Stripe Customer + License records in a managed DB, etc.

3. **Idempotent Stripe webhooks**
   - Verify signatures with `STRIPE_WEBHOOK_SECRET`.
   - Handle `checkout.session.completed` (and related events) idempotently.
   - Issue or update a license key / entitlement record server-side.

4. **License restoration**
   - Primary method: **license key** entered in the app → server verifies → returns a **signed** entitlement payload (or activates via a verified API).
   - Alternatives (future): verified purchase email recovery, or authenticated customer identity.
   - Do not expose unsigned entitlement JSON that clients can edit to unlock Pro.
   - Do not use guessable `seat` query parameters.

5. **Client env (only after backend exists)**
   - `VITE_CHECKOUT_API_URL`
   - `VITE_ENTITLEMENT_API_URL`
   - `VITE_STRIPE_PRICE_CASE_PASS` / `VITE_STRIPE_PRICE_PRO` (public price id references used to enable the correct CTA; amounts still come from Stripe server-side)

## Entitlement semantics

| Plan | Access |
|------|--------|
| Free | Up to 5 real files/batch; sample workflow unlimited; no Pro rename/ZIP/profiles/undo |
| Case Pass | Pro renaming for 30 consecutive days; no auto-renew |
| Pro | Perpetual Pro renaming access; `updatesIncludedUntil` for messaging only |
| Firm | Not self-serve; Contact us only |

Pro access **must not** revert to Free when the update/support window ends.
