# Founder admin — live testing console

Use this to switch entitlement stages and app surfaces without Stripe.

## Access method

1. Start the app (`npm run dev`).
2. Open: **http://localhost:5173/?founder=1**
3. Enter the founder secret in the panel (bottom-right).

Alternate entry:
- Hash: `http://localhost:5173/#founder`
- Keyboard: **Ctrl+Shift+F** (shows the panel if previously hidden)

## Credentials

| Build | Secret |
|-------|--------|
| Any build (default) | `ekit-founder-2026` |
| Custom host | Set `VITE_FOUNDER_ADMIN_SECRET` in `.env.local` / host env (overrides default) |

Session unlock is stored in `sessionStorage` for the browser tab only. Click **Lock** to end the session.

Optional DEV license key (pricing modal / activation, DEV builds only):

`PATENTPREPPERS-EXHIBITKIT-PRO`

## What you can test

Entitlement stages:
- Free
- Case Pass active / expired / payment pending
- Pro with updates included
- Pro with updates lapsed (Pro access must remain on)

App surfaces:
- Landing, Workspace, Stripe success, Stripe cancel
- Pricing modal
- Checkout configuration status (enabled only when billing env is set)

Stage switches write the **local entitlement cache** only. They are not Stripe purchases and do not replace the billing backend described in `docs/BILLING_BACKEND.md`.
