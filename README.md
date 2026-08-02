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
| **Case Pass** | $39 one-time | All Pro renaming features for **30 consecutive days**; unlimited batches; in-place rename; Matter Profiles; undo; ZIP exports; **no automatic renewal** |
| **ExhibitKit Pro** | $149 one-time | **Perpetual license** — Pro renaming access does not expire; 12 months of updates and support included; optional renewal afterward |
| **Firm** | Starting at $399 | Contact us / Coming soon — not available for self-serve purchase |

**Required Pro clarification:** Your Pro access does not expire. Your purchase includes 12 months of updates and support. Renewal after that period is optional.

Optional Updates & Support (informational until renewal checkout is implemented): Pro $49/year · Firm $129/year. Renewal is never required to keep entitled renaming access.

Central pricing values live in [`src/config/pricing.js`](src/config/pricing.js). See [`docs/BILLING_BACKEND.md`](docs/BILLING_BACKEND.md) for server-side checkout requirements.

### License restoration

Restore access with your **license key** (format `EKIT-XXXX-XXXX-XXXX`). Existing customers who purchased the former Pro offer are migrated automatically to Pro perpetual access on this workstation.

---

## Developer Setup

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

Pricing UI works without checkout configuration. Paid purchase CTAs stay **disabled** until a verified billing backend is configured:

```env
# Required together for enabling Case Pass / Pro checkout CTAs (after backend exists)
VITE_CHECKOUT_API_URL=
VITE_ENTITLEMENT_API_URL=
VITE_STRIPE_PRICE_CASE_PASS=
VITE_STRIPE_PRICE_PRO=
```

Stripe secret keys and webhook secrets must remain server-side only. Do not place them in `VITE_*` variables.

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
