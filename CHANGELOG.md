# Changelog

All notable changes to **ExhibitKit** will be documented in this file.

---

## [1.0.0] - 2026-08-02

### Repositioned
- Primary product focus is now **message-evidence preparation**: import conversation exports, redact locally, and export tamper-evident PDF exhibits.
- Branding standardized to **ExhibitKit** (perpetual license terminology replaces “lifetime”).

### Added
- Free / Case Pass ($39) / Pro perpetual ($149) / Firm (coming soon) pricing section with comparison table and FAQ.
- Browser-local project model (matter, caption, source SHA-256, selected/redacted messages).
- Local PDF pipeline: sequential refs, declaration template, Pro cover/index/integrity/binder/ZIP.
- Entitlement model (`free`, `case_pass`, `pro_perpetual`, future `firm`) with Case Pass expiration that never deletes local files.
- Payment adapter around Stripe Payment Links; privacy-safe checkout payloads; evidence network guard + CSP.
- Vitest suite covering pricing, entitlements, hashing, redaction, PDF export, payment privacy, and upload blocking.

### Preserved
- Legacy PDF rename workspace remains available for Pro/ops testing.

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
