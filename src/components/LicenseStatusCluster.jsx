import './LicenseDevicePanel.css';

export default function LicenseStatusCluster({
  view,
  onOpen,
  revealed = false,
  onToggleReveal,
}) {
  if (!view) return null;

  const emailText = revealed && view.email ? view.email : view.maskedEmail;
  const label = !view.hasLicense
    ? view.summary
    : `Signed in as ${view.planLabel} · ${view.status}${emailText ? ` · ${emailText}` : ''}`;

  return (
    <div className="license-status-cluster" role="group" aria-label="License status">
      <button
        type="button"
        className={`license-status-chip is-${view.status === 'Not activated' ? 'free' : view.status.toLowerCase()}`}
        onClick={onOpen}
        data-testid="license-status-indicator"
      >
        <span className="license-status-dot" aria-hidden="true" />
        <span className="license-status-text">{label}</span>
      </button>
      {view.email && (
        <button
          type="button"
          className="license-status-reveal"
          aria-pressed={revealed}
          onClick={onToggleReveal}
        >
          {revealed ? 'Hide email' : 'Show email'}
        </button>
      )}
    </div>
  );
}
