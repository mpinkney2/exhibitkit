# ExhibitKIT | Legal Exhibit Filename Renaming

ExhibitKIT is a local-first legal exhibit renaming and indexing utility for litigation operations, hot-seat trial operators, paralegals, and legal teams preparing databases for **OnCue** and **TrialDirector**.

---

## Trust Architecture: Local-First & Confidential

- **Zero Document Uploads:** Filename parsing, sequencing, and directory restructuring run in your browser.
- **Offline Operations:** Live renaming uses browser File System Access APIs on your workstation.
- **Metadata Protection:** Legal document content is not sent to ExhibitKIT servers. Payment checkout never receives filenames, matter names, or export data.

---

## Pricing & Access Model

| Plan | Price | Access |
|------|-------|--------|
| **Free** | $0 | Unlimited sample/demo workflow; **up to 5 files per batch**; parse, preview, edit; basic sequential numbering; standard CSV/HTML export; local processing; no account or watermark |
| **ExhibitKit Pro** | $149 one-time | **Perpetual license** — Pro renaming access does not expire; 12 months of updates and support included; optional renewal afterward |
| **Firm** | Starting at $399 | Contact us / Coming soon — not available for self-serve purchase |

**Required Pro clarification:** Your Pro access does not expire. Your purchase includes 12 months of updates and support. Renewal after that period is optional.

Optional Updates & Support (informational until renewal checkout is implemented): Pro $49/year · Firm $129/year. Renewal is never required to keep entitled renaming access.

The public launch offer is Free or $149 Pro, with Firm licenses handled by contact. The entitlement model retains Case Pass support for a possible future offer. Central pricing values live in [`src/config/pricing.js`](src/config/pricing.js).

### License restoration

Restore access with your **license key** (current format `EKIT-XXXX-XXXX-XXXX-XXXX`; legacy keys remain supported). New keys are verified by the Vercel licensing service and reserve one workstation. Existing customers who activated an older build are migrated automatically to Pro perpetual access on that workstation.

---

## Stripe Purchase & License Fulfillment

- **Pricing:** $149 USD one-time Pro workstation license. The purchased version remains licensed; 12 months of updates and support are included.
- **Checkout Flow:** Users transition to a Stripe-hosted Payment Link. ExhibitKIT adds the local workstation ID as Stripe's `client_reference_id` so a future webhook can reconcile payment and fulfillment without receiving exhibit data.
- **Return Flow:** Configure the Payment Link's post-payment redirect in Stripe to return to `https://YOUR_DOMAIN/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`.
- **License Fulfillment:** A verified Stripe webhook issues an encrypted-at-rest license record and emails the key through Resend.
- **Manual Activation:** The return URL never unlocks Pro. The emailed key must be verified by the server and activated on a workstation.
- **Recovery & Transfer:** Buyers can recover a key by purchase email and deliberately transfer a one-workstation license.
- **Deployment:** The backend code requires Neon, Resend, Stripe webhook, and Vercel environment setup; see [`docs/LICENSE_BACKEND_SETUP.md`](docs/LICENSE_BACKEND_SETUP.md).

---

## Developer Setup & Environment Variables

### Local Installation
```bash
# Install dependencies
npm install

# Run the local Vite dev server
npm run dev

# Lint
npm run lint

# Unit tests
npm test

# Production bundle
npm run build
```

### Environment Variables

Copy `.env.example` to `.env` and configure the public Payment Link:

```env
# Public Stripe Payment Link only. Never put a Stripe secret key in Vite variables.
VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/dRm4gze2Ob4c4NF3mKg7e01
```

Stripe secret keys and webhook secrets must remain server-side only. Do not place them in `VITE_*` variables. The full server environment is documented in [`docs/LICENSE_BACKEND_SETUP.md`](docs/LICENSE_BACKEND_SETUP.md).

### Founder live testing

**Local:** Open `http://localhost:5173/?founder=1` and unlock with the DEV default (`ekit-founder-2026`), or set `VITE_FOUNDER_ADMIN_SECRET` in `.env.local` (local only).

**Production / preview:** Set server-only `FOUNDER_ADMIN_SECRET` in Vercel (no `VITE_` prefix), redeploy, then open `https://YOUR_DOMAIN/?founder=1`. Unlock calls `POST /api/founder/unlock`. Never put the founder secret in a `VITE_*` variable — Vite exposes those in the browser bundle. Full steps: [`docs/FOUNDER_ADMIN.md`](docs/FOUNDER_ADMIN.md).

---

## Production Hardening

- Developer test key (`PATENTPREPPERS-EXHIBITKIT-PRO`) is available **only** when `import.meta.env.DEV === true`.
- Founder admin production unlock uses server-only `FOUNDER_ADMIN_SECRET` via `/api/founder/unlock` — never a `VITE_*` secret.
- Never trust client-submitted prices or entitlement values for paid access.
- Do not invent client-side licenses or simulated checkout.

---

## Roadmap (renamer product)

- [x] Deployable webhook fulfillment + durable entitlement store + idempotent Stripe processing
- [x] Server-verified license activation, recovery, deactivation, and transfer
- [ ] Configure Neon, Resend, Stripe webhook, and live Vercel secrets
- [ ] Firm team licensing (when implemented)
- [ ] Optional Updates & Support renewal checkout
