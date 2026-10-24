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
