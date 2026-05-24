import React from 'react';
import { Sparkles, Shield, HardDrive, ShieldCheck, Zap, ArrowRight, RefreshCcw, HelpCircle, Sun, Moon } from 'lucide-react';
import { hasTrialAvailable } from '../utils/license';

export default function LandingPage({ onLaunchDemo, onLaunchTrial, onOpenPricing, theme, onToggleTheme }) {
  const trialAvailable = hasTrialAvailable();

  return (
    <div className="landing-container" style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.05) 0%, transparent 50%), radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.03) 0%, transparent 40%)',
      overflowY: 'auto',
      padding: '40px 24px',
      alignItems: 'center'
    }}>
      {/* Glow Orbs */}
      <div className="glow-orb-1"></div>
      <div className="glow-orb-2"></div>

      {/* Main Container */}
      <div style={{
        maxWidth: '1040px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '64px',
        margin: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          paddingBottom: '20px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(99, 102, 241, 0.3)'
              }}>
                <ShieldCheck size={18} color="#fff" />
              </div>
              <span style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px' }}>ExhibitKIT</span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', paddingLeft: '48px', marginTop: '-4px', fontWeight: '500', letterSpacing: '0.2px' }}>A product of PatentPreppers</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '11px' }}>
              🔒 CONFIDENTIAL LOCAL MODE
            </span>
            
            <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => onLaunchDemo()}>
              Quick Demo
            </button>

            <button 
              className="badge" 
              style={{ 
                cursor: 'pointer', 
                border: 'none', 
                background: 'rgba(255, 255, 255, 0.08)', 
                color: 'var(--text-primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '8px',
                borderRadius: '6px'
              }}
              onClick={onToggleTheme}
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          maxWidth: '820px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '20px',
            padding: '6px 16px',
            fontSize: '12.5px',
            fontWeight: '500',
            color: '#a5b4fc'
          }}>
            <Sparkles size={12} />
            Courtroom-Ready Legal Exhibit Preparation
          </div>

          <h1 style={{
            fontSize: '44px',
            fontWeight: '800',
            lineHeight: '1.15',
            letterSpacing: '-1.5px',
            background: 'linear-gradient(135deg, #ffffff 40%, #c7d2fe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            Prepare Legal Exhibits for OnCue and TrialDirector in Minutes
          </h1>

          <p style={{
            fontSize: '17px',
            lineHeight: '1.6',
            color: 'var(--text-secondary)',
            margin: '0 auto',
            maxWidth: '680px'
          }}>
            ExhibitKIT helps litigation teams standardize exhibit filenames, preview conflicts, export audit logs, and prepare courtroom-ready batches without uploading client documents.
          </p>

          {/* Core CTAs */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <button 
              className="btn btn-primary" 
              onClick={() => onLaunchDemo()}
              style={{ padding: '14px 28px', fontSize: '15px', fontWeight: '600' }}
            >
              Launch Demo Mode
              <ArrowRight size={16} />
            </button>

            {trialAvailable ? (
              <button 
                className="btn btn-secondary" 
                onClick={() => onLaunchTrial()}
                style={{ padding: '14px 28px', fontSize: '15px', fontWeight: '600', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                Try One Free Batch
              </button>
            ) : (
              <button 
                className="btn btn-secondary" 
                disabled
                style={{ 
                  padding: '14px 28px', 
                  fontSize: '15px', 
                  fontWeight: '600', 
                  opacity: 0.4, 
                  cursor: 'not-allowed',
                  background: 'rgba(255, 255, 255, 0.02)'
                }}
                title="Your free trial batch has been used"
              >
                Trial Consumed
              </button>
            )}

            <button 
              className="btn btn-success" 
              onClick={onOpenPricing}
              style={{ 
                padding: '14px 28px', 
                fontSize: '15px', 
                fontWeight: '600',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.25)',
                border: 'none'
              }}
            >
              Unlock Pro ($150)
            </button>
          </div>

          <div style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px'
          }}>
            <Shield size={14} className="text-success" />
            <span>Confidential Local-First Processing. Your documents never leave this computer.</span>
          </div>
        </div>

        {/* Feature Grid: How it Works, etc */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          marginTop: '20px'
        }}>
          <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <HardDrive size={20} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Why Local-First Matters</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Unlike cloud services that require uploading client records, ExhibitKIT processes all renaming logic, file indexing, and folder transfers inside your browser locally. Completely offline-safe and client-confidential.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--status-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={20} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>How It Works</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Ingest PDF exhibits directly from a local folder, automatically isolate document names and exhibit numbers, auto-sequence starting ranges, preview and fix duplication conflicts, and rename the directories in-place.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.12)',
              color: 'var(--status-warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RefreshCcw size={20} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Who It Is For</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Engineered specifically for hot-seat operators, paralegals, litigation support teams, and legal counsel preparing document databases for OnCue and TrialDirector systems.
            </p>
          </div>
        </div>

        {/* Pricing/Mode Section */}
        <div className="glass-panel" style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '32px',
          padding: '40px',
          alignItems: 'center',
          background: 'rgba(17, 24, 39, 0.55)',
          border: '1px solid rgba(99, 102, 241, 0.15)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>
              Choose Your Operations Tier
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Evaluate ExhibitKIT with sample exhibit data at no cost in Demo Mode, process a critical batch under Trial Mode, or get lifetime Pro access to standard, direct directory-renaming capabilities.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }}></div>
                <span><strong>Demo Mode:</strong> Unlimited testing using courtroom mock datasets. No real local file manipulation.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-secondary)' }}></div>
                <span><strong>One-time Trial:</strong> Ingest and rename a real batch (up to 5 local files) to test live system performance.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-success)' }}></div>
                <span><strong>Pro License ($150):</strong> Direct in-place folder updates, unlimited batches/PDFs, matter profiles, and audit reports.</span>
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(10, 14, 23, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
              Pro Lifetime License
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '38px', fontWeight: '800', color: 'var(--text-primary)' }}>$150</span>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>USD</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              No subscriptions. One-time acquisition for individual professional workstations.
            </p>
            <button className="btn btn-primary" onClick={onOpenPricing} style={{ width: '100%', padding: '12px 18px' }}>
              Purchase License
            </button>
          </div>
        </div>

        {/* Footer contact info */}
        <div style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-muted)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <p>
            ExhibitKIT is a standalone desktop litigation support tool published by <strong>PatentPreppers</strong>.
          </p>
          <p>
            Contact support team at <a href="mailto:support@patentpreppers.com" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>support@patentpreppers.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
