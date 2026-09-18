# Billing and licensing backend

ExhibitKIT now includes Vercel Functions for secure Stripe fulfillment and license activation.

The implementation provides:

- Stripe webhook signature verification from the unmodified request body
- exact Stripe Price and paid-session checks
- idempotent Checkout Session fulfillment
- encrypted durable license records in Neon Postgres
- automatic delivery and recovery through Resend
- one-workstation activation, explicit transfer, and local deactivation
- refund/dispute revocation and periodic activation-status checks
- database-backed request throttling

The service still requires its external integrations, database migration, and server-only Vercel variables before it is live. Follow [`LICENSE_BACKEND_SETUP.md`](LICENSE_BACKEND_SETUP.md) for the deployment checklist.

The public Vite app receives only the Payment Link and same-origin API path. Stripe keys, the webhook secret, database credentials, Resend key, encryption key, and hashing secrets must never use the `VITE_` prefix.
