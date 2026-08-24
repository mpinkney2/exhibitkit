import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  ExternalLink,
  FileCheck2,
  Files,
  FolderLock,
  HardDrive,
  KeyRound,
  Moon,
  Scale,
  ShieldCheck,
  Sun,
  WandSparkles,
} from 'lucide-react';
import {
  PRICING_FAQ,
  FREE_MAX_FILES_PER_BATCH,
} from '../config/pricing.js';
import { PRACTICE_AREAS } from '../config/presets.js';
import { PRO_PRICE_LABEL } from '../utils/payment';
import './LandingPage.css';

const previewRows = [
  ['04 - Jones Photo.pdf', 'PX004 Jones Photo.pdf'],
  ['DOD - 12 - 2012 - Smith - Report.pdf', 'DOD - 12 - 2012 - Smith - Report.pdf'],
  ['Smith 2015 Expert Report.pdf', 'PX005 Smith 2015 Expert Report.pdf'],
];

const workflowSteps = [
  {
    number: '01',
    title: 'Choose your exhibits',
    body: 'Open a local folder or drop a batch of PDFs. Parsing, preview, and renaming all happen in your browser—nothing is uploaded.',
  },
  {
    number: '02',
    title: 'Pick a practice-area preset',
    body: 'Select Litigation, Patent/IP, Family, Employment, Bankruptcy, or Custom templates. Sort by year, shorten titles, and edit the proposed map before anything changes.',
  },
  {
    number: '03',
    title: 'Prepare the final set',
    body: 'Rename in place, download a ZIP, or export CSV/JSON audit logs with every original and final filename.',
  },
];

const featureHighlights = [
  {
    title: 'Multi-practice preset catalog',
    body: 'OnCue, TrialDirector, Patent DOD, and area-specific prefixes for Family, Employment, and Bankruptcy workflows—each with sensible defaults.',
  },
  {
    title: 'Year-aware parsing & sorting',
    body: 'Detect 19xx/20xx years in titles, sort batches chronologically, and optionally use the year as the exhibit ID.',
  },
  {
    title: 'Structured patent filenames',
    body: 'Parse and output DOD-style names—Prefix, Doc ID, Year, Author, Title—with n.d. when a year is missing.',
  },
  {
    title: 'Matter profiles (Pro)',
    body: 'Save prefix, padding, preset, and template settings per matter and reload them for the next hearing or production.',
  },
];

const publicPricingFaq = PRICING_FAQ.filter(
  (item) => item.id !== 'case-pass-auto-renew' && item.id !== 'case-pass-expires'
);

export default function LandingPage({
  onLaunchFree,
  onOpenPricing,
  onRestoreLicense,
  theme,
  onToggleTheme,
}) {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Primary navigation">
        <a className="landing-brand" href="#top" aria-label="ExhibitKIT home">
          <span className="landing-brand-mark" aria-hidden="true">
            <Scale size={17} strokeWidth={1.8} />
          </span>
          <span className="landing-brand-copy">
            <small>Patent Preppers™</small>
            <strong>Exhibit<span>KIT</span></strong>
          </span>
        </a>

        <div className="landing-nav-links">
          <a href="#workflow">How it works</a>
          <a href="#security">Security</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
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
          <button className="landing-nav-demo" id="btn-quick-demo" onClick={onLaunchFree}>
            Start free <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      <section className="landing-hero" id="top">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow">
            <span /> Built for litigation & multi-practice legal teams
          </div>
          <h1>
            Courtroom-ready exhibits,
            <em> without the busywork.</em>
          </h1>
          <p className="landing-hero-lede">
            Standardize messy PDF filenames with practice-area presets for OnCue, TrialDirector,
            Patent DOD, Family, Employment, and Bankruptcy—plus year detection, title shortening,
            and a full preview before you rename locally.
          </p>

          <div className="landing-hero-actions">
            <button className="landing-primary-button" id="btn-launch-free" onClick={onLaunchFree}>
              Rename exhibits free <ArrowRight size={16} />
            </button>
            <button className="landing-text-button" id="btn-view-pricing" onClick={onOpenPricing}>
              View pricing <ChevronRight size={16} />
            </button>
          </div>

          <div className="landing-assurance" aria-label="Product assurances">
            <span><ShieldCheck size={15} /> No cloud uploads</span>
            <span><HardDrive size={15} /> Runs in your browser</span>
            <span><FileCheck2 size={15} /> Up to {FREE_MAX_FILES_PER_BATCH} files per batch on Free</span>
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
                <span className="landing-preview-label">Practice-area presets</span>
                <div className="landing-preview-practice-list">
                  {PRACTICE_AREAS.map((area) => (
                    <div key={area.id} className="landing-preview-practice-group">
                      <span className="landing-preview-practice-name">{area.label}</span>
                      {area.presets.slice(0, area.id === 'litigation' ? 2 : 1).map((presetOption, index) => (
                        <button
                          key={presetOption.id}
                          type="button"
                          className={area.id === 'litigation' && index === 0 ? 'active' : ''}
                        >
                          {presetOption.label}
                          {area.id === 'litigation' && index === 0 ? <Check size={12} /> : null}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
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
                  <button type="button"><WandSparkles size={13} /> Prepare exhibits</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-compatibility" aria-label="Compatible workflows">
        <span>Presets for the workflows your team already runs</span>
        <div>
          <strong>ONCUE</strong><i />
          <strong>TRIALDIRECTOR</strong><i />
          <strong>PATENT DOD</strong><i />
          <strong>FAMILY</strong><i />
          <strong>EMPLOYMENT</strong><i />
          <strong>BANKRUPTCY</strong><i />
          <strong>CUSTOM TOKENS</strong>
        </div>
      </section>

      <section className="landing-section landing-features" aria-label="Product features">
        <div className="landing-section-heading">
          <span className="landing-kicker">What ExhibitKIT actually does</span>
          <h2>Renaming intelligence built for real legal batches.</h2>
          <p>Not just find-and-replace—parse existing conventions, apply the right preset for your practice area, and review every change first.</p>
        </div>

        <div className="landing-feature-grid">
          {featureHighlights.map((feature) => (
            <article key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
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

      <section className="landing-suite-promo" aria-labelledby="timeline-promo-title">
        <div className="landing-suite-copy">
          <span className="landing-kicker">More from Patent Preppers™</span>
          <h2 id="timeline-promo-title">Exhibits ready. Now build the chronology.</h2>
          <p>
            Move from organized exhibit files to a multi-party litigation timeline. Build Court,
            Gantt, and Flexible views, then export counsel-ready PPTX and PDF demonstratives.
          </p>

          <div className="landing-suite-proof" aria-label="Timeline capabilities">
            <span><Check size={14} /> Court, Gantt, and Flexible views</span>
            <span><Check size={14} /> Counsel-ready PPTX and PDF</span>
            <span><Check size={14} /> 14-day free trial</span>
          </div>

          <a
            className="landing-suite-cta"
            href="https://timeline.patentpreppers.com/"
            target="_blank"
            rel="noreferrer"
          >
            Try Timeline free <ExternalLink size={15} />
          </a>
        </div>

        <div className="landing-suite-visual" aria-hidden="true">
          <div className="landing-suite-windowbar">
            <span><i /><i /><i /></span>
            <strong>Smith v. Johnson — Patent chronology</strong>
            <em><Check size={10} /> Ready</em>
          </div>
          <div className="landing-suite-board">
            <div className="landing-suite-board-heading">
              <span>Multi-party Court view</span>
              <small>38 events · 3 tracks · 4y span</small>
            </div>
            <div className="landing-suite-years">
              <span>2020</span><span>2021</span><span>2022</span><span>2023</span><span>2024</span>
            </div>
            <div className="landing-suite-track">
              <strong>Plaintiff</strong>
              <div><i className="bar-a" /><i className="bar-b" /><i className="bar-c" /></div>
            </div>
            <div className="landing-suite-track">
              <strong>Defendant</strong>
              <div><i className="bar-d" /><i className="bar-e" /><i className="bar-f" /></div>
            </div>
            <div className="landing-suite-track">
              <strong>USPTO</strong>
              <div><i className="bar-g" /><i className="bar-h" /><i className="bar-i" /></div>
            </div>
          </div>
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
            <span><Check size={15} /> No account required for Free</span>
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
        <div className="landing-section-heading landing-pricing-heading">
          <span className="landing-kicker">Simple launch pricing</span>
          <h2>Start free. Upgrade once the workflow earns its place.</h2>
          <p>Two clear choices, no subscription, and no case files sent to a payment processor.</p>
        </div>

        <div className="landing-pricing-grid">
          <article className="landing-price-card landing-price-card-free">
            <div className="landing-price-topline"><span>Free</span><em>No account</em></div>
            <div className="landing-price"><strong>$0</strong><span>USD<br />to evaluate</span></div>
            <p className="landing-price-description">Use the full preview workflow with sample data or real-file batches of up to {FREE_MAX_FILES_PER_BATCH} PDFs.</p>
            <ul>
              <li><Check size={15} /> Unlimited interactive demo workflow</li>
              <li><Check size={15} /> Up to {FREE_MAX_FILES_PER_BATCH} real PDFs per batch</li>
              <li><Check size={15} /> Practice-area presets & year-aware preview</li>
              <li><Check size={15} /> Local processing with no account</li>
            </ul>
            <button className="landing-secondary-button" onClick={onLaunchFree}>
              Start free <ArrowRight size={16} />
            </button>
            <span className="landing-inline-status">No trial clock and no credit card</span>
          </article>

          <article className="landing-price-card landing-price-card-pro">
            <div className="landing-price-topline"><span>ExhibitKIT Pro</span><em>Launch price</em></div>
            <div className="landing-price"><strong>{PRO_PRICE_LABEL}</strong><span>USD<br />one-time</span></div>
            <p className="landing-price-description">One workstation. Perpetual use of the purchased version, with 12 months of updates and support.</p>
            <ul>
              <li><Check size={15} /> Unlimited exhibit batches</li>
              <li><Check size={15} /> Direct local-folder renaming & undo</li>
              <li><Check size={15} /> Full preset catalog + Matter Profiles</li>
              <li><Check size={15} /> Patent DOD, year sort, title shortener & custom tokens</li>
              <li><Check size={15} /> CSV, JSON, HTML, and printable audit reports</li>
            </ul>
            <button className="landing-primary-button" id="btn-purchase-pro-pricing" onClick={onOpenPricing}>
              Buy Pro — {PRO_PRICE_LABEL} <ArrowRight size={16} />
            </button>
            <button className="landing-restore-button" onClick={onRestoreLicense}>
              <KeyRound size={14} /> Already purchased? Restore license
            </button>
            <small>Secure checkout by Stripe · Files never leave your computer</small>
          </article>
        </div>

        <div className="landing-firm-contact">
          <span className="landing-firm-icon" aria-hidden="true"><Building2 size={19} /></span>
          <div>
            <strong>Need multiple workstations?</strong>
            <span>Firm licensing is handled as a guided pilot while team management is being built.</span>
          </div>
          <a href="mailto:support@patentpreppers.com?subject=ExhibitKIT%20Firm%20licensing">Contact us <ArrowRight size={14} /></a>
        </div>
      </section>

      <section className="landing-section landing-faq" id="faq">
        <div className="landing-section-heading">
          <span className="landing-kicker">FAQ</span>
          <h2>Pricing questions, answered plainly.</h2>
        </div>
        <div className="landing-faq-list">
          {publicPricingFaq.map((item) => (
            <details key={item.id} className="landing-faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <a className="landing-brand" href="#top">
          <span className="landing-brand-mark"><Scale size={16} /></span>
          <span className="landing-brand-copy">
            <small>Patent Preppers™</small>
            <strong>Exhibit<span>KIT</span></strong>
          </span>
        </a>
        <p>Local-first exhibit renaming for litigation, patent, family, employment, and bankruptcy teams.</p>
        <a href="mailto:support@patentpreppers.com">support@patentpreppers.com</a>
      </footer>
    </main>
  );
}
