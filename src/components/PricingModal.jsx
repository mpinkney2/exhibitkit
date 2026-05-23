import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Zap, Sparkles, X, Key, AlertCircle } from 'lucide-react';

export default function PricingModal({ isOpen, onClose, onActivate, stripeLink = "https://buy.stripe.com/cNicN59My1tC6VN0ayg7e00" }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleActivateSubmit = (e) => {
    e.preventDefault();
    const cleanKey = licenseKey.trim().toUpperCase();

    // Developer test key: PATENTPREPPERS-EXHIBITKIT-PRO
    if (cleanKey === 'PATENTPREPPERS-EXHIBITKIT-PRO' || cleanKey.startsWith('EKIT-')) {
      onActivate(cleanKey);
      setError('');
      setLicenseKey('');
    } else {
      setError('❌ Invalid license key. Please check your purchase email or try the developer key: PATENTPREPPERS-EXHIBITKIT-PRO');
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
      zIndex: 1000,
      animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div className="glass-panel" style={{
        width: '520px',
        maxWidth: '90%',
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
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
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
            background: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--accent-primary)',
            margin: '0 auto 8px auto'
          }}>
            <Sparkles size={24} />
          </div>
          
          <h2 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>
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
            <span style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)' }}>$150</span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>USD / one-time</span>
          </div>

          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.5' }}>
            Get lifetime access to the full ExhibitKIT desktop-grade toolset. Rename files directly on your local system, export import logs, and speed up trial preparation.
          </p>

          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.06)' }}></div>

          {/* Benefits list */}
          <div style={{
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '13px',
            color: 'var(--text-primary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={16} color="var(--status-success)" />
              <span>Direct local in-place directory folder renaming</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Zap size={16} color="var(--status-success)" />
              <span>Unlimited PDF exhibits and batches</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Zap size={16} color="var(--status-success)" />
              <span>CSV metadata mapping logs for TrialDirector & OnCue</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={16} color="var(--status-success)" />
              <span>Persistent activation & lifetime updates</span>
            </div>
          </div>
        </div>

        {/* Action Button redirected to Stripe */}
        <a 
          href={stripeLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ 
            textDecoration: 'none', 
            padding: '14px 20px', 
            fontSize: '15px', 
            fontWeight: '600',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
          }}
        >
          <CreditCard size={18} />
          Purchase via Stripe Checkout
        </a>

        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
          🔒 Payments are securely processed via Stripe. Fully compliant with all banking standards.
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Or Activate License</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
        </div>

        {/* License Key Form */}
        <form onSubmit={handleActivateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">License Key</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={licenseKey} 
                onChange={(e) => setLicenseKey(e.target.value)} 
                placeholder="e.g. EKIT-XXXX-XXXX-XXXX"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0 }}>
                <Key size={14} />
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
              fontSize: '11.5px',
              background: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              padding: '8px 12px',
              borderRadius: '6px'
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
            💡 Developer test key: <code style={{ fontSize: '9.5px', padding: '2px 4px', background: 'var(--bg-tertiary)', color: '#fff' }}>PATENTPREPPERS-EXHIBITKIT-PRO</code>
          </div>
        </form>
      </div>
    </div>
  );
}
