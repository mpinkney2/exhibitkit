import { RefreshCw, X } from 'lucide-react';
import MatterProfiles from './MatterProfiles';
import { APP_VERSION } from '../utils/license';

export default function Sidebar({
  preset,
  setPreset,
  prefix,
  setPrefix,
  startNumber,
  setStartNumber,
  padLength,
  setPadLength,
  caseStyle,
  setCaseStyle,
  customTemplate,
  setCustomTemplate,
  cleanDesc,
  setCleanDesc,
  onReset,
  isPro,
  onApplySettings,
  onOpenModal,
  onShowNotification,
  className = '',
  onCloseMobile
}) {
  const currentSettings = {
    preset,
    prefix,
    startNumber,
    padLength,
    caseStyle,
    cleanDesc,
    customTemplate
  };

  return (
    <div className={`sidebar ${className}`}>
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="sidebar-brand-mark">
            ⚖
          </div>
          <div className="sidebar-brand-copy">
            <span>Patent Preppers™</span>
            <h1>ExhibitKIT</h1>
          </div>
        </div>
        {onCloseMobile && (
          <button 
            onClick={onCloseMobile} 
            className="sidebar-close-button"
            style={{ 
              padding: '6px', 
              color: 'var(--text-secondary)', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close Settings Panel"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="sidebar-content">
        {/* Preset Selection */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Renaming Preset</div>
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--color-surface-2)',
            borderRadius: '6px',
            padding: '2px',
            width: '100%',
            marginBottom: '8px'
          }}>
            {['oncue', 'trialdirector', 'custom'].map((p) => {
              const isActive = preset === p;
              const label = p === 'oncue' ? 'OnCue' : p === 'trialdirector' ? 'TrialDirector' : 'Custom';
              return (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: '12px',
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    backgroundColor: isActive ? 'var(--color-surface-1)' : 'transparent',
                    borderRadius: '4px',
                    border: 'none',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Naming Configuration */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Exhibit ID Settings</div>
          
          <div className="form-group">
            <label className="form-label">Exhibit Prefix</label>
            <input 
              type="text" 
              value={prefix} 
              onChange={(e) => setPrefix(e.target.value)} 
              placeholder="e.g. PX, DX, DEP" 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Start Number</label>
              <input 
                type="number" 
                value={startNumber} 
                onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)} 
                min="1" 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Zero Padding</label>
              <select 
                value={padLength} 
                onChange={(e) => setPadLength(parseInt(e.target.value))}
              >
                <option value={0}>None (1, 2...)</option>
                <option value={2}>2 digits (01)</option>
                <option value={3}>3 digits (001)</option>
                <option value={4}>4 digits (0001)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Description Formatting */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Description Styling</div>
          
          <div className="form-group">
            <label className="form-label">Description Case</label>
            <select 
              value={caseStyle} 
              onChange={(e) => setCaseStyle(e.target.value)}
            >
              <option value="as-is">As Ingested (No Change)</option>
              <option value="title">Title Case (Exhibit Memo)</option>
              <option value="upper">UPPERCASE (EXHIBIT MEMO)</option>
              <option value="lower">lowercase (exhibit memo)</option>
            </select>
          </div>

          <div className="switch-container">
            <span className="switch-label">Clean Ingested Text</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={cleanDesc}
                onChange={(e) => setCleanDesc(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '-4px' }}>
            Automatically removes double spaces, underscores, and special characters from descriptions.
          </span>
        </div>

        {/* Custom Template builder */}
        {preset === 'custom' && (
          <div className="sidebar-section" style={{ animation: 'slideIn 0.2s ease' }}>
            <div className="sidebar-section-title">Custom Pattern</div>
            <div className="form-group">
              <label className="form-label">Template String</label>
              <input 
                type="text" 
                value={customTemplate} 
                onChange={(e) => setCustomTemplate(e.target.value)} 
                placeholder="{Prefix}{Number} - {Description}" 
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                Variables: <code style={{ fontSize: '10px' }}>{"{Prefix}"}</code>, <code style={{ fontSize: '10px' }}>{"{Number}"}</code>, <code style={{ fontSize: '10px' }}>{"{Description}"}</code>
              </span>
            </div>
          </div>
        )}

        {/* Pro Gated Saved Matter Profiles */}
        <MatterProfiles
          isPro={isPro}
          currentSettings={currentSettings}
          onApplySettings={onApplySettings}
          onShowNotification={onShowNotification}
        />

        {/* Reset & Quick Presets Info */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
          {preset === 'oncue' && (
            <div style={{
              background: '#EFF6FF',
              borderLeft: '3px solid #BFDBFE',
              borderRadius: '4px',
              padding: '10px 12px',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5',
              marginBottom: '12px',
              fontFamily: 'var(--font-sans)'
            }}>
              <strong>OnCue Guideline:</strong> Prefers no dashes in the ID, e.g. <code style={{ fontSize: '10px', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>PX001 Memo.pdf</code>.
              The first space separates the ID and Name.
            </div>
          )}
          {preset === 'trialdirector' && (
            <div style={{
              background: '#EFF6FF',
              borderLeft: '3px solid #BFDBFE',
              borderRadius: '4px',
              padding: '10px 12px',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5',
              marginBottom: '12px',
              fontFamily: 'var(--font-sans)'
            }}>
              <strong>TrialDirector Guideline:</strong> Emphasizes leading zero padding (e.g. <code style={{ fontSize: '10px', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>PX-0001 - Memo.pdf</code>) for clean alphabetical sorting.
            </div>
          )}
          
          <button 
            className="btn" 
            onClick={onReset} 
            style={{ 
              width: '100%', 
              marginBottom: '16px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              borderRadius: '6px',
              fontSize: '13px',
              padding: '8px 12px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={12} style={{ marginRight: '6px' }} />
            Reset Naming Rules
          </button>

          {/* Legal / Operational support footer links */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 6px',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            justifyContent: 'center',
            marginBottom: '12px',
            lineHeight: '1.4'
          }}>
            <button onClick={() => onOpenModal('terms')} style={{ padding: 0, fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Terms</button>
            <span>·</span>
            <button onClick={() => onOpenModal('privacy')} style={{ padding: 0, fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Privacy</button>
            <span>·</span>
            <button onClick={() => onOpenModal('support')} style={{ padding: 0, fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Support</button>
            <span>·</span>
            <button onClick={() => onOpenModal('how')} style={{ padding: 0, fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>How to Use</button>
            <span>·</span>
            <button onClick={() => onOpenModal('feedback')} style={{ padding: 0, fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Feedback</button>
          </div>

          {/* Workstation signature / Version tag */}
          <div style={{
            textAlign: 'center',
            fontSize: '10px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            ExhibitKIT {APP_VERSION} | Build: local-first-preview
          </div>
        </div>
      </div>
    </div>
  );
}
