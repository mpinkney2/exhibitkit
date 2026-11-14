import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Check, Mail, RefreshCw, X } from 'lucide-react';
import { requestLicenseRecovery } from '../utils/entitlement';
import { lostKeyHelp } from '../utils/licenseDeviceStatus';
import './LicenseDevicePanel.css';

function formatWhen(iso, withTime = false) {
  const ms = Date.parse(iso || '');
  if (!Number.isFinite(ms)) return 'Not recorded';
  return new Date(ms).toLocaleString('en-US', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' });
}

export default function LicenseDevicePanel({
  isOpen,
  onClose,
  view,
  onActivate,
  onRecheck,
  onRemove,
  onUpgrade,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState('status');
  const [licenseKey, setLicenseKey] = useState('');
  const [replaceMessage, setReplaceMessage] = useState('');
  const [transferReady, setTransferReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [removeArmed, setRemoveArmed] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryNote, setRecoveryNote] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recovering, setRecovering] = useState(false);
  const help = lostKeyHelp();

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !view) return null;

  const resetEntry = () => {
    setLicenseKey('');
    setReplaceMessage('');
    setTransferReady(false);
    setError('');
  };

  const submitKey = async (confirmReplace = false, confirmTransfer = false) => {
    setBusy(true);
    setError('');
    setSuccess('');
    const result = await onActivate(licenseKey, { confirmReplace, confirmTransfer });
    setBusy(false);
    if (result?.needsReplace) {
      setReplaceMessage(result.message);
      setTransferReady(false);
      return;
    }
    if (result?.notice) {
      setReplaceMessage('');
      setError('');
      setSuccess(result.notice);
      return;
    }
    if (result?.needsTransfer) {
      setReplaceMessage('');
      setTransferReady(true);
      setError(result.error || 'This license is active on another workstation.');
      return;
    }
    if (result?.ok) {
      resetEntry();
      setMode('status');
      setSuccess(result.successMessage || 'License updated on this device.');
      return;
    }
    setError(result?.error || 'That license key could not be activated.');
  };

  const recheck = async () => {
    setBusy(true);
    setError('');
    const result = await onRecheck();
    setBusy(false);
    if (result?.cleared) {
      setSuccess('');
      setError('This license is no longer active on this device.');
      return;
    }
    if (result?.expired) {
      setSuccess('');
      setError('');
      return;
    }
    if (result?.offline) {
      setError('The license service could not be reached. The saved license on this device was left in place.');
      return;
    }
    setSuccess('License re-checked for this device.');
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    const result = await onRemove();
    setBusy(false);
    setRemoveArmed(false);
    setSuccess('');
    if (result?.offline) {
      setError('Removed from this browser. The license service could not be reached, so this device’s seat may still be reserved until you activate again.');
      return;
    }
    onClose();
  };

  const sendRecovery = async (event) => {
    event.preventDefault();
    setRecovering(true);
    setRecoveryError('');
    setRecoveryNote('');
    const result = await requestLicenseRecovery(recoveryEmail);
    setRecovering(false);
    if (result.ok) {
      setRecoveryNote(result.message || 'If that email matches an active license, a recovery message is on its way.');
    } else {
      setRecoveryError(result.error || 'License recovery is temporarily unavailable.');
    }
  };

  const emailShown = revealed && view.email ? view.email : (view.maskedEmail || 'Not recorded');

  return (
    <div className="license-panel-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        ref={dialogRef}
        className="license-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="license-device-panel"
      >
        <button ref={closeRef} type="button" className="license-panel-close" onClick={onClose} aria-label="Close license and device">
          <X size={18} />
        </button>
        <p className="license-panel-kicker">This browser only</p>
        <h2 id={titleId}>License & device</h2>
        <p className="license-panel-lead">{view.sessionPhrase || view.summary}</p>

        {success && (
          <div className="license-panel-success" role="status" data-testid="license-activation-success">
            <Check size={16} /> {success}
          </div>
        )}
        {error && (
          <div className="license-panel-error" role="alert">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <dl className="license-panel-facts">
          <div>
            <dt>Plan</dt>
            <dd>{view.planLabel}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{view.endedLabel || view.status}</dd>
          </div>
          <div>
            <dt>License email</dt>
            <dd>
              <span>{emailShown}</span>
              {view.email && (
                <button type="button" className="license-inline-button" aria-pressed={revealed} onClick={() => setRevealed((current) => !current)}>
                  {revealed ? 'Hide' : 'Show'}
                </button>
              )}
            </dd>
          </div>
          <div>
            <dt>Key</dt>
            <dd>{view.keyLast4 ? `Ending ${view.keyLast4}` : 'No key on this device'}</dd>
          </div>
          <div>
            <dt>Activated</dt>
            <dd>{view.activationDate ? formatWhen(view.activationDate, true) : 'Not recorded'}</dd>
          </div>
          <div>
            <dt>Expires</dt>
            <dd>{view.expiresLabel}</dd>
          </div>
          <div>
            <dt>Device</dt>
            <dd>{view.deviceIdShort ? `…${view.deviceIdShort}` : 'This browser'}</dd>
          </div>
          <div>
            <dt>Activation</dt>
            <dd>{view.activationIdShort ? `…${view.activationIdShort}` : 'Not recorded'}</dd>
          </div>
          <div>
            <dt>Last check</dt>
            <dd>{view.lastValidatedAt ? formatWhen(view.lastValidatedAt, true) : 'Not recorded'}</dd>
          </div>
        </dl>

        {view.upgradeNote && (
          <div className="license-near-expiry" role="note" data-testid="license-near-expiry-note">
            <p>{view.upgradeNote}</p>
            {onUpgrade && (
              <button type="button" className="btn btn-primary" onClick={onUpgrade}>
                Upgrade to Pro
              </button>
            )}
          </div>
        )}
        {view.endedNotice && (
          <div className="license-near-expiry" role="note" data-testid="license-ended-panel-note">
            <p>{view.endedNotice.lead} {view.endedNotice.kept} {view.endedNotice.limited}</p>
            {onUpgrade && (
              <button type="button" className="btn btn-primary" onClick={onUpgrade}>
                Upgrade to Pro
              </button>
            )}
          </div>
        )}
        {view.accessNote && <p className="license-panel-note">{view.accessNote}</p>}
        {view.configurationMessage && <p className="license-panel-note">{view.configurationMessage}</p>}
        <p className="license-panel-storage">{view.storageInfo}</p>

        <div className="license-panel-actions">
          <button type="button" className="btn btn-secondary" onClick={recheck} disabled={busy}>
            <RefreshCw size={14} /> Re-check license
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setMode((current) => (current === 'switch' ? 'status' : 'switch'));
              setRemoveArmed(false);
              resetEntry();
              setSuccess('');
            }}
            disabled={busy}
          >
            Switch license / enter a different key
          </button>
          <button
            type="button"
            className="btn license-panel-danger"
            onClick={() => {
              setRemoveArmed(true);
              setMode('status');
            }}
            disabled={busy || !view.hasLicense}
          >
            Remove license from this device
          </button>
        </div>

        {removeArmed && (
          <div className="license-panel-confirm" role="alert">
            <p>Remove the license from this browser? This signs out this device only. The license itself is not deleted and can be entered again.</p>
            <div className="license-panel-confirm-actions">
              <button type="button" className="btn license-panel-danger" onClick={remove} disabled={busy}>
                Remove from this device
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setRemoveArmed(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {mode === 'switch' && (
          <form
            className="license-panel-switch"
            onSubmit={(event) => {
              event.preventDefault();
              submitKey(false, false);
            }}
          >
            <label htmlFor="device-license-key">License key</label>
            <div className="license-panel-key-row">
              <input
                id="device-license-key"
                value={licenseKey}
                onChange={(event) => {
                  setLicenseKey(event.target.value);
                  setReplaceMessage('');
                  setTransferReady(false);
                  setError('');
                }}
                placeholder="EKIT-XXXX-XXXX-XXXX-XXXX"
                autoComplete="off"
                spellCheck="false"
              />
              <button type="submit" className="btn btn-primary" disabled={busy || !licenseKey.trim()}>
                {busy ? 'Checking…' : 'Activate'}
              </button>
            </div>
            {replaceMessage && (
              <div className="license-panel-confirm" role="alert" data-testid="license-replace-notice">
                <p>{replaceMessage}</p>
                <div className="license-panel-confirm-actions">
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={() => submitKey(true, false)}>
                    Replace it with the new key
                  </button>
                  <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setReplaceMessage('')}>
                    Keep the current license
                  </button>
                </div>
              </div>
            )}
            {transferReady && (
              <div className="license-panel-confirm">
                <p>The new key is active on another workstation. Transfer it here and release that seat?</p>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => submitKey(true, true)}>
                  Transfer license to this device
                </button>
              </div>
            )}
          </form>
        )}

        <section className="license-panel-recovery">
          <h3><Mail size={15} /> {help.title}</h3>
          {help.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <p>
            <a href={`mailto:${help.supportEmail}`}>{help.supportEmail}</a>
          </p>
          <form onSubmit={sendRecovery}>
            <label htmlFor="device-recovery-email">Email the key was sent to</label>
            <div className="license-panel-key-row">
              <input
                id="device-recovery-email"
                type="email"
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              <button type="submit" className="btn btn-secondary" disabled={recovering}>
                {recovering ? 'Sending…' : 'Email my key'}
              </button>
            </div>
          </form>
          {recoveryNote && <p className="license-panel-success" role="status">{recoveryNote}</p>}
          {recoveryError && <p className="license-panel-error" role="alert">{recoveryError}</p>}
        </section>
      </section>
    </div>
  );
}
