import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Zap, Sparkles, X, Key, AlertCircle, HardDrive } from 'lucide-react';
import { validateKeyFormat, isDevMode, DEV_TEST_KEY } from '../utils/license';

export default function PricingModal({ isOpen, onClose, onActivate, stripeLink = "https://buy.stripe.com/cNicN59My1tC6VN0ayg7e00" }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleActivateSubmit = (e) => {
    e.preventDefault();
    const cleanKey = licenseKey.trim().toUpperCase();

    // Secure License Activation using centralized service layer.
    // Future expansion: hook into desktop verification or HTTPS cloud seats.
    if (validateKeyFormat(cleanKey)) {
      onActivate(cleanKey);
      setError('');
      setLicenseKey('');
    } else {
      // In production, this key must be completely ignored as a valid key.
      // The error message must only guide towards real key formats in production.
      if (isDevMode()) {
        setError(`❌ Invalid license key. Please check your purchase email or use the developer test key for local validation: ${DEV_TEST_KEY}`);
      } else {
        setError('❌ Invalid license key. Please confirm you entered the key exactly as it appears in your purchase email (Format: EKIT-XXXX-XXXX-XXXX).');
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
        border: '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(99, 102, 241, 0.15)',
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
            color: 'var(--text-secondary)',
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
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.12)',
            color: 'var(--accent-primary)',
            margin: '0 auto 8px auto'
          }}>
            <Sparkles size={22} />
          </div>
          
          <h2 style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px' }}>
            Unlock ExhibitKIT Pro
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Professional Legal Exhibit Preparation by PatentPreppers
          </span>
        </div>

        {/* Main Offer Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)' }}>$150</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>USD / one-time</span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.5', margin: 0 }}>
            Get lifetime access to the full, courtroom-ready ExhibitKIT professional toolset. Prepare and rename exhibits directly on your local system with absolute confidentiality.
          </p>

          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.06)' }}></div>

          {/* Benefits list */}
          <div style={{
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '12.5px',
            color: 'var(--text-primary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={15} color="var(--status-success)" style={{ flexShrink: 0 }} />
              <span>Direct, in-place local folder exhibit renaming</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={15} color="var(--status-success)" style={{ flexShrink: 0 }} />
              <span>Unlimited PDF exhibits and batches (No file limit)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <HardDrive size={15} color="var(--status-success)" style={{ flexShrink: 0 }} />
              <span>OnCue & TrialDirector presets + Custom formatting template</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Zap size={15} color="var(--status-success)" style={{ flexShrink: 0 }} />
              <span>Saved Matter Profiles & Full Session Audit Log exports</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Zap size={15} color="var(--status-success)" style={{ flexShrink: 0 }} />
              <span>Local-first processing (No document uploads, zero cloud logs)</span>
            </div>
          </div>
        </div>

        {/* Purchase button */}
        <a 
          href={stripeLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ 
            textDecoration: 'none', 
            padding: '12px 18px', 
            fontSize: '14.5px', 
            fontWeight: '600',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
          }}
        >
          <CreditCard size={16} />
          Purchase via Stripe Checkout
        </a>

        {/* Small licensing and compliance notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
          <div>🔒 Payments processed securely via Stripe. Compliant with bank-grade encryption.</div>
          <div style={{ fontStyle: 'italic' }}>
            * License access is intended for one professional user or workstation unless otherwise agreed. Lifetime updates included for this version; future versions subject to product terms.
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Or Activate License</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
        </div>

        {/* License Key Activation Form */}
        <form onSubmit={handleActivateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px' }}>License Key</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={licenseKey} 
                onChange={(e) => setLicenseKey(e.target.value)} 
                placeholder="e.g. EKIT-XXXX-XXXX-XXXX"
                style={{ flex: 1, fontSize: '13px', padding: '8px 12px' }}
              />
              <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0, padding: '8px 14px', fontSize: '13px' }}>
                <Key size={13} />
                Activate
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--status-danger)',
              fontSize: '11px',
              background: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              padding: '6px 10px',
              borderRadius: '6px'
            }}>
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span style={{ lineHeight: '1.4' }}>{error}</span>
            </div>
          )}

          {/* SECURITY MEASURE: Only display developer test activation keys in development mode.
              Production builds will completely strip and skip rendering this hint. */}
          {isDevMode() && (
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textAlign: 'center', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', padding: '6px 8px', borderRadius: '4px', marginTop: '4px' }}>
              ⚙️ <strong>Development Mode:</strong> You can test using bypass key: <code style={{ fontSize: '10px', padding: '2px 4px', background: 'var(--bg-tertiary)', color: '#fff' }}>{DEV_TEST_KEY}</code>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
