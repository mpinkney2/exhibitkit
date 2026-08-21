import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Check, CreditCard, ExternalLink, KeyRound, ShieldCheck, X } from 'lucide-react';
import { validateKeyFormat, isDevMode, DEV_TEST_KEY } from '../utils/license';
import { buildStripePaymentLink, PRO_PRICE_LABEL } from '../utils/payment';
import './PricingModal.css';

const benefits = [
  'Unlimited PDF exhibits and batches',
  'Direct, in-place local folder renaming',
  'OnCue, TrialDirector, and custom templates',
  '12 months of updates and support'
];

export default function PricingModal({ isOpen, onClose, onActivate, workstationId, initialView = 'purchase' }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const licenseInputRef = useRef(null);
  const stripeLink = buildStripePaymentLink({ workstationId });

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (initialView === 'restore') {
      licenseInputRef.current?.focus();
    } else {
      closeButtonRef.current?.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus?.();
    };
  }, [initialView, isOpen, onClose]);

  if (!isOpen) return null;

  const handleActivateSubmit = (event) => {
    event.preventDefault();
    const cleanKey = licenseKey.trim().toUpperCase();

    if (validateKeyFormat(cleanKey)) {
      onActivate(cleanKey);
      setError('');
      setLicenseKey('');
      return;
    }

    setError(
      isDevMode()
        ? `Invalid key. For local testing, use ${DEV_TEST_KEY}.`
        : 'That key does not match the expected EKIT-XXXX-XXXX-XXXX format.'
    );
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="pricing-backdrop" onMouseDown={handleBackdropClick}>
      <section
        ref={dialogRef}
        className="pricing-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="pricing-close"
          onClick={onClose}
          aria-label="Close pricing dialog"
        >
          <X size={18} />
        </button>

        <div className="pricing-header">
          <span className="pricing-icon" aria-hidden="true"><ShieldCheck size={21} /></span>
          <span className="pricing-eyebrow">ExhibitKIT Pro · Perpetual workstation license</span>
          <h2 id={titleId}>Prepare every exhibit set with confidence.</h2>
          <p id={descriptionId}>One workstation. One payment. Keep using the purchased version, with 12 months of updates and support included.</p>
        </div>

        <div className="pricing-offer">
          <div className="pricing-price">
            <strong>{PRO_PRICE_LABEL}</strong>
            <span>USD<br />one-time</span>
          </div>

          <ul className="pricing-benefits">
            {benefits.map((benefit) => (
              <li key={benefit}><Check size={15} /> {benefit}</li>
            ))}
          </ul>

          {stripeLink ? (
            <a className="pricing-checkout" href={stripeLink} target="_blank" rel="noopener noreferrer">
              <CreditCard size={17} /> Buy Pro — {PRO_PRICE_LABEL} <ExternalLink size={14} />
            </a>
          ) : (
            <div className="pricing-config-error" role="alert">
              <AlertCircle size={15} /> Checkout is temporarily unavailable. Contact support@patentpreppers.com.
            </div>
          )}

          <div className="pricing-trust-row">
            <span><ShieldCheck size={13} /> Payment handled by Stripe</span>
            <span>12 months updates &amp; support</span>
          </div>
        </div>

        <div className="pricing-divider"><span>Restore a license</span></div>

        <form className="pricing-activation" onSubmit={handleActivateSubmit}>
          <label htmlFor="pricing-license-key"><KeyRound size={14} /> Enter your ExhibitKIT license key</label>
          <div className="pricing-activation-row">
            <input
              ref={licenseInputRef}
              id="pricing-license-key"
              type="text"
              value={licenseKey}
              onChange={(event) => {
                setLicenseKey(event.target.value);
                if (error) setError('');
              }}
              placeholder="EKIT-XXXX-XXXX-XXXX"
              autoComplete="off"
              spellCheck="false"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'pricing-license-error' : undefined}
            />
            <button type="submit">Activate</button>
          </div>

          {error && (
            <div id="pricing-license-error" className="pricing-license-error" role="alert">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {isDevMode() && (
            <p className="pricing-dev-note">Local test key: <code>{DEV_TEST_KEY}</code></p>
          )}
        </form>
      </section>
    </div>
  );
}
