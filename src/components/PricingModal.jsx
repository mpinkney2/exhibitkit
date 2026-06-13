import React, { useState } from 'react';
import { CreditCard, X, AlertCircle } from 'lucide-react';
import { validateKeyFormat, isDevMode, DEV_TEST_KEY } from '../utils/license';

export default function PricingModal({ isOpen, onClose, onActivate, stripeLink = "https://buy.stripe.com/cNicN59My1tC6VN0ayg7e00" }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleActivateSubmit = (e) => {
    e.preventDefault();
    const cleanKey = licenseKey.trim().toUpperCase();

    if (validateKeyFormat(cleanKey)) {
      onActivate(cleanKey);
      setError('');
      setLicenseKey('');
    } else {
      if (isDevMode()) {
        setError(`Invalid license key format. Please use the developer test key for local validation: ${DEV_TEST_KEY}`);
      } else {
        setError('Invalid license key format. Please check your purchase email (Format: EKIT-XXXX-XXXX-XXXX).');
      }
    }
  };

  return (
    <div style={{
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
      animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div className="glass-panel" style={{
        width: '540px',
        maxWidth: '95%',
        padding: '32px',
        position: 'relative',
        backgroundColor: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-modal)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            zIndex: 10
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-primary)',
            margin: '0 auto 8px auto',
            fontSize: '16px',
            fontWeight: 'bold',
            flexShrink: 0
          }}>
            ⚖
          </div>
          
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-sans)', letterSpacing: '-0.4px' }}>
            Upgrade to ExhibitKIT Pro
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
            Professional Legal Exhibit Preparation by PatentPreppers
          </span>
        </div>

        {/* Main Offer Card */}
        <div style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '36px', fontWeight: '700', color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>$150</span>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: '500', fontFamily: 'var(--font-sans)' }}>USD / one-time</span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', lineHeight: '1.6', margin: 0, fontFamily: 'var(--font-sans)' }}>
            Get lifetime access to the full, courtroom-ready ExhibitKIT professional toolset. Prepare and rename exhibits directly on your local system with absolute confidentiality.
          </p>

          <div style={{ width: '100%', height: '1px', background: 'var(--color-border)' }}></div>

          {/* Benefits list */}
          <div style={{
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '14px',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓</span>
              <span>Direct, in-place local folder exhibit renaming</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓</span>
              <span>Unlimited PDF exhibits and batches (No file limit)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓</span>
              <span>OnCue & TrialDirector presets + Custom formatting template</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓</span>
              <span>Saved Matter Profiles & Full Session Audit Log exports</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓</span>
              <span>Local-first processing (No document uploads, zero cloud logs)</span>
            </div>
          </div>
        </div>

        {/* Purchase button */}
        <a 
          href={stripeLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn"
          style={{ 
            textDecoration: 'none', 
            padding: '12px 18px', 
            fontSize: '15px', 
            fontWeight: '600',
            backgroundColor: 'var(--color-accent)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            borderRadius: '6px',
            border: 'none',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer'
          }}
        >
          <CreditCard size={16} />
          Purchase via Stripe Checkout
        </a>

        {/* Small licensing and compliance notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
          <div>Payments processed securely via Stripe. Compliant with bank-grade encryption.</div>
          <div style={{ fontStyle: 'italic', fontSize: '10px' }}>
            * License access is intended for one professional user or workstation unless otherwise agreed. Lifetime updates included for this version; future versions subject to product terms.
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
          <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-sans)' }}>Or Activate License</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
        </div>

        {/* License Key Activation Form */}
        <form onSubmit={handleActivateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', fontFamily: 'var(--font-sans)', color: 'var(--color-text-muted)' }}>License Key</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={licenseKey} 
                onChange={(e) => setLicenseKey(e.target.value)} 
                placeholder="e.g. EKIT-XXXX-XXXX-XXXX"
                style={{ 
                  flex: 1, 
                  fontSize: '13px', 
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-mono)'
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
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Activate
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--color-error)',
              fontSize: '11px',
              background: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              padding: '6px 10px',
              borderRadius: '6px'
            }}>
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span style={{ lineHeight: '1.4' }}>{error}</span>
            </div>
          )}

          {isDevMode() && (
            <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', textAlign: 'center', background: 'rgba(217, 119, 6, 0.05)', border: '1px solid rgba(217, 119, 6, 0.1)', padding: '6px 8px', borderRadius: '4px', marginTop: '4px', fontFamily: 'var(--font-sans)' }}>
              <strong>Development Mode:</strong> You can test using bypass key: <code style={{ fontSize: '10px', padding: '2px 4px', background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}>{DEV_TEST_KEY}</code>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
