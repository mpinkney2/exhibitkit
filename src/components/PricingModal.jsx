import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Check, CreditCard, ExternalLink, KeyRound, Mail, ShieldCheck, X } from 'lucide-react';
import {
  restoreFromLicenseKey,
  requestLicenseRecovery,
  isDevMode,
  DEV_TEST_KEY,
} from '../utils/entitlement';
import { buildStripePaymentLink, PRO_PRICE_LABEL } from '../utils/payment';
import './PricingModal.css';

const benefits = [
  'Unlimited PDF exhibits and batches',
  'Direct, in-place local folder renaming',
  'OnCue, TrialDirector, and custom templates',
  '12 months of updates and support',
];

export default function PricingModal({
  isOpen,
  onClose,
  onActivated,
  workstationId,
  initialView = 'purchase',
}) {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [needsTransfer, setNeedsTransfer] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
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
      licenseInputRef.current?.focus({ preventScroll: true });
    } else {
      closeButtonRef.current?.focus({ preventScroll: true });
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

  const activate = async (confirmTransfer = false) => {
    setIsActivating(true);
    setError('');
    const result = await restoreFromLicenseKey(licenseKey, {
      workstationId,
      confirmTransfer,
    });

    setIsActivating(false);
    if (result.ok) {
      setNeedsTransfer(false);
      setLicenseKey('');
      onActivated?.(result.entitlement);
      return;
    }

    setNeedsTransfer(Boolean(result.needsTransfer));
    setError(result.error || 'That license key could not be restored.');
  };

  const handleActivateSubmit = async (event) => {
    event.preventDefault();
    await activate(false);
  };

  const handleRecoverySubmit = async (event) => {
    event.preventDefault();
    setIsRecovering(true);
    setRecoveryError('');
    setRecoveryMessage('');
    const result = await requestLicenseRecovery(recoveryEmail);
    setIsRecovering(false);
    if (result.ok) {
      setRecoveryMessage(result.message || 'Check your email for recovery instructions.');
    } else {
      setRecoveryError(result.error || 'License recovery is temporarily unavailable.');
    }
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
            <a className="pricing-checkout" href={stripeLink}>
              <CreditCard size={17} /> Buy Pro — {PRO_PRICE_LABEL} <ExternalLink size={14} />
            </a>
          ) : (
            <div className="pricing-config-error" role="alert">
              <AlertCircle size={15} /> Checkout is temporarily unavailable. Contact support@patentpreppers.com.
            </div>
          )}

          <div className="pricing-trust-row">
            <span><ShieldCheck size={13} /> Payment handled by Stripe</span>
            <span>Files never leave your computer</span>
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
                if (needsTransfer) setNeedsTransfer(false);
              }}
              placeholder="EKIT-XXXX-XXXX-XXXX-XXXX"
              autoComplete="off"
              spellCheck="false"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'pricing-license-error' : undefined}
            />
            <button type="submit" disabled={isActivating || !licenseKey.trim()}>
              {isActivating ? 'Verifying…' : 'Activate'}
            </button>
          </div>

          {error && (
            <div id="pricing-license-error" className="pricing-license-error" role="alert">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {needsTransfer && (
            <div className="pricing-transfer-panel">
              <p>Transferring will deactivate this license on the previous workstation.</p>
              <button
                type="button"
                className="pricing-transfer-button"
                disabled={isActivating}
                onClick={() => activate(true)}
              >
                Transfer license to this workstation
              </button>
            </div>
          )}

          {isDevMode() && (
            <p className="pricing-dev-note">Local test key: <code>{DEV_TEST_KEY}</code></p>
          )}
        </form>

        <button
          type="button"
          className="pricing-recovery-toggle"
          onClick={() => {
            setIsRecoveryOpen((current) => !current);
            setRecoveryError('');
            setRecoveryMessage('');
          }}
          aria-expanded={isRecoveryOpen}
        >
          <Mail size={13} /> Lost your license key?
        </button>

        {isRecoveryOpen && (
          <form className="pricing-recovery" onSubmit={handleRecoverySubmit}>
            <label htmlFor="pricing-recovery-email">Purchase email</label>
            <div className="pricing-recovery-row">
              <input
                id="pricing-recovery-email"
                type="email"
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              <button type="submit" disabled={isRecovering}>
                {isRecovering ? 'Sending…' : 'Email my key'}
              </button>
            </div>
            {recoveryMessage && <p className="pricing-recovery-success" role="status">{recoveryMessage}</p>}
            {recoveryError && <p className="pricing-recovery-error" role="alert">{recoveryError}</p>}
          </form>
        )}
      </section>
    </div>
  );
}
