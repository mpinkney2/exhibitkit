import { useEffect, useState } from 'react';
import { Shield, X, Lock, Unlock, RefreshCw } from 'lucide-react';
import {
  isFounderAdminConfigured,
  isFounderUnlocked,
  unlockFounder,
  lockFounder,
  shouldOfferFounderEntry,
  clearFounderQueryFromUrl,
  DEFAULT_FOUNDER_SECRET,
  isUsingDefaultFounderSecret,
} from '../utils/founder.js';
import {
  getEntitlement,
  clearEntitlement,
  applyCasePassForTesting,
  applyExpiredCasePassForTesting,
  applyPendingCasePassForTesting,
  applyProForTesting,
  getEntitlementLabel,
  hasProFeatures,
  areUpdatesIncluded,
  FREE_MAX_FILES_PER_BATCH,
  getWorkstationInfo,
} from '../utils/entitlement.js';
import { getCheckoutConfig } from '../utils/checkout.js';
import { isDevMode, DEV_TEST_KEY } from '../utils/license.js';

const panelStyle = {
  position: 'fixed',
  right: 16,
  bottom: 16,
  width: 360,
  maxWidth: 'calc(100vw - 24px)',
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  zIndex: 9000,
  background: 'var(--color-surface-1, #111827)',
  color: 'var(--color-text-primary, #f3f4f6)',
  border: '1px solid rgba(245, 158, 11, 0.45)',
  borderRadius: 12,
  boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  fontSize: 12,
  fontFamily: 'var(--font-sans, system-ui, sans-serif)',
};

const btn = {
  border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
  background: 'var(--color-surface-2, #1f2937)',
  color: 'inherit',
  borderRadius: 6,
  padding: '7px 9px',
  cursor: 'pointer',
  fontSize: 11.5,
  textAlign: 'left',
};

const btnPrimary = {
  ...btn,
  background: 'rgba(245, 158, 11, 0.18)',
  borderColor: 'rgba(245, 158, 11, 0.5)',
  fontWeight: 600,
};

/**
 * Founder live-test console.
 * Props let App jump routes / open pricing / refresh entitlement state.
 */
export default function FounderAdmin({
  appRoute,
  entitlement,
  onEntitlementChange,
  onSetRoute,
  onOpenPricing,
  onLaunchWorkspace,
}) {
  const [visible, setVisible] = useState(() => shouldOfferFounderEntry() || isFounderUnlocked());
  const [unlocked, setUnlocked] = useState(() => isFounderUnlocked());
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (shouldOfferFounderEntry()) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        setVisible(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!visible) return null;

  const configured = isFounderAdminConfigured();
  const usingDefaultSecret = isUsingDefaultFounderSecret();
  const checkout = getCheckoutConfig();
  const current = entitlement || getEntitlement();
  const workstation = getWorkstationInfo();

  const applyStage = (label, fn) => {
    const next = fn();
    onEntitlementChange?.(next);
    setNote(`Applied: ${label}`);
    setError('');
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    const result = unlockFounder(secret);
    if (!result.ok) {
      setError(result.error || 'Unlock failed');
      setUnlocked(false);
      return;
    }
    setUnlocked(true);
    setError('');
    setNote('Founder admin unlocked for this browser session.');
    clearFounderQueryFromUrl();
  };

  const handleLock = () => {
    lockFounder();
    setUnlocked(false);
    setSecret('');
    setNote('Founder session locked.');
  };

  return (
    <aside style={panelStyle} data-founder-admin="true" aria-label="Founder admin">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#f59e0b' }}>
          <Shield size={15} />
          Founder admin
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          style={{ ...btn, padding: 4 }}
          aria-label="Hide founder admin"
          title="Hide (Ctrl+Shift+F to show again)"
        >
          <X size={14} />
        </button>
      </div>

      <div
        style={{
          fontSize: 11,
          color: 'var(--color-text-muted, #9ca3af)',
          lineHeight: 1.4,
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 8,
          padding: '8px 10px',
        }}
      >
        Live-test console only. Stage switches write local entitlement cache — they are not Stripe purchases.
      </div>

      {!unlocked ? (
        <form onSubmit={handleUnlock} style={{ display: 'grid', gap: 8 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ color: 'var(--color-text-muted, #9ca3af)' }}>Founder secret</span>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter founder secret"
              autoComplete="current-password"
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
                background: 'var(--color-surface-2, #1f2937)',
                color: 'inherit',
              }}
            />
          </label>
          <button type="submit" style={btnPrimary} disabled={!configured}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Unlock size={13} /> Unlock founder admin
            </span>
          </button>
          {usingDefaultSecret && (
            <div style={{ color: 'var(--color-text-muted, #9ca3af)' }}>
              Default secret: <code>{DEFAULT_FOUNDER_SECRET}</code>
            </div>
          )}
          {error && <div style={{ color: '#f87171' }}>{error}</div>}
        </form>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#34d399' }}>
              <Unlock size={13} /> Session unlocked
            </span>
            <button type="button" style={btn} onClick={handleLock}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Lock size={12} /> Lock
              </span>
            </button>
          </div>

          <section style={{ display: 'grid', gap: 6 }}>
            <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>
              Current stage
            </strong>
            <div style={{ display: 'grid', gap: 3, background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8 }}>
              <div>Route: <code>{appRoute}</code></div>
              <div>Label: <strong>{getEntitlementLabel(current)}</strong></div>
              <div>Plan: <code>{current.plan}</code></div>
              <div>Paid features: <strong>{hasProFeatures(current) ? 'yes' : 'no'}</strong></div>
              <div>Updates window: <strong>{areUpdatesIncluded(current) ? 'open' : 'closed/n-a'}</strong></div>
              <div>Free file cap: <code>{hasProFeatures(current) ? 'unlimited' : FREE_MAX_FILES_PER_BATCH}</code></div>
              <div>Workstation: <code style={{ fontSize: 10 }}>{workstation.deviceId}</code></div>
            </div>
            <pre
              style={{
                margin: 0,
                padding: 8,
                borderRadius: 8,
                background: 'rgba(0,0,0,0.35)',
                overflow: 'auto',
                maxHeight: 120,
                fontSize: 10,
                lineHeight: 1.35,
              }}
            >
              {JSON.stringify(current, null, 2)}
            </pre>
          </section>

          <section style={{ display: 'grid', gap: 6 }}>
            <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>
              Entitlement stages
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button type="button" style={btn} onClick={() => applyStage('Free', () => { clearEntitlement(); return getEntitlement(); })}>
                Free
              </button>
              <button type="button" style={btn} onClick={() => applyStage('Case Pass active', () => applyCasePassForTesting())}>
                Case Pass active
              </button>
              <button type="button" style={btn} onClick={() => applyStage('Case Pass expired', () => applyExpiredCasePassForTesting())}>
                Case Pass expired
              </button>
              <button type="button" style={btn} onClick={() => applyStage('Case Pass pending', () => applyPendingCasePassForTesting())}>
                Case Pass pending
              </button>
              <button type="button" style={btn} onClick={() => applyStage('Pro (updates included)', () => applyProForTesting())}>
                Pro + updates
              </button>
              <button type="button" style={btn} onClick={() => applyStage('Pro (updates lapsed)', () => applyProForTesting({ updatesLapsed: true }))}>
                Pro updates lapsed
              </button>
            </div>
          </section>

          <section style={{ display: 'grid', gap: 6 }}>
            <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>
              App surfaces
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button type="button" style={btn} onClick={() => onSetRoute?.('landing')}>Landing</button>
              <button type="button" style={btn} onClick={() => { onLaunchWorkspace?.(); onSetRoute?.('workspace'); }}>Workspace</button>
              <button type="button" style={btn} onClick={() => onSetRoute?.('stripe_success')}>Stripe success</button>
              <button type="button" style={btn} onClick={() => onSetRoute?.('stripe_cancel')}>Stripe cancel</button>
              <button type="button" style={{ ...btn, gridColumn: '1 / -1' }} onClick={() => onOpenPricing?.()}>
                Open pricing modal
              </button>
            </div>
          </section>

          <section style={{ display: 'grid', gap: 6 }}>
            <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>
              Checkout config
            </strong>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, lineHeight: 1.45 }}>
              <div>Configured: <strong>{checkout.checkoutConfigured ? 'yes' : 'no'}</strong></div>
              <div>Case Pass CTA: <strong>{checkout.casePassCheckoutEnabled ? 'enabled' : 'disabled'}</strong></div>
              <div>Pro CTA: <strong>{checkout.proCheckoutEnabled ? 'enabled' : 'disabled'}</strong></div>
              {checkout.reason && <div style={{ color: '#fbbf24' }}>{checkout.reason}</div>}
            </div>
            {isDevMode() && (
              <div style={{ color: '#9ca3af' }}>
                Dev license key: <code>{DEV_TEST_KEY}</code>
              </div>
            )}
          </section>

          <button
            type="button"
            style={btn}
            onClick={() => {
              onEntitlementChange?.(getEntitlement());
              setNote('Refreshed entitlement from local storage.');
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={12} /> Refresh entitlement
            </span>
          </button>
        </>
      )}

      {(note || error) && unlocked && (
        <div style={{ color: error ? '#f87171' : '#34d399' }}>{error || note}</div>
      )}
    </aside>
  );
}
