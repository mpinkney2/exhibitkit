import React from 'react';
import { Shield, HardDrive, ShieldCheck, Zap, ArrowRight, RefreshCcw, Sun, Moon } from 'lucide-react';
import { hasTrialAvailable } from '../utils/license';

export default function LandingPage({ onLaunchDemo, onLaunchTrial, onOpenPricing, theme, onToggleTheme }) {
  const trialAvailable = hasTrialAvailable();

  return (
    <div className="landing-container" style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: '100vh',
      backgroundColor: 'var(--color-surface-0)',
      overflowY: 'auto',
      padding: '40px 24px',
      alignItems: 'center',
      fontFamily: 'var(--font-sans)',
      position: 'relative'
    }}>
      {/* Main Container */}
      <div style={{
        maxWidth: '1000px',
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
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: 'var(--color-text-primary)'
            }}>
              ⚖
            </div>
            <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
              ExhibitKIT
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px', 
              fontSize: '11px', 
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              background: 'var(--color-surface-1)'
            }}>
              <ShieldCheck size={12} style={{ color: 'var(--color-success)' }} />
              No Cloud Uploads
            </span>
            
            <button 
              id="btn-quick-demo"
              className="btn btn-secondary" 
              style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--color-border)' }} 
              onClick={() => onLaunchDemo()}
            >
              See It in Action
            </button>

            <button 
              id="btn-theme-toggle"
              style={{ 
                cursor: 'pointer', 
                border: '1px solid var(--color-border)', 
                background: 'var(--color-surface-1)', 
                color: 'var(--color-text-primary)', 
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
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-1)',
            borderRadius: '16px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: '500',
            color: 'var(--color-text-secondary)'
          }}>
            <span style={{ color: 'var(--color-accent)' }}>⚖</span>
            Trusted by Litigation Support Professionals
          </div>

          <h1 style={{
            fontSize: '42px',
            fontWeight: '700',
            lineHeight: '1.2',
            letterSpacing: '-1px',
            color: 'var(--color-text-primary)',
            margin: 0
          }}>
            Prepare Legal Exhibits for OnCue and TrialDirector in Minutes
          </h1>

          <p style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: 'var(--color-text-secondary)',
            margin: '0 auto',
            maxWidth: '640px'
          }}>
            ExhibitKIT helps litigation teams standardize exhibit filenames, preview conflicts, export audit logs, and prepare courtroom-ready batches without uploading client documents.
          </p>

          {/* Core CTAs */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '12px',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button 
              id="btn-launch-demo"
              className="btn btn-primary" 
              onClick={() => onLaunchDemo()}
              style={{ 
                padding: '12px 24px', 
                fontSize: '14.5px', 
                fontWeight: '600',
                backgroundColor: 'var(--color-accent)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px'
              }}
            >
              Launch Demo Mode
              <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </button>

            {trialAvailable ? (
              <button 
                id="btn-try-trial"
                className="btn btn-secondary" 
                onClick={() => onLaunchTrial()}
                style={{ 
                  padding: '12px 24px', 
                  fontSize: '14.5px', 
                  fontWeight: '600', 
                  backgroundColor: 'var(--color-surface-1)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: '6px'
                }}
              >
                Try It Free
              </button>
            ) : (
              <button 
                id="btn-try-trial-disabled"
                className="btn btn-secondary" 
                disabled
                style={{ 
                  padding: '12px 24px', 
                  fontSize: '14.5px', 
                  fontWeight: '600', 
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                  borderRadius: '6px',
                  cursor: 'not-allowed',
                  opacity: 0.6
                }}
                title="Your free trial batch has been used"
              >
                Trial Consumed
              </button>
            )}

            <button 
              id="btn-upgrade-pro-hero"
              onClick={onOpenPricing}
              style={{ 
                padding: '12px 18px', 
                fontSize: '14.5px', 
                fontWeight: '600',
                color: 'var(--color-accent)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Upgrade to Pro
            </button>
          </div>

          <div style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '8px'
          }}>
            <Shield size={14} style={{ color: 'var(--color-success)' }} />
            <span>Confidential Local-First Processing. Your documents never leave this computer.</span>
          </div>
        </div>

        {/* Cinematic App Preview Frame */}
        <div style={{
          overflow: 'hidden',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
          marginTop: '12px',
          backgroundColor: 'var(--color-surface-1)'
        }}>
          {/* OS Window Chrome Title Bar in Navy (#1B2A4A) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            height: '40px',
            background: '#1B2A4A',
            borderBottom: '1px solid var(--color-border)',
            padding: '0 16px',
            gap: '12px',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', opacity: 0.8 }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24', opacity: 0.8 }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', opacity: 0.8 }}></div>
            </div>
            
            <div style={{ 
              fontSize: '11px', 
              color: '#94A3B8', 
              fontFamily: 'var(--font-mono)', 
              background: 'rgba(255, 255, 255, 0.08)', 
              padding: '4px 20px', 
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              letterSpacing: '0.5px'
            }}>
              exhibitkit.local/workspace
            </div>

            <div style={{ width: '48px' }}></div>
          </div>

          {/* App Preview Body Mockup */}
          <div style={{
            display: 'flex',
            height: '340px',
            background: 'var(--color-surface-0)',
            overflow: 'hidden'
          }}>
            {/* Sidebar Mockup */}
            <div style={{
              width: '180px',
              borderRight: '1px solid var(--color-border)',
              background: 'var(--color-surface-1)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  background: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: '#fff'
                }}>
                  ⚖
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)' }}>ExhibitKIT</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Presets</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '10.5px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '6px', borderRadius: '4px', color: 'var(--color-text-primary)', fontWeight: '600' }}>TrialDirector</div>
                  <div style={{ fontSize: '10.5px', background: 'transparent', border: '1px solid var(--color-border)', padding: '6px', borderRadius: '4px', color: 'var(--color-text-secondary)' }}>OnCue</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prefix</span>
                <div style={{ fontSize: '11px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '6px 10px', borderRadius: '6px', color: 'var(--color-text-primary)', fontWeight: '500' }}>PX</div>
              </div>
            </div>

            {/* Main Panel Mockup */}
            <div style={{
              flex: 1,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              overflow: 'hidden'
            }}>
              {/* Top info bar mockup */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  Exhibits Workspace 
                  <span style={{ 
                    fontSize: '9px', 
                    color: 'var(--color-accent)', 
                    background: 'rgba(37, 99, 235, 0.08)', 
                    border: '1px solid rgba(37, 99, 235, 0.15)',
                    padding: '2px 6px', 
                    borderRadius: '10px', 
                    fontWeight: '500', 
                    marginLeft: '6px' 
                  }}>
                    Demo
                  </span>
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>🔒 Secure Offline</span>
              </div>

              {/* Stats Bar mockup - Single row dot separated */}
              <div style={{ 
                background: 'var(--color-surface-2)', 
                border: '1px solid var(--color-border)', 
                borderRadius: '8px', 
                padding: '8px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                fontWeight: '500'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: '700' }}>12</span>
                  <span>Ingested</span>
                </div>
                <span style={{ color: 'var(--color-border)' }}>•</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: '700' }}>12</span>
                  <span>Ready</span>
                </div>
                <span style={{ color: 'var(--color-border)' }}>•</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: '700' }}>0</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>Conflicts</span>
                </div>
              </div>

              {/* Spreadsheet table mockup */}
              <div style={{ 
                flex: 1, 
                border: '1px solid var(--color-border)', 
                borderRadius: '8px', 
                background: 'var(--color-surface-1)', 
                overflow: 'hidden' 
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Original Filename</th>
                      <th style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Proposed Courtroom Name</th>
                      <th style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', fontSize: '10.5px' }}>04 - Jones Photo.pdf</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: '600' }}>PX-004 - Jones Photo.pdf</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ 
                          color: 'var(--color-success)', 
                          background: 'rgba(5, 150, 105, 0.08)', 
                          border: '1px solid rgba(5, 150, 105, 0.15)', 
                          borderRadius: '4px', 
                          padding: '2px 6px', 
                          fontSize: '9px', 
                          fontWeight: '600' 
                        }}>
                          VALID
                        </span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', fontSize: '10.5px' }}>Smith Draft Contract.pdf</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: '600' }}>PX-005 - Smith Draft Contract.pdf</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ 
                          color: 'var(--color-success)', 
                          background: 'rgba(5, 150, 105, 0.08)', 
                          border: '1px solid rgba(5, 150, 105, 0.15)', 
                          borderRadius: '4px', 
                          padding: '2px 6px', 
                          fontSize: '9px', 
                          fontWeight: '600' 
                        }}>
                          VALID
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', fontSize: '10.5px' }}>Invoice 1892.pdf</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: '600' }}>PX-006 - Invoice 1892.pdf</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ 
                          color: 'var(--color-success)', 
                          background: 'rgba(5, 150, 105, 0.08)', 
                          border: '1px solid rgba(5, 150, 105, 0.15)', 
                          borderRadius: '4px', 
                          padding: '2px 6px', 
                          fontSize: '9px', 
                          fontWeight: '600' 
                        }}>
                          VALID
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid: How it Works, etc */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          marginTop: '20px',
          width: '100%'
        }}>
          <div className="glass-panel" style={{ 
            backgroundColor: 'var(--color-surface-1)', 
            border: '1px solid var(--color-border)', 
            borderRadius: '8px', 
            boxShadow: 'var(--shadow-card)',
            padding: '28px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '6px',
              background: 'rgba(37, 99, 235, 0.08)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <HardDrive size={18} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0 }}>Why Local-First Matters</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: '1.6', margin: 0 }}>
              Unlike cloud services that require uploading client records, ExhibitKIT processes all renaming logic, file indexing, and folder transfers inside your browser locally. Completely offline-safe and client-confidential.
            </p>
          </div>

          <div className="glass-panel" style={{ 
            backgroundColor: 'var(--color-surface-1)', 
            border: '1px solid var(--color-border)', 
            borderRadius: '8px', 
            boxShadow: 'var(--shadow-card)',
            padding: '28px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '6px',
              background: 'rgba(37, 99, 235, 0.08)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={18} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0 }}>How It Works</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: '1.6', margin: 0 }}>
              Ingest PDF exhibits directly from a local folder, automatically isolate document names and exhibit numbers, auto-sequence starting ranges, preview and fix duplication conflicts, and rename the directories in-place.
            </p>
          </div>

          <div className="glass-panel" style={{ 
            backgroundColor: 'var(--color-surface-1)', 
            border: '1px solid var(--color-border)', 
            borderRadius: '8px', 
            boxShadow: 'var(--shadow-card)',
            padding: '28px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '6px',
              background: 'rgba(37, 99, 235, 0.08)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RefreshCcw size={18} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0 }}>Who It Is For</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: '1.6', margin: 0 }}>
              Engineered specifically for hot-seat operators, paralegals, litigation support teams, and legal counsel preparing document databases for OnCue and TrialDirector systems.
            </p>
          </div>
        </div>

        {/* Pricing/Mode Section - Centered Clean Card */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          width: '100%',
          marginTop: '20px'
        }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
              Simple, Transparent Pricing
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
              Evaluate ExhibitKIT with sample exhibit data at no cost, or purchase a Pro license.
            </p>
          </div>

          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-modal)',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            textAlign: 'center'
          }}>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: '700', 
              textTransform: 'uppercase', 
              letterSpacing: '1.5px', 
              color: 'var(--color-accent)',
              background: 'rgba(37, 99, 235, 0.08)',
              padding: '4px 10px',
              borderRadius: '4px'
            }}>
              Pro Lifetime License
            </span>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '48px', fontWeight: '800', color: 'var(--color-text-primary)', letterSpacing: '-1.5px' }}>$150</span>
              <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>USD / one-time</span>
            </div>
            
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: '1.6', margin: 0 }}>
              No recurring fees, seat limits, or subscriptions. Pay once and run ExhibitKIT locally on your workstation forever. Includes all lifetime updates.
            </p>

            {/* Value propositions list */}
            <div style={{
              alignSelf: 'stretch',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontSize: '13.5px',
              color: 'var(--color-text-primary)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓</span>
                <span>Direct in-place local folder exhibit renaming</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓</span>
                <span>Unlimited PDF exhibits and batches (no file limit)</span>
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
                <span>100% offline-ready (Your client records remain confidential)</span>
              </div>
            </div>

            <div style={{ width: '100%', height: '1px', background: 'var(--color-border)' }}></div>

            <button 
              id="btn-purchase-pro-pricing"
              className="btn btn-primary" 
              onClick={onOpenPricing} 
              style={{ 
                width: '100%', 
                padding: '12px 18px',
                backgroundColor: 'var(--color-accent)',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '14.5px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Purchase License
            </button>
          </div>
        </div>

        {/* Footer contact info */}
        <div style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          borderTop: '1px solid var(--color-border)',
          paddingTop: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          marginTop: '20px'
        }}>
          <p style={{ margin: 0 }}>
            ExhibitKIT is a standalone desktop litigation support tool published by <strong>PatentPreppers</strong>.
          </p>
          <p style={{ margin: 0 }}>
            Contact support team at <a href="mailto:support@patentpreppers.com" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>support@patentpreppers.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
