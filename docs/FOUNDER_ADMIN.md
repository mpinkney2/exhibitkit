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
| Local development (default) | `ekit-founder-2026` |
| Local development (custom) | Set `VITE_FOUNDER_ADMIN_SECRET` in `.env.local` (DEV override only) |

Optional DEV license key (pricing modal / activation, DEV builds only):

`PATENTPREPPERS-EXHIBITKIT-PRO`

## Production / preview unlock (server-only secret)

Do **not** put the founder secret in any `VITE_*` variable. Vite inlines those into the browser bundle.

1. In **Vercel → Project → Settings → Environment Variables**, add for Production:

   | Name | Value |
   |------|-------|
   | `FOUNDER_ADMIN_SECRET` | A long random secret (≥16 chars). **No `VITE_` prefix.** |

2. Redeploy production so the serverless function picks up the env var.

3. Open: `https://YOUR_DOMAIN/?founder=1`

4. Enter the same secret. The client POSTs to `/api/founder/unlock`; the server compares with `FOUNDER_ADMIN_SECRET` using a timing-safe check.

5. When finished testing, remove `FOUNDER_ADMIN_SECRET` from Vercel (or rotate it) and redeploy.

### Security notes

- Production unlock never reads a client-side founder secret.
- Session unlock is stored in `sessionStorage` for the browser tab only (click **Lock** to clear).
- Stage helpers only mutate local entitlement cache; they are not Stripe purchases.
- Keep `FOUNDER_ADMIN_SECRET` distinct from Stripe, database, and license crypto secrets.

## What you can test

**Founder unlimited (recommended for live product testing):**
1. Unlock founder admin.
2. Click **Founder Pro — unlimited renaming (skip payment)**.
3. Workspace opens with Pro renaming, unlimited batches, and no payment screen.
4. Access lasts for this browser while the founder session stays unlocked. Click **Lock** (or clear site data) to end it.

Entitlement stages:
- Free
- Case Pass active / expired / payment pending
- Pro with updates included
- Pro with updates lapsed (Pro access must remain on)

App surfaces:
- Landing, Workspace, Stripe success, Stripe cancel
- Pricing modal
- Checkout configuration status
