# Founder admin — live-test console

Use this to switch entitlement stages and app surfaces without Stripe. Stage switches write the **local entitlement cache** only. They are not Stripe purchases and do not replace the billing backend.

## Local development

1. Start the app (`npm run dev`).
2. Open: **http://localhost:5173/?founder=1**
3. Enter the founder secret in the panel (bottom-right).

Alternate entry:
- Hash: `http://localhost:5173/#founder`
- Keyboard: **Ctrl+Shift+F** (shows the panel if previously hidden)

| Build | Secret |
|-------|--------|
| Local development | Set `VITE_FOUNDER_ADMIN_SECRET` in `.env.local`. There is no built-in default. |

Optional DEV license key (pricing modal / activation, DEV builds only):

`PATENTPREPPERS-EXHIBITKIT-PRO`

## Production / preview unlock (server-only secret)

Do **not** put the founder secret in any `VITE_*` variable. Vite inlines those into the browser bundle.

1. In **Vercel → Project → Settings → Environment Variables**, add for Production:

   | Name | Value |
   |------|-------|
   | `FOUNDER_ADMIN_SECRET` | A random secret of at least 32 characters. **No `VITE_` prefix.** Do not reuse a default, example, or test placeholder. |
   | `ENTITLEMENT_SIGNING_KEY` | Server-only Ed25519 seed from `npm run license:secrets`. |
   | `VITE_ENTITLEMENT_PUBLIC_KEY` | Matching public key. Safe to expose. Required at **build** time. |
   | `ENTITLEMENT_SIGNING_KEY_ID` | Optional. Defaults to `current`. |
   | `VITE_ENTITLEMENT_PUBLIC_KEY_ID` | Optional. Defaults to `current`. Must match the signing key id. |
   | `VITE_ENTITLEMENT_ADDITIONAL_PUBLIC_KEYS` | Optional JSON map of older key ids to public keys for rotation. |

2. Redeploy production so the serverless function and the client build pick up the env vars.

3. Open: `https://YOUR_DOMAIN/?founder=1`

4. Enter the same secret. The client POSTs to `/api/founder/unlock`. The server compares it with `FOUNDER_ADMIN_SECRET` using a timing-safe check and returns a short-lived signed founder token. The browser verifies that token.

5. When finished testing, remove `FOUNDER_ADMIN_SECRET` from Vercel (or rotate it) and redeploy.

### Security notes

- Production unlock never reads a client-side founder secret.
- A stored boolean is not an unlock. The browser keeps the signed founder token for the tab only (click **Lock** to clear).
- Local stage switches apply in development builds. They are not Stripe purchases, and they do not grant paid access outside development.
- Production paid access follows a signed license entitlement. Use beta invites when a tester needs a real key.
- Keep `FOUNDER_ADMIN_SECRET` distinct from Stripe, database, and license crypto secrets.

## Beta invites and the invite report

Unlock founder admin, then use **Beta invites**. One address still sends a single key. **Send to list** accepts commas, newlines, or semicolons, removes duplicates, skips invalid addresses, and skips an address that already has an active unexpired beta. One Days value (1–180, with 10/20/30 presets) and one optional note apply to the whole list. A list is capped at 50 addresses. Each HTTP request still counts toward 30 requests per hour per IP before the secret is checked. After the secret checks out, each minted address in a list counts toward 200 mints per hour. Addresses past that budget are returned as not sent.

**Invite report** lists beta invites: email, name or note, sent date, days, expiry, email delivery, activation time, last status check, days left, and email events. Filter by status and export CSV. The report is founder-only and checks `FOUNDER_ADMIN_SECRET` on the server.

Email events need a new server-only variable and a Resend webhook. Do not prefix it with `VITE_`.

| Name | Value |
|------|-------|
| `RESEND_WEBHOOK_SECRET` | Signing secret from the Resend webhook endpoint. Server-only. |

1. Apply database migrations (`npm run db:migrate`), including `db/migrations/006_email_events.sql`.
2. In Resend, open the sending domain used by `LICENSE_EMAIL_FROM` and enable **open tracking**. Click tracking is needed for click events.
3. Add a webhook endpoint: `https://YOUR_DOMAIN/api/webhooks/resend`.
4. Subscribe to `email.delivered`, `email.opened`, `email.clicked`, and `email.bounced`.
5. Copy the webhook signing secret into `RESEND_WEBHOOK_SECRET` and redeploy.

Until `RESEND_WEBHOOK_SECRET` is set, `POST /api/webhooks/resend` rejects requests and the invite report says `email tracking not configured`. The report still lists invites if the email-events table is missing.

## What you can test

**Founder unlimited (local development):**
1. Unlock founder admin.
2. Click **Founder Pro — unlimited renaming (skip payment)**.
3. Workspace opens with Pro renaming, unlimited batches, and no payment screen.
4. Access lasts for this development browser session. Click **Lock** (or clear site data) to end it.
5. On production and preview, that button is not available. Paid renaming follows a signed license.

Entitlement stages:
- Free
- Case Pass active / expired / payment pending
- Pro with updates included
- Pro with updates lapsed (Pro access must remain on)

App surfaces:
- Landing, Workspace, Stripe success, Stripe cancel
- Pricing modal
- Checkout configuration status
