import { useId, useState } from 'react';
import { Check, Minus, ArrowRight } from 'lucide-react';
import {
  COMPARISON_FEATURES,
  PERPETUAL_CLARIFICATION,
  PRICING,
  PRICING_FAQ,
  PRIVACY_PAYMENT_NOTICE,
} from '../utils/pricing';
import { isCheckoutConfigured } from '../utils/payment';

function FeatureCell({ value }) {
  if (value === 'coming_soon') {
    return <span className="pricing-coming-soon">Coming soon</span>;
  }
  if (value) {
    return (
      <span className="pricing-check" aria-label="Included">
        <Check size={15} />
      </span>
    );
  }
  return (
    <span className="pricing-dash" aria-label="Not included">
      <Minus size={14} />
    </span>
  );
}

export default function PricingSection({
  onStartFree,
  onPurchaseCasePass,
  onPurchasePro,
  onContactFirm,
}) {
  const [openFaq, setOpenFaq] = useState(0);
  const baseId = useId();
  const caseConfigured = isCheckoutConfigured('case_pass');
  const proConfigured = isCheckoutConfigured('pro_perpetual');

  return (
    <section className="pricing-section" id="pricing" aria-labelledby={`${baseId}-heading`}>
      <div className="pricing-section-intro">
        <span className="landing-kicker">Pricing</span>
        <h2 id={`${baseId}-heading`}>Free to prepare. Pay when a case needs more.</h2>
        <p>
          Start with a genuine free exhibit workflow. Add a 30-day Case Pass for a filing deadline,
          or keep ExhibitKit Pro with a perpetual license.
        </p>
      </div>

      <div className="pricing-cards" role="list">
        <article className="pricing-card" role="listitem">
          <header>
            <h3>{PRICING.free.name}</h3>
            <p>{PRICING.free.description}</p>
          </header>
          <div className="pricing-card-price">
            <strong>{PRICING.free.priceLabel}</strong>
            <span>{PRICING.free.cadence}</span>
          </div>
          <ul>
            <li>One conversation at a time</li>
            <li>True redaction & clean PDF</li>
            <li>SHA-256 source fingerprint</li>
            <li>No account · No watermark</li>
          </ul>
          <button type="button" className="landing-primary-button pricing-cta" onClick={onStartFree}>
            {PRICING.free.cta} <ArrowRight size={16} />
          </button>
        </article>

        <article className="pricing-card" role="listitem">
          <header>
            <h3>{PRICING.case_pass.name}</h3>
            <p>{PRICING.case_pass.description}</p>
          </header>
          <div className="pricing-card-price">
            <strong>{PRICING.case_pass.priceLabel}</strong>
            <span>{PRICING.case_pass.cadence}</span>
          </div>
          <ul>
            <li>All Pro capabilities for 30 days</li>
            <li>No recurring billing</li>
            <li>Unlimited projects during the pass</li>
            <li>Local evidence processing unchanged</li>
          </ul>
          <button
            type="button"
            className="landing-primary-button pricing-cta secondary"
            onClick={onPurchaseCasePass}
            title={
              caseConfigured
                ? undefined
                : 'Opens purchase options. Configure VITE_STRIPE_CASE_PASS_LINK for Stripe Checkout.'
            }
          >
            {PRICING.case_pass.cta} <ArrowRight size={16} />
          </button>
          <small className="pricing-privacy-note">{PRIVACY_PAYMENT_NOTICE}</small>
        </article>

        <article className="pricing-card is-popular" role="listitem">
          <div className="pricing-popular-badge">Most popular</div>
          <header>
            <h3>{PRICING.pro.name}</h3>
            <em>{PRICING.pro.label}</em>
            <p>{PRICING.pro.description}</p>
          </header>
          <div className="pricing-card-price">
            <strong>{PRICING.pro.priceLabel}</strong>
            <span>{PRICING.pro.cadence}</span>
          </div>
          <ul>
            <li>Keep the purchased version permanently</li>
            <li>12 months of updates & support</li>
            <li>Multi-exhibit binder, index, ZIP</li>
            <li>Source-integrity report & presets</li>
          </ul>
          <button
            type="button"
            className="landing-primary-button pricing-cta"
            id="btn-purchase-pro-pricing"
            onClick={onPurchasePro}
            disabled={!proConfigured}
          >
            {PRICING.pro.cta} <ArrowRight size={16} />
          </button>
          <p className="pricing-perpetual-note">{PERPETUAL_CLARIFICATION}</p>
          <small className="pricing-privacy-note">{PRIVACY_PAYMENT_NOTICE}</small>
          <p className="pricing-renewal-note">
            Optional updates after year one: {PRICING.pro.updatesRenewal.priceLabel}{' '}
            {PRICING.pro.updatesRenewal.cadence}. {PRICING.pro.updatesRenewal.note}
          </p>
        </article>

        <article className="pricing-card is-firm" role="listitem">
          <header>
            <h3>{PRICING.firm.name}</h3>
            <p>{PRICING.firm.description}</p>
          </header>
          <div className="pricing-card-price">
            <strong>{PRICING.firm.priceLabel}</strong>
            <span>Coming soon</span>
          </div>
          <ul>
            <li>Five-user license</li>
            <li>Shared organization presets</li>
            <li>Central license administration</li>
            <li>Priority onboarding</li>
          </ul>
          <button type="button" className="landing-primary-button pricing-cta secondary" onClick={onContactFirm}>
            {PRICING.firm.cta}
          </button>
        </article>
      </div>

      <div className="pricing-comparison-wrap">
        <h3>Compare plans</h3>
        <div className="pricing-table-scroll" tabIndex={0} aria-label="Plan comparison table">
          <table className="pricing-comparison">
            <caption className="sr-only">
              Feature comparison for Free, Case Pass, and ExhibitKit Pro
            </caption>
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">Free</th>
                <th scope="col">Case Pass</th>
                <th scope="col">Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.label}</th>
                  <td>
                    <FeatureCell value={row.free} />
                  </td>
                  <td>
                    <FeatureCell value={row.case_pass} />
                  </td>
                  <td>
                    <FeatureCell value={row.pro} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pricing-faq" id="pricing-faq">
        <h3>Pricing FAQ</h3>
        <div className="pricing-faq-list">
          {PRICING_FAQ.map((item, index) => {
            const panelId = `${baseId}-faq-${index}`;
            const expanded = openFaq === index;
            return (
              <div key={item.q} className="pricing-faq-item">
                <h4>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpenFaq(expanded ? -1 : index)}
                  >
                    {item.q}
                  </button>
                </h4>
                <div id={panelId} hidden={!expanded} className="pricing-faq-answer">
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
