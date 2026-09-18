import { useEffect, useState } from 'react';
import { Shield, X, Lock, Unlock, RefreshCw, Mail } from 'lucide-react';
import {
  isFounderAdminConfigured,
  isFounderUnlocked,
  unlockFounder,
  lockFounder,
  shouldOfferFounderEntry,
  clearFounderQueryFromUrl,
  DEFAULT_FOUNDER_SECRET,
  isUsingDefaultFounderSecret,
  inviteBetaTester,
} from '../utils/founder.js';
import {
  getEntitlement,
  clearEntitlement,
  applyCasePassForTesting,
  applyExpiredCasePassForTesting,
  applyPendingCasePassForTesting,
  applyProForTesting,
  applyFounderUnlimitedPro,
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

const inviteInputStyle = {
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
  background: 'var(--color-surface-2, #1f2937)',
  color: 'inherit',
  fontSize: 11.5,
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
  onClosePricing,
  onLaunchWorkspace,
}) {
  const [visible, setVisible] = useState(() => shouldOfferFounderEntry() || isFounderUnlocked());
  const [unlocked, setUnlocked] = useState(() => isFounderUnlocked());
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [inviteDays, setInviteDays] = useState('30');
  const [inviteSecret, setInviteSecret] = useState('');
  const [needsInviteSecret, setNeedsInviteSecret] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState(null);

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

  const applyStage = (label, fn, { enterWorkspace = false } = {}) => {
    const next = fn();
    onEntitlementChange?.(next);
    if (enterWorkspace) {
      onClosePricing?.();
      onLaunchWorkspace?.();
      onSetRoute?.('workspace');
    }
    setNote(`Applied: ${label}`);
    setError('');
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    setUnlocking(true);
    setError('');
    try {
      const result = await unlockFounder(secret);
      if (!result.ok) {
        setError(result.error || 'Unlock failed');
        setUnlocked(false);
        return;
      }
      setUnlocked(true);
      setNote('Founder admin unlocked for this browser session.');
      clearFounderQueryFromUrl();
    } finally {
      setUnlocking(false);
    }
  };

  const handleLock = () => {
    lockFounder();
    setUnlocked(false);
    setSecret('');
    setInviteSecret('');
    setNeedsInviteSecret(false);
    setInviteResult(null);
    setInviteError('');
    setNote('Founder session locked.');
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteBusy(true);
    setInviteError('');
    setInviteResult(null);
    try {
      const result = await inviteBetaTester({
        email: inviteEmail,
        name: inviteName,
        note: inviteNote,
        days: Number(inviteDays) || 30,
        secret: inviteSecret || undefined,
      });
      if (!result.ok) {
        setInviteError(result.error || 'Could not send the beta invitation.');
        setNeedsInviteSecret(Boolean(result.needsSecret));
        return;
      }
      setInviteResult(result);
      setNeedsInviteSecret(false);
      setInviteEmail('');
      setInviteName('');
      setInviteNote('');
      setInviteSecret('');
      setNote(`Beta invite created for ${result.email}.`);
    } finally {
      setInviteBusy(false);
    }
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
          <button type="submit" style={btnPrimary} disabled={!configured || unlocking}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Unlock size={13} /> {unlocking ? 'Checking…' : 'Unlock founder admin'}
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
              Founder unlimited
            </strong>
            <button
              type="button"
              style={btnPrimary}
              onClick={() => applyStage(
                'Founder unlimited Pro (no payment)',
                () => applyFounderUnlimitedPro(),
                { enterWorkspace: true },
              )}
            >
              Founder Pro — unlimited renaming (skip payment)
            </button>
            <div style={{ color: 'var(--color-text-muted, #9ca3af)', lineHeight: 1.4 }}>
              Grants Pro renaming + unlimited batches on this browser while founder admin stays unlocked. Not a Stripe purchase.
            </div>
          </section>

          <section style={{ display: 'grid', gap: 6 }}>
            <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>
              Beta invites
            </strong>
            <div style={{ color: 'var(--color-text-muted, #9ca3af)', lineHeight: 1.4 }}>
              Mints a real, server-verified Pro license and emails the key. The tester activates it via “Restore license.” Requires the deployed API (Neon + Resend configured).
            </div>
            <form onSubmit={handleInvite} style={{ display: 'grid', gap: 6 }}>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Tester email (required)"
                autoComplete="off"
                style={inviteInputStyle}
              />
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Name (optional)"
                autoComplete="off"
                style={inviteInputStyle}
              />
              <input
                type="text"
                value={inviteNote}
                onChange={(e) => setInviteNote(e.target.value)}
                placeholder="Note (optional)"
                autoComplete="off"
                style={inviteInputStyle}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--color-text-muted, #9ca3af)' }}>Days</span>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={inviteDays}
                  onChange={(e) => setInviteDays(e.target.value)}
                  style={{ ...inviteInputStyle, width: 80 }}
                />
              </label>
              {needsInviteSecret && (
                <input
                  type="password"
                  value={inviteSecret}
                  onChange={(e) => setInviteSecret(e.target.value)}
                  placeholder="Re-enter founder secret"
                  autoComplete="off"
                  style={inviteInputStyle}
                />
              )}
              <button type="submit" style={btnPrimary} disabled={inviteBusy}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} /> {inviteBusy ? 'Sending…' : 'Send beta invite'}
                </span>
              </button>
            </form>
            {inviteError && <div style={{ color: '#f87171' }}>{inviteError}</div>}
            {inviteResult && (
              <div style={{ display: 'grid', gap: 3, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', padding: 8, borderRadius: 8 }}>
                <div>Invited: <strong>{inviteResult.email}</strong></div>
                <div>Key: <code style={{ fontSize: 11 }}>{inviteResult.key}</code></div>
                <div>Fingerprint: <code>{inviteResult.fingerprint}</code></div>
                <div>Expires: <strong>{new Date(inviteResult.expiresAt).toLocaleDateString('en-US')}</strong> ({inviteResult.days} days)</div>
                <div>Email delivery: <strong>{inviteResult.emailStatus}</strong></div>
                <button
                  type="button"
                  style={btn}
                  onClick={() => navigator.clipboard?.writeText(inviteResult.key)}
                >
                  Copy license key
                </button>
              </div>
            )}
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
              <button
                type="button"
                style={btn}
                onClick={() => applyStage('Pro (updates included)', () => applyProForTesting(), { enterWorkspace: true })}
              >
                Pro + updates
              </button>
              <button type="button" style={btn} onClick={() => applyStage('Pro (updates lapsed)', () => applyProForTesting({ updatesLapsed: true }), { enterWorkspace: true })}>
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
