import { ArrowRight, ExternalLink, Scale } from 'lucide-react';
import {
  SUITE_EXHIBIT_RENAMER_URL,
  SUITE_MODULES_URL,
  SUITE_RESOURCES_URL,
  SUITE_URL,
} from '../config/suiteRetirement.js';
import './RetirementPage.css';

export default function RetirementPage({ licenseSlot = null, onOpenLegacyWorkspace = null }) {
  return (
    <main className="retirement-page">
      <header className="retirement-header">
        <a className="retirement-brand" href={SUITE_URL}>
          <span className="retirement-brand-mark" aria-hidden="true">
            <Scale size={18} strokeWidth={1.8} />
          </span>
          <span>
            <small>PatentPreppers</small>
            <strong>ExhibitKit has moved</strong>
          </span>
        </a>
      </header>

      {licenseSlot && <div className="retirement-license-slot">{licenseSlot}</div>}

      <section className="retirement-hero">
        <p className="retirement-eyebrow">Suite consolidation</p>
        <h1>Exhibit renaming is now part of the PatentPreppers suite</h1>
        <p className="retirement-lede">
          The standalone ExhibitKit storefront is retired. Use the suite catalog for litigation
          modules, or open the built-in Exhibit Renamer with your workspace account.
        </p>

        <div className="retirement-links">
          <a className="retirement-primary" href={SUITE_MODULES_URL}>
            Browse suite modules <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a className="retirement-secondary" href={SUITE_EXHIBIT_RENAMER_URL}>
            Built-in Exhibit Renamer <ExternalLink size={15} aria-hidden="true" />
          </a>
          <a className="retirement-secondary" href={SUITE_RESOURCES_URL}>
            Resources &amp; guides <ExternalLink size={15} aria-hidden="true" />
          </a>
          <a className="retirement-tertiary" href={SUITE_URL}>
            PatentPreppers home
          </a>
        </div>

        {typeof onOpenLegacyWorkspace === 'function' && (
          <p className="retirement-legacy">
            Existing ExhibitKit license on this browser?{' '}
            <button type="button" className="retirement-legacy-button" onClick={onOpenLegacyWorkspace}>
              Open legacy workspace
            </button>
            {' '}for activation and export only — new purchases are not offered here.
          </p>
        )}

        <p className="retirement-support">
          License recovery:{' '}
          <a href="mailto:support@patentpreppers.com?subject=ExhibitKit%20license%20recovery">
            support@patentpreppers.com
          </a>
        </p>
      </section>
    </main>
  );
}