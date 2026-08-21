# Changelog

All notable changes to the **ExhibitKIT** litigation preparation utility will be documented in this file.

---

## [0.10.1] - 2026-08-21

### Added — Founder admin live-test console
- Secret-gated founder panel (`/?founder=1`, `#founder`, or Ctrl+Shift+F)
- Stage switches: Free, Case Pass (active/expired/pending), Pro (updates included/lapsed)
- Surface jumps: landing, workspace, Stripe success/cancel, pricing modal
- Docs: `docs/FOUNDER_ADMIN.md`, `.env.example` (`VITE_FOUNDER_ADMIN_SECRET`)

---

## [0.10.0] - 2026-08-02

### Changed — Pricing model migration
- Replaced the former single **$150 lifetime** Pro SKU with:
  - **Free** ($0): unlimited sample workflow; up to **5 files per batch** (not a one-time consume limit); preview/edit; CSV/HTML export
  - **Case Pass** ($39 one-time): Pro renaming for 30 consecutive days; no auto-renew
  - **ExhibitKit Pro** ($149 one-time): perpetual Pro renaming access; 12 months updates/support included; optional renewal afterward
  - **Firm** (starting at $399): Contact us / Coming soon — no self-serve purchase button
- Centralized plan IDs, prices, CTAs, feature matrices, and FAQ copy in `src/config/pricing.js`
- Introduced entitlement states (`free`, `case_pass`, `pro_perpetual`) with legacy-license migration to `pro_perpetual`
- Configuration-aware checkout adapter: paid CTAs disabled until a verified billing backend is configured (`docs/BILLING_BACKEND.md`)
- Customer-facing copy now uses **perpetual license** (never “lifetime license”)
- Primary Free CTA: “Rename exhibits free”

### Added
- Pricing FAQ on the landing page and in the pricing modal
- Vitest coverage for pricing config, Free file limit, Case Pass expiry, Pro after updates window, Firm non-purchase, checkout gating, FAQ presence, banned copy, and legacy migration

---

## [0.9.3] - 2026-05-23

### Added
- **Multi-Tier Product Access Model:**
  - **Demo Mode:** Unlimited testing sandbox loaded with realistic courtroom mockup exhibits. Blocks real file read/write APIs.
  - **Free Trial Mode:** Allows testing exactly **1 real batch** with a maximum of **5 real files**. Consumption occurs on successful filesystem execution.
  - **Pro Active Mode:** Unrestricted local file prepared runs, full directory renames, and premium saved profiles.
- **Litigation Operational Styling:** Disciplined workspace spacing, trustworthy dark theme, and premium metadata signatures.
- **Local Workstation/Device ID Profile:** Auto-generates unique `deviceId` metrics on first launch to facilitate workstation diagnostics and future seat limits.
- **Safety Backup Gates:** Integrated a required backup checkbox confirmation modal before live bulk renames.
- **Action State Freezing:** Prevents mid-process configuration changes and cell edits while file renames are executing.
- **Printable Session Audit Report:** Generated beautiful printable HTML audit trails, JSON audit log exports, and CSV name mapping exports.
- **Saved Matter Profiles:** Added Pro-only configurations for storing, loading, and quickly applying case-specific naming preset rules.
- **Legal Modals Footer:** Direct access to Terms of Use disclaimers, Privacy offline pledges, operational "How to Use" checklists, and technical support.
- **Stripe Success & Cancel Pages:** Custom landing views for manual license activation following secure Stripe Checkout purchases.

### Secured
- **Production Key Shields:** Excluded developer activation bypass key (`PATENTPREPPERS-EXHIBITKIT-PRO`) from the production UI. Display is strictly gated behind `import.meta.env.DEV === true`.
- **Absolute Local Confidentiality:** Gated all real file drops and folder picker accesses, confirming files never leave user workstations.
