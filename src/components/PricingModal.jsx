import { useState } from 'react';
import { CreditCard, X, AlertCircle, Check, Mail } from 'lucide-react';
import {
  PLANS,
  PLAN_IDS,
  PLAN_CHOOSER,
  PRICING_FAQ,
  RENEWAL_SKUS,
  getPlanById,
} from '../config/pricing.js';
import { getCheckoutConfig, getPlanCta, canPurchasePlan, startCheckout } from '../utils/checkout.js';
import { restoreFromLicenseKey, isDevMode, DEV_TEST_KEY } from '../utils/entitlement.js';

export default function PricingModal({ isOpen, onClose, onActivated }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [busyPlan, setBusyPlan] = useState(null);
  const config = getCheckoutConfig();

  if (!isOpen) return null;

  const handleActivateSubmit = (e) => {
    e.preventDefault();
    const result = restoreFromLicenseKey(licenseKey);
    if (result.ok) {
      setError('');
      setLicenseKey('');
      onActivated?.(result.entitlement);
    } else {
      setError(result.error || 'Activation failed.');
    }
  };

  const handlePlanAction = async (planId) => {
    setCheckoutError('');
    const cta = getPlanCta(planId, config);

    if (cta.kind === 'contact' && cta.href) {
      window.open(cta.href, '_self', 'noopener,noreferrer');
      return;
    }

    if (cta.kind === 'checkout') {
      setBusyPlan(planId);
      try {
        await startCheckout(planId, config);
      } catch (err) {
        setCheckoutError(err.message || 'Checkout is unavailable.');
      } finally {
        setBusyPlan(null);
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 12, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        padding: '16px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '920px',
          maxWidth: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '28px',
          position: 'relative',
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-modal)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            zIndex: 10,
          }}
          aria-label="Close pricing"
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, letterSpacing: '-0.4px' }}>
            ExhibitKIT pricing
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Local-first exhibit filename renaming. No subscription required.
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          {PLAN_CHOOSER.map((row) => {
            const plan = getPlanById(row.planId);
            return (
              <div key={row.planId}>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {row.audience}
                </div>
                <strong style={{ color: 'var(--color-text-primary)' }}>{plan?.name}</strong>
              </div>
            );
          })}
        </div>

        {!config.checkoutConfigured && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              background: 'rgba(217, 119, 6, 0.08)',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              borderRadius: '8px',
              padding: '10px 12px',
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2, color: 'var(--status-warning, #d97706)' }} />
            <span>
              Secure checkout is not configured for this deployment. Paid purchase buttons stay disabled until a
              verified billing backend is available. You can still restore an existing license key below.
            </span>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '12px',
          }}
        >
          {PLANS.map((plan) => {
            const cta = getPlanCta(plan.id, config);
            const purchasable = canPurchasePlan(plan.id, config);
            const isFirm = plan.id === PLAN_IDS.FIRM;
            const isFree = plan.id === PLAN_IDS.FREE;

            return (
              <div
                key={plan.id}
                style={{
                  border: plan.badge ? '1px solid var(--color-accent, #2563eb)' : '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  background: 'var(--color-surface-2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '14px' }}>{plan.name}</strong>
                  {plan.badge && (
                    <em
                      style={{
                        fontStyle: 'normal',
                        fontSize: '9px',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '3px 7px',
                        borderRadius: '99px',
                        background: 'rgba(37,99,235,.12)',
                        color: 'var(--color-accent, #2563eb)',
                        fontWeight: 700,
                      }}
                    >
                      {plan.badge}
                    </em>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em' }}>{plan.displayPrice}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{plan.billingLabel}</div>
                  {plan.licenseLabel && (
                    <div style={{ fontSize: '11px', marginTop: 4, fontWeight: 600 }}>{plan.licenseLabel}</div>
                  )}
                </div>

                {plan.supportingCopy && (
                  <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                    {plan.supportingCopy}
                  </p>
                )}

                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '7px', flex: 1 }}>
                  {plan.features.map((f) => (
                    <li key={f.text} style={{ display: 'flex', gap: 7, fontSize: '11.5px', lineHeight: 1.35, color: f.available ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                      <Check size={13} style={{ flexShrink: 0, marginTop: 1, opacity: f.available ? 1 : 0.45 }} />
                      <span>
                        {f.text}
                        {f.planned ? ' (planned)' : ''}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.clarification && (
                  <p style={{ margin: 0, fontSize: '10.5px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    {plan.clarification}
                  </p>
                )}

                {isFree ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClose}
                    style={{ width: '100%', fontSize: '13px' }}
                  >
                    {plan.ctaShort}
                  </button>
                ) : isFirm || cta.kind === 'contact' ? (
                  <a
                    href={cta.href}
                    className="btn btn-secondary"
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Mail size={14} />
                    {cta.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    disabled={!purchasable || busyPlan === plan.id}
                    onClick={() => handlePlanAction(plan.id)}
                    title={!purchasable ? cta.disabledReason || undefined : undefined}
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      opacity: purchasable ? 1 : 0.45,
                      cursor: purchasable ? 'pointer' : 'not-allowed',
                      backgroundColor: 'var(--color-accent)',
                      color: '#fff',
                      border: 'none',
                      display: 'inline-flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    data-purchase-enabled={purchasable ? 'true' : 'false'}
                    data-plan-id={plan.id}
                  >
                    <CreditCard size={14} />
                    {busyPlan === plan.id ? 'Starting…' : cta.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {checkoutError && (
          <div style={{ fontSize: '12px', color: 'var(--color-error, #dc2626)' }}>{checkoutError}</div>
        )}

        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
          Optional Updates & Support after Pro&apos;s included year: {RENEWAL_SKUS.proUpdatesSupport.displayPrice}/year
          (informational — renewal checkout is not enabled). Firm updates/support: {RENEWAL_SKUS.firmUpdatesSupport.displayPrice}/year
          (planned). Renewal is never required to keep entitled renaming access.
        </div>

        <details style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Pricing FAQ</summary>
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {PRICING_FAQ.map((item) => (
              <div key={item.id}>
                <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>{item.question}</div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{item.answer}</p>
              </div>
            ))}
          </div>
        </details>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: 10.5, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Restore license key
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        <form onSubmit={handleActivateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label className="form-label" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            License Key
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="e.g. EKIT-XXXX-XXXX-XXXX"
              style={{
                flex: 1,
                fontSize: 13,
                padding: '8px 12px',
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0, padding: '8px 16px', fontSize: 13 }}>
              Activate
            </button>
          </div>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--color-error, #dc2626)',
                fontSize: 11,
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                padding: '6px 10px',
                borderRadius: 6,
              }}
            >
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}
          {isDevMode() && (
            <div
              style={{
                fontSize: 10.5,
                color: 'var(--color-text-muted)',
                textAlign: 'center',
                background: 'rgba(217, 119, 6, 0.05)',
                border: '1px solid rgba(217, 119, 6, 0.1)',
                padding: '6px 8px',
                borderRadius: 4,
              }}
            >
              <strong>Development Mode:</strong> test key{' '}
              <code style={{ fontSize: 10, padding: '2px 4px', background: 'var(--color-surface-2)' }}>{DEV_TEST_KEY}</code>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
