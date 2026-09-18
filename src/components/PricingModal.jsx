import { useState } from 'react';
import { CreditCard, X, AlertCircle, Check } from 'lucide-react';
import {
  validateKeyFormat,
  isDevMode,
  DEV_TEST_KEY,
  resolveGuestCredentials,
} from '../utils/license';
import {
  PERPETUAL_CLARIFICATION,
  PRICING,
  PRIVACY_PAYMENT_NOTICE,
} from '../utils/pricing';
import { createCheckoutRequest, startCheckout } from '../utils/payment';

export default function PricingModal({ isOpen, onClose, onActivate }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [guestId, setGuestId] = useState('');
  const [guestPass, setGuestPass] = useState('');
  const [error, setError] = useState('');
  const [checkoutNotice, setCheckoutNotice] = useState('');

  if (!isOpen) return null;

  const handleActivateSubmit = (e) => {
    e.preventDefault();
    const cleanKey = licenseKey.trim().toUpperCase();

    if (validateKeyFormat(cleanKey)) {
      onActivate(cleanKey);
      setError('');
      setLicenseKey('');
    } else if (isDevMode()) {
      setError(
        `Invalid license key. Dev keys: ${DEV_TEST_KEY} (Pro), EKIT-CASE-TEST-0001 (Case Pass), or EKIT-GUEST-TEST-0001 (Guest).`
      );
    } else {
      setError(
        'Invalid license key format. Use EKIT-XXXX-XXXX-XXXX, EKIT-CASE-XXXX-XXXX, or EKIT-GUEST-XXXX-XXXX.'
      );
    }
  };

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    const resolved = resolveGuestCredentials(guestId, guestPass);
    if (!resolved) {
      setError('Guest credentials not recognized. Check guest ID and passphrase.');
      return;
    }
    onActivate(resolved);
    setError('');
    setGuestId('');
    setGuestPass('');
  };

  const handlePurchase = (productId) => {
    const result = startCheckout(productId);
    if (result.status === 'configuration_required') {
      setCheckoutNotice(result.error);
      return;
    }
    setCheckoutNotice('');
  };

  const caseRequest = createCheckoutRequest('case_pass');
  const proRequest = createCheckoutRequest('pro_perpetual');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 7, 12, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-modal-title"
    >
      <div
        className="glass-panel"
        style={{
          width: '640px',
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
          gap: '18px',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close pricing"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h2
            id="pricing-modal-title"
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--color-text-primary)',
              margin: 0,
              letterSpacing: '-0.4px',
            }}
          >
            ExhibitKit plans
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Free remains fully useful. Upgrade only when a case needs Pro outputs.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong>{PRICING.case_pass.name}</strong>
              <span style={{ fontSize: '22px', fontWeight: 700 }}>{PRICING.case_pass.priceLabel}</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {PRICING.case_pass.cadence}
            </span>
            <ul
              style={{
                margin: 0,
                paddingLeft: '18px',
                fontSize: '12.5px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
              }}
            >
              <li>All Pro capabilities for 30 days</li>
              <li>No recurring billing</li>
            </ul>
            <button
              type="button"
              className="btn"
              onClick={() => handlePurchase('case_pass')}
              disabled={!caseRequest.ok}
              style={{
                marginTop: 'auto',
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                opacity: caseRequest.ok ? 1 : 0.55,
              }}
            >
              <CreditCard size={14} /> {PRICING.case_pass.cta}
            </button>
          </div>

          <div
            style={{
              border: '1px solid var(--color-accent)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '-10px',
                left: '12px',
                background: 'var(--color-accent)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '999px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Most popular
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <strong>{PRICING.pro.name}</strong>
                <div style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 650 }}>
                  {PRICING.pro.label}
                </div>
              </div>
              <span style={{ fontSize: '22px', fontWeight: 700 }}>{PRICING.pro.priceLabel}</span>
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: '18px',
                fontSize: '12.5px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
              }}
            >
              <li>Keep the purchased version permanently</li>
              <li>Twelve months of updates and support</li>
              <li>Binder, index, integrity report, ZIP</li>
            </ul>
            <button
              type="button"
              className="btn"
              onClick={() => handlePurchase('pro_perpetual')}
              disabled={!proRequest.ok}
              style={{
                marginTop: 'auto',
                backgroundColor: 'var(--color-accent)',
                color: '#ffffff',
                border: 'none',
                opacity: proRequest.ok ? 1 : 0.55,
              }}
            >
              <CreditCard size={14} /> {PRICING.pro.cta}
            </button>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
          {PERPETUAL_CLARIFICATION}
        </p>
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
          {PRIVACY_PAYMENT_NOTICE}
        </p>

        {checkoutNotice && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              color: 'var(--color-warning)',
              fontSize: '12px',
              background: 'rgba(217, 119, 6, 0.08)',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              padding: '8px 10px',
              borderRadius: '6px',
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{checkoutNotice}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span
            style={{
              fontSize: '10.5px',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Guest demo (10 days)
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        <form onSubmit={handleGuestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Local guest access for a law-firm trial. Not a cloud account — evidence still stays on this
            device.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label" htmlFor="guest-id-input" style={{ fontSize: '11px' }}>
                Guest ID
              </label>
              <input
                id="guest-id-input"
                type="text"
                value={guestId}
                onChange={(e) => setGuestId(e.target.value)}
                placeholder="pinkney.guest"
                autoComplete="username"
                style={{
                  width: '100%',
                  fontSize: '13px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="guest-pass-input" style={{ fontSize: '11px' }}>
                Passphrase
              </label>
              <input
                id="guest-pass-input"
                type="password"
                value={guestPass}
                onChange={(e) => setGuestPass(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  fontSize: '13px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              borderRadius: '6px',
            }}
          >
            Activate 10-day guest demo
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span
            style={{
              fontSize: '10.5px',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Or activate license key
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        <form onSubmit={handleActivateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label className="form-label" htmlFor="license-key-input" style={{ fontSize: '11px' }}>
            License key
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              id="license-key-input"
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="EKIT-XXXX-XXXX-XXXX / EKIT-CASE-… / EKIT-GUEST-…"
              style={{
                flex: 1,
                fontSize: '13px',
                padding: '8px 12px',
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <button
              type="submit"
              className="btn"
              style={{
                flexShrink: 0,
                padding: '8px 16px',
                fontSize: '13px',
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                borderRadius: '6px',
              }}
            >
              Activate
            </button>
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--color-error)',
                fontSize: '11px',
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                padding: '6px 10px',
                borderRadius: '6px',
              }}
            >
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}
        </form>

        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <Check size={14} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
          <span>
            Firm licenses are coming soon (from {PRICING.firm.priceLabel}). Email
            support@patentpreppers.com for early access.
          </span>
        </div>
      </div>
    </div>
  );
}
