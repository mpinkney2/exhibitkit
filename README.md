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

Restore access with your **license key** (format `EKIT-XXXX-XXXX-XXXX`). Existing customers who purchased the former Pro offer are migrated automatically to Pro perpetual access on this workstation.

---

## Stripe Purchase & License Fulfillment

- **Pricing:** $149 USD one-time Pro workstation license. The purchased version remains licensed; 12 months of updates and support are included.
- **Checkout Flow:** Users transition to a Stripe-hosted Payment Link. ExhibitKIT adds the local workstation ID as Stripe's `client_reference_id` so a future webhook can reconcile payment and fulfillment without receiving exhibit data.
- **Return Flow:** Configure the Payment Link's post-payment redirect in Stripe to return to `https://YOUR_DOMAIN/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`.
- **Manual Activation:** In compliance with security standards, the application remains locked until a valid key is provided manually (no insecure automatic activations).
- **Important:** A return URL is not proof of payment. Production license verification still requires a server-side webhook and activation service; see [`docs/stripe-hardening.md`](docs/stripe-hardening.md).

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

# Founder live-test console (see docs/FOUNDER_ADMIN.md)
VITE_FOUNDER_ADMIN_SECRET=replace_with_a_private_value
```

Stripe secret keys and webhook secrets must remain server-side only. Do not place them in `VITE_*` variables.

### Founder live testing

Open `http://localhost:5173/?founder=1` and unlock with the founder secret (DEV default: `ekit-founder-2026`). Full instructions: [`docs/FOUNDER_ADMIN.md`](docs/FOUNDER_ADMIN.md).

---

## Production Hardening

- Developer test key (`PATENTPREPPERS-EXHIBITKIT-PRO`) is available **only** when `import.meta.env.DEV === true`.
- Never trust client-submitted prices or entitlement values for paid access.
- Do not invent client-side licenses or simulated checkout.

---

## Roadmap (renamer product)

- [ ] Deployable checkout + durable entitlement store + idempotent Stripe webhooks
- [ ] Signed license restoration API
- [ ] Firm team licensing (when implemented)
- [ ] Optional Updates & Support renewal checkout
