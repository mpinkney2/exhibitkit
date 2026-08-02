# ExhibitKit | Message Evidence Exhibits

ExhibitKit is a privacy-first browser application that turns exported text-message conversations into organized, tamper-evident, court-ready PDF exhibits — without uploading your evidence.

**Headline:** Turn message history into organized, tamper-evident exhibits.

**Supporting copy:** Import exported conversations, review and redact what matters, and create a clean PDF tied to the original source—all without uploading your evidence.

---

## What ExhibitKit does

- Native parsing of supported message exports (JSON, CSV, plain text, SMS XML)
- Local browser processing — no evidence uploaded or stored on ExhibitKit servers
- True redaction (content removed), not visual overlays
- SHA-256 fingerprinting of source files
- Sequential message and page references
- Declaration-of-authenticity template
- Verifiable source integrity materials
- Honest language about admissibility: ExhibitKit does **not** certify authorship or guarantee court admissibility. The hash establishes whether the source file has changed, not who authored the messages.

A legacy PDF exhibit renaming workspace (OnCue / TrialDirector naming) remains available for Pro/ops testing from the app chrome.

---

## Pricing

| Plan | Price | Notes |
|------|-------|-------|
| **Free** | $0 | One conversation at a time, true redaction, clean PDF, sequential refs, no watermark, no account |
| **Case Pass** | $39 one time | All Pro capabilities for 30 days. No recurring billing |
| **ExhibitKit Pro** | $149 one time | **Perpetual license** — keep the purchased version permanently; 12 months of updates & support |
| **Optional updates** | $49 / year | After year one; not an automatic subscription |
| **Firm** | From $399 | Coming soon / contact us |

Payment is processed separately. Your evidence never enters the payment system.

---

## Trust architecture

- Message files and generated exhibits remain on the user’s device
- Payment requests never include filenames, case names, captions, message contents, or hashes
- No server-side evidence uploads
- Optional project save is an explicit local JSON download (message bodies omitted by default)
- Content Security Policy restricts unexpected network destinations from the evidence UI

---

## Developer setup

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

### Environment variables

Copy `.env.example` to `.env.local` and set Payment Link URLs:

```env
VITE_STRIPE_CASE_PASS_LINK=https://buy.stripe.com/...
VITE_STRIPE_PRO_LINK=https://buy.stripe.com/...
# optional legacy alias:
VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/...
```

### Payment configuration notes

Current hosting is a static Vite SPA. Checkout uses **Stripe Payment Links** (no secret keys in the client).

**Configured today**
- Client opens Stripe-hosted Payment Links for Pro (and Case Pass when `VITE_STRIPE_CASE_PASS_LINK` is set)
- Manual license activation with keys (`EKIT-XXXX-XXXX-XXXX` or `EKIT-CASE-XXXX-XXXX`)
- Entitlements stored locally: `free` | `case_pass` | `pro_perpetual` (+ future `firm`)

**Production hardening blocker (documented, not implemented in this static SPA)**
- Server-side Checkout Session creation
- Stripe webhook verification with idempotent event handling
- Issuing signed license keys only after verified payment
- Never trust client-supplied entitlement values in a multi-device seat model

Until a secure backend exists, treat Payment Links + emailed keys as the fulfillment path, and keep secret keys off the client.

### Development activation keys

Only available when `import.meta.env.DEV === true`:

- Pro: `PATENTPREPPERS-EXHIBITKIT-PRO`
- Case Pass: `EKIT-CASE-TEST-0001`

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local Vite server |
| `npm test` | Vitest suite |
| `npm run lint` | ESLint |
| `npm run build` | Production bundle |
