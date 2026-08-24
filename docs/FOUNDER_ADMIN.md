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
| Local development (custom) | Set `VITE_FOUNDER_ADMIN_SECRET` in `.env.local` |

Optional DEV license key (pricing modal / activation, DEV builds only):

`PATENTPREPPERS-EXHIBITKIT-PRO`

## Production / preview unlock

Founder admin is **off** in production builds unless you explicitly enable it.

1. In **Vercel → Project → Settings → Environment Variables**, add for Production (and Preview if desired):

   | Name | Value |
   |------|-------|
   | `VITE_FOUNDER_ADMIN_SECRET` | A long random secret you choose (not the local default) |

2. **Redeploy** the production deployment so Vite bakes the variable into the client bundle. Changing the env var alone does not update an already-built deploy.

3. Open: `https://YOUR_DOMAIN/?founder=1`

4. Enter the same secret you set in Vercel.

5. When finished testing, remove `VITE_FOUNDER_ADMIN_SECRET` from Vercel and redeploy to strip the console from the next build.

### Security note

`VITE_*` values are visible in the browser bundle. This gate is **obscurity for a founder testing console**, not server-side authorization. Do **not** reuse this secret for Stripe, database, or license crypto. Prefer a unique random value and remove it when you no longer need production stage switching.

The local default (`ekit-founder-2026`) is **never** accepted in production builds.

## What you can test

Entitlement stages:
- Free
- Case Pass active / expired / payment pending
- Pro with updates included
- Pro with updates lapsed (Pro access must remain on)

App surfaces:
- Landing, Workspace, Stripe success, Stripe cancel
- Pricing modal
- Checkout configuration status

Session unlock is stored in `sessionStorage` for the browser tab only. Click **Lock** to end the session.
