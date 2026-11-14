import { X } from 'lucide-react';
import './LicenseDevicePanel.css';

export default function LicenseEndedNotice({ view, onUpgrade, onDismiss }) {
  const copy = view?.endedNotice;
  if (!view?.ended || !copy) return null;

  return (
    <aside className="license-ended-banner" role="status" data-testid="license-ended-notice">
      <button type="button" className="license-panel-close license-ended-dismiss" onClick={onDismiss} aria-label="Dismiss notice">
        <X size={16} />
      </button>
      <h2>{copy.title}</h2>
      <p>{copy.lead}</p>
      <p>{copy.kept}</p>
      <p>{copy.limited}</p>
      <div className="license-ended-banner-actions">
        <button type="button" className="btn btn-primary" onClick={onUpgrade}>
          Upgrade to Pro
        </button>
      </div>
    </aside>
  );
}
