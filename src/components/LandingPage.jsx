import {
  ArrowRight,
  Check,
  ChevronRight,
  FileCheck2,
  Files,
  FolderLock,
  HardDrive,
  Moon,
  Scale,
  ShieldCheck,
  Sun,
  WandSparkles,
} from 'lucide-react';
import { hasTrialAvailable } from '../utils/license';
import './LandingPage.css';

const previewRows = [
  ['04 - Jones Photo.pdf', 'PX004 Jones Photo.pdf'],
  ['Smith Draft Contract.pdf', 'PX005 Smith Draft Contract.pdf'],
  ['Invoice 1892.pdf', 'PX006 Invoice 1892.pdf'],
];

const workflowSteps = [
  {
    number: '01',
    title: 'Choose your exhibits',
    body: 'Open a local folder or select a batch of PDFs. Nothing is uploaded or copied to a cloud service.',
  },
  {
    number: '02',
    title: 'Review the naming map',
    body: 'Apply an OnCue, TrialDirector, or custom convention, then edit descriptions and resolve conflicts in one preview.',
  },
  {
    number: '03',
    title: 'Prepare the final set',
    body: 'Rename in place or download a prepared ZIP with a clear CSV mapping of every original and final filename.',
  },
];

export default function LandingPage({
  onLaunchDemo,
  onLaunchTrial,
  onOpenPricing,
  theme,
  onToggleTheme,
}) {
  const trialAvailable = hasTrialAvailable();

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Primary navigation">
        <a className="landing-brand" href="#top" aria-label="ExhibitKIT home">
          <span className="landing-brand-mark" aria-hidden="true">
            <Scale size={17} strokeWidth={1.8} />
          </span>
          <span>Exhibit<span>KIT</span></span>
        </a>

        <div className="landing-nav-links">
          <a href="#workflow">How it works</a>
          <a href="#security">Security</a>
          <a href="#pricing">Pricing</a>
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
          <button className="landing-nav-demo" id="btn-quick-demo" onClick={onLaunchDemo}>
            Open demo <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      <section className="landing-hero" id="top">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow">
            <span /> Built for litigation support teams
          </div>
          <h1>
            Courtroom-ready exhibits,
            <em> without the busywork.</em>
          </h1>
          <p className="landing-hero-lede">
            Turn inconsistent PDF filenames into a clean, indexed exhibit set for OnCue or
            TrialDirector—all on your own computer.
          </p>

          <div className="landing-hero-actions">
            <button className="landing-primary-button" id="btn-launch-demo" onClick={onLaunchDemo}>
              Try the interactive demo <ArrowRight size={16} />
            </button>
            {trialAvailable ? (
              <button className="landing-text-button" id="btn-try-trial" onClick={onLaunchTrial}>
                Process up to 5 real files <ChevronRight size={16} />
              </button>
            ) : (
              <button className="landing-text-button" id="btn-try-trial-disabled" disabled>
                Free trial used
              </button>
            )}
          </div>

          <div className="landing-assurance" aria-label="Product assurances">
            <span><ShieldCheck size={15} /> No cloud uploads</span>
            <span><HardDrive size={15} /> Runs in your browser</span>
            <span><FileCheck2 size={15} /> Audit-ready mapping</span>
          </div>
        </div>

        <div className="landing-product-stage" aria-label="ExhibitKIT renaming preview">
          <div className="landing-stage-glow" />
          <div className="landing-app-preview">
            <div className="landing-window-bar">
              <div className="landing-window-dots" aria-hidden="true"><i /><i /><i /></div>
              <span>Exhibit preparation workspace</span>
              <span className="landing-local-pill"><FolderLock size={12} /> Local</span>
            </div>

            <div className="landing-preview-body">
              <aside className="landing-preview-sidebar">
                <span className="landing-preview-label">Naming preset</span>
                <button className="active">OnCue <Check size={12} /></button>
                <button>TrialDirector</button>
                <div className="landing-preview-rule">
                  <span className="landing-preview-label">Starting ID</span>
                  <strong>PX <b>004</b></strong>
                </div>
                <div className="landing-preview-progress">
                  <span>Batch status</span>
                  <strong>3 / 3 ready</strong>
                  <i><b /></i>
                </div>
              </aside>

              <div className="landing-preview-content">
                <div className="landing-preview-heading">
                  <div>
                    <span className="landing-preview-label">Matter</span>
                    <strong>Jones v. Apex Holdings</strong>
                  </div>
                  <span className="landing-ready-pill"><Check size={11} /> Ready to prepare</span>
                </div>

                <div className="landing-file-list">
                  <div className="landing-file-header">
                    <span>Original filename</span>
                    <span>Prepared filename</span>
                    <span>Status</span>
                  </div>
                  {previewRows.map(([original, prepared], index) => (
                    <div className="landing-file-row" key={original}>
                      <span><Files size={14} /> {original}</span>
                      <span>{prepared}</span>
                      <span className="landing-row-status"><Check size={11} /> Valid</span>
                      {index === 0 && <span className="landing-cursor-note">Auto-formatted</span>}
                    </div>
                  ))}
                </div>

                <div className="landing-preview-footer">
                  <span>3 files · 0 conflicts</span>
                  <button><WandSparkles size={13} /> Prepare exhibits</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-compatibility" aria-label="Compatible workflows">
        <span>Fits the tools your trial team already uses</span>
        <div><strong>ONCUE</strong><i /> <strong>TRIALDIRECTOR</strong><i /> <strong>CUSTOM NAMING</strong></div>
      </section>

      <section className="landing-section landing-workflow" id="workflow">
        <div className="landing-section-heading">
          <span className="landing-kicker">A controlled workflow</span>
          <h2>From folder chaos to a defensible exhibit set.</h2>
          <p>Every step stays visible, editable, and under your control before a filename changes.</p>
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
          <span className="landing-kicker">Confidential by design</span>
          <h2>Your case files stay where they belong.</h2>
          <p>
            ExhibitKIT performs filename parsing, sequencing, conflict checks, and file preparation
            inside your browser. Document contents and metadata are never sent to ExhibitKIT servers.
          </p>
          <div className="landing-security-list">
            <span><Check size={15} /> No document uploads</span>
            <span><Check size={15} /> No account required for the demo</span>
            <span><Check size={15} /> Direct local-folder workflow in Chromium browsers</span>
          </div>
        </div>

        <div className="landing-security-visual" aria-hidden="true">
          <div className="landing-device-card">
            <span className="landing-device-icon"><HardDrive size={24} /></span>
            <div><strong>Your workstation</strong><small>Files remain local</small></div>
            <span className="landing-device-check"><Check size={14} /></span>
          </div>
          <div className="landing-blocked-path">
            <i /><span><FolderLock size={17} /> No cloud transfer</span><i />
          </div>
          <div className="landing-cloud-card">
            <span>Cloud storage</span><strong>0 files received</strong>
          </div>
        </div>
      </section>

      <section className="landing-section landing-pricing" id="pricing">
        <div className="landing-pricing-copy">
          <span className="landing-kicker">One license. No subscription.</span>
          <h2>A small tool for a high-stakes handoff.</h2>
          <p>Use the demo with sample data, process one real five-file trial batch, then upgrade when it earns a place in your workflow.</p>
          <button className="landing-text-button" onClick={onLaunchDemo}>
            Explore with sample exhibits <ChevronRight size={16} />
          </button>
        </div>

        <div className="landing-price-card">
          <div className="landing-price-topline"><span>ExhibitKIT Pro</span><em>Lifetime</em></div>
          <div className="landing-price"><strong>$150</strong><span>USD<br />one-time</span></div>
          <ul>
            <li><Check size={15} /> Unlimited exhibit batches</li>
            <li><Check size={15} /> Direct local-folder renaming</li>
            <li><Check size={15} /> Matter profiles and custom templates</li>
            <li><Check size={15} /> CSV, JSON, and printable audit reports</li>
          </ul>
          <button className="landing-primary-button" id="btn-purchase-pro-pricing" onClick={onOpenPricing}>
            Purchase lifetime access <ArrowRight size={16} />
          </button>
          <small>Secure checkout · Manual license activation</small>
        </div>
      </section>

      <footer className="landing-footer">
        <a className="landing-brand" href="#top">
          <span className="landing-brand-mark"><Scale size={16} /></span>
          <span>Exhibit<span>KIT</span></span>
        </a>
        <p>Local-first exhibit preparation for litigation teams.</p>
        <a href="mailto:support@patentpreppers.com">support@patentpreppers.com</a>
      </footer>
    </main>
  );
}
