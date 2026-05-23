# ExhibitKIT | Legal Exhibit Preparation Dashboard

ExhibitKIT is an enterprise-grade, local-first legal exhibit renaming and indexing utility engineered for high-stakes litigation operations, hot-seat trial operators, paralegals, and legal teams preparing databases for **OnCue** and **TrialDirector**.

---

## 🛡️ Trust Architecture: Local-First & Confidential

Confidentiality is paramount in legal document handling. Unlike cloud converters that stream user records to third-party servers:
- **Zero Document Uploads:** All PDF text parsing, sequencing, and directory restructuring occur entirely locally within your browser sandbox.
- **Offline Operations:** All live renaming operations are executed directly on your local workstation's hard drive using browser File System Access APIs.
- **Metadata Protection:** No legal document metadata or content ever leaves your machine.

---

## 🔒 Licensing & Access Model

ExhibitKIT utilizes a highly structured three-tier access and licensing layer, designed to support professional trial preparation without exposing intellectual property or core workflows.

### 1. Demo Mode
- **Unrestricted Evaluation:** Complete interface testing using mock datasets containing realistic courtroom names.
- **Evaluation Sandbox:** Test preset formats (OnCue/TrialDirector), auto-sequencing, case conversions, conflict scanning, and printable HTML session reports.
- **Restrictions:** Real file drops and local folder reads/writes are strictly blocked.

### 2. One-Time Trial Mode
- **Workspace Validation:** Ingest and process exactly **one real batch** of up to **5 real PDF files** to confirm compatibility with your workstation filesystem.
- **Enforcement:** The trial is automatically consumed upon successful live execution. Subsequent directory renames will require manual license activation.

### 3. Pro Active Mode
- **Professional Toolkit:** Unrestricted local file preparation, unlimited batches and PDFs, direct folder updates, and printable session audit logs.
- **Matter Profiles:** Pro-only configuration profiles for storing, loading, and switching client case settings in the sidebar.

---

## 💳 Stripe Purchase & License Fulfillment

- **Pricing:** $150 USD one-time lifetime license key.
- **Checkout Flow:** Users transition to Stripe Checkout. Once transaction completes, the Stripe Success screen guides the user on entering their license manually (delivered via email).
- **Manual Activation:** In compliance with security standards, the application remains locked until a valid key is provided manually (no insecure automatic activations).

---

## 🛠️ Developer Setup & Environment Variables

### Local Installation
```bash
# Clone the repository
git clone <repository_url>

# Install dependencies
npm install

# Run the local Vite dev server
npm run dev

# Compile production bundle
npm run build
```

### Environment Variables
Configure a `.env` file in the root directory:
```env
# Stripe Payment Configuration
VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/cNicN59My1tC6VN0ayg7e00
```

---

## ⚙️ Production Hardening & Security

- **Strict Key Shielding:** To prevent bypasses, the developer test key (`PATENTPREPPERS-EXHIBITKIT-PRO`) is evaluated and displayed **ONLY** when `import.meta.env.DEV` is strictly `true`. 
- **Offline Integrity:** All Stripe API keys and webhooks reside securely on the Stripe platform. No private keys or secret credentials are exposed client-side.

---

## 🚀 Enterprise Roadmap

- [ ] **Signed Workstation Seat Tokens:** Integrate public-key cryptography to issue signed activation tokens bound to local workstation device IDs.
- [ ] **Cloud Webhook Verification:** Establish an express licensing microservice to validate EKIT keys against live Stripe webhook records on launch.
- [ ] **Enterprise Seat Dashboard:** Firm-wide administrative consoles to provision, monitor, and transfer workstation seats.
- [ ] **Native Desktop Wrapper:** Package the application using Electron or Tauri for enhanced offline shell integrations.
