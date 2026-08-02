import {
  ArrowRight,
  Check,
  ChevronRight,
  FileCheck2,
  FolderLock,
  HardDrive,
  MessageSquareText,
  Moon,
  Scale,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import PricingSection from './PricingSection';
import './LandingPage.css';
import './PricingSection.css';

const previewRows = [
  ['MSG-001 · Alex Rivera', 'Included · page ref'],
  ['MSG-002 · Jordan Lee', 'Phrase redacted'],
  ['MSG-003 · Alex Rivera', 'Included · page ref'],
];

const workflowSteps = [
  {
    number: '01',
    title: 'Import an export',
    body: 'Open a supported message export (JSON, CSV, plain text, or SMS XML). Parsing runs in your browser.',
  },
  {
    number: '02',
    title: 'Review and redact',
    body: 'Select the messages that matter and apply true redaction — content is removed from the exhibit, not covered with a black box.',
  },
  {
    number: '03',
    title: 'Export a clean PDF',
    body: 'Generate sequential message and page references, a declaration template, and a SHA-256 fingerprint of the source file.',
  },
];

const differentiators = [
  'Native parsing of supported message exports',
  'Evidence processed locally in the browser',
  'No evidence uploaded or stored on ExhibitKit servers',
  'True redaction rather than visual overlays',
  'SHA-256 fingerprinting of source files',
  'Sequential message and page references',
  'Declaration-of-authenticity template',
  'Verifiable source integrity',
];

export default function LandingPage({
  onStartFree,
  onOpenPricing,
  onPurchaseCasePass,
  onPurchasePro,
  theme,
  onToggleTheme,
}) {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Primary navigation">
        <a className="landing-brand" href="#top" aria-label="ExhibitKit home">
          <span className="landing-brand-mark" aria-hidden="true">
            <Scale size={17} strokeWidth={1.8} />
          </span>
          <span>
            Exhibit<span>Kit</span>
          </span>
        </a>

        <div className="landing-nav-links">
          <a href="#workflow">How it works</a>
          <a href="#security">Privacy</a>
          <a href="#pricing">Pricing</a>
          <a href="#pricing-faq">FAQ</a>
        </div>

        <div className="landing-nav-actions">
          <button
            className="landing-icon-button"
            id="btn-theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button className="landing-nav-demo" id="btn-quick-demo" onClick={onStartFree}>
            Build free <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      <section className="landing-hero" id="top">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow">
            <span /> Message evidence, prepared locally
          </div>
          <h1>
            Turn message history into
            <em> organized, tamper-evident exhibits.</em>
          </h1>
          <p className="landing-hero-lede">
            Import exported conversations, review and redact what matters, and create a clean PDF
            tied to the original source—all without uploading your evidence.
          </p>

          <div className="landing-hero-actions">
            <button className="landing-primary-button" id="btn-launch-demo" onClick={onStartFree}>
              Build an exhibit free <ArrowRight size={16} />
            </button>
            <button className="landing-text-button" id="btn-view-pricing" onClick={onOpenPricing}>
              Compare Case Pass & Pro <ChevronRight size={16} />
            </button>
          </div>

          <div className="landing-assurance" aria-label="Product assurances">
            <span>
              <ShieldCheck size={15} /> No evidence uploads
            </span>
            <span>
              <HardDrive size={15} /> Runs in your browser
            </span>
            <span>
              <FileCheck2 size={15} /> Source SHA-256 fingerprint
            </span>
          </div>
        </div>

        <div className="landing-product-stage" aria-label="ExhibitKit message exhibit preview">
          <div className="landing-stage-glow" />
          <div className="landing-app-preview">
            <div className="landing-window-bar">
              <div className="landing-window-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <span>Message exhibit workspace</span>
              <span className="landing-local-pill">
                <FolderLock size={12} /> Local
              </span>
            </div>

            <div className="landing-preview-body">
              <aside className="landing-preview-sidebar">
                <span className="landing-preview-label">Source</span>
                <button className="active" type="button">
                  Export.txt <Check size={12} />
                </button>
                <button type="button">SHA-256</button>
                <div className="landing-preview-rule">
                  <span className="landing-preview-label">Exhibit</span>
                  <strong>
                    EX <b>012</b>
                  </strong>
                </div>
                <div className="landing-preview-progress">
                  <span>Selected</span>
                  <strong>3 / 5 messages</strong>
                  <i>
                    <b />
                  </i>
                </div>
              </aside>

              <div className="landing-preview-content">
                <div className="landing-preview-heading">
                  <div>
                    <span className="landing-preview-label">Matter</span>
                    <strong>Rivera v. Lee</strong>
                  </div>
                  <span className="landing-ready-pill">
                    <Check size={11} /> Ready to export
                  </span>
                </div>

                <div className="landing-file-list">
                  <div className="landing-file-header">
                    <span>Message</span>
                    <span>Exhibit status</span>
                    <span>Integrity</span>
                  </div>
                  {previewRows.map(([original, prepared], index) => (
                    <div className="landing-file-row" key={original}>
                      <span>
                        <MessageSquareText size={14} /> {original}
                      </span>
                      <span>{prepared}</span>
                      <span className="landing-row-status">
                        <Check size={11} /> Local
                      </span>
                      {index === 1 && <span className="landing-cursor-note">True redaction</span>}
                    </div>
                  ))}
                </div>

                <div className="landing-preview-footer">
                  <span>Fingerprint attached · No upload</span>
                  <button type="button">Export PDF</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-compatibility" aria-label="Supported inputs">
        <span>Works with common conversation exports</span>
        <div>
          <strong>JSON</strong>
          <i /> <strong>CSV</strong>
          <i /> <strong>PLAIN TEXT</strong>
          <i /> <strong>SMS XML</strong>
        </div>
      </section>

      <section className="landing-section landing-workflow" id="workflow">
        <div className="landing-section-heading">
          <span className="landing-kicker">A controlled workflow</span>
          <h2>From message export to a filing-ready PDF.</h2>
          <p>
            Every step stays on your device. ExhibitKit organizes and fingerprints sources — it does
            not certify authorship or guarantee admissibility.
          </p>
        </div>

        <div className="landing-steps">
          {workflowSteps.map((step) => (
            <article key={step.number}>
              <span className="landing-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-security" id="security">
        <div className="landing-security-copy">
          <span className="landing-kicker">Privacy by design</span>
          <h2>Your evidence never leaves this browser.</h2>
          <p>
            ExhibitKit processes message exports, redactions, hashing, and PDF generation locally.
            Payment is handled separately and never receives filenames, case names, captions, message
            contents, or hashes.
          </p>
          <div className="landing-security-list">
            {differentiators.map((item) => (
              <span key={item}>
                <Check size={15} /> {item}
              </span>
            ))}
          </div>
        </div>

        <div className="landing-security-visual" aria-hidden="true">
          <div className="landing-device-card">
            <span className="landing-device-icon">
              <HardDrive size={24} />
            </span>
            <div>
              <strong>Your workstation</strong>
              <small>Messages remain local</small>
            </div>
            <span className="landing-device-check">
              <Check size={14} />
            </span>
          </div>
          <div className="landing-blocked-path">
            <i />
            <span>
              <FolderLock size={17} /> No cloud transfer
            </span>
            <i />
          </div>
          <div className="landing-cloud-card">
            <span>ExhibitKit servers</span>
            <strong>0 evidence files received</strong>
          </div>
        </div>
      </section>

      <PricingSection
        onStartFree={onStartFree}
        onPurchaseCasePass={onPurchaseCasePass}
        onPurchasePro={onPurchasePro}
        onContactFirm={() => {
          window.location.href =
            'mailto:support@patentpreppers.com?subject=ExhibitKit%20Firm%20license';
        }}
      />

      <footer className="landing-footer">
        <a className="landing-brand" href="#top">
          <span className="landing-brand-mark">
            <Scale size={16} />
          </span>
          <span>
            Exhibit<span>Kit</span>
          </span>
        </a>
        <p>Local-first message evidence preparation for litigation teams.</p>
        <a href="mailto:support@patentpreppers.com">support@patentpreppers.com</a>
      </footer>
    </main>
  );
}
