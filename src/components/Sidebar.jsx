import React from 'react';
import { Settings, RefreshCw, FileText, ToggleLeft, HelpCircle } from 'lucide-react';

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
  onReset
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <FileText size={20} color="#fff" />
        </div>
        <h1 className="sidebar-title">ExhibitKIT</h1>
      </div>

      <div className="sidebar-content">
        {/* Preset Selection */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Renaming Preset</div>
          <div className="preset-selector">
            <div 
              className={`preset-card ${preset === 'oncue' ? 'active' : ''}`}
              onClick={() => setPreset('oncue')}
            >
              <span className="preset-card-title">OnCue</span>
              <span className="preset-card-desc">PX101 Memo</span>
            </div>
            
            <div 
              className={`preset-card ${preset === 'trialdirector' ? 'active' : ''}`}
              onClick={() => setPreset('trialdirector')}
            >
              <span className="preset-card-title">TrialDirector</span>
              <span className="preset-card-desc">PX-101 Memo</span>
            </div>
            
            <div 
              className={`preset-card ${preset === 'custom' ? 'active' : ''}`}
              onClick={() => setPreset('custom')}
            >
              <span className="preset-card-title">Custom</span>
              <span className="preset-card-desc">Template</span>
            </div>
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

        {/* Reset & Quick Presets Info */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {preset === 'oncue' && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
              lineHeight: '1.4',
              marginBottom: '16px'
            }}>
              <strong>OnCue Guideline:</strong> Prefers no dashes in the ID, e.g. <code style={{ fontSize: '10px', color: '#fff' }}>PX001 Memo.pdf</code>.
              The first space separates the ID and Name.
            </div>
          )}
          {preset === 'trialdirector' && (
            <div style={{
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid rgba(139, 92, 246, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
              lineHeight: '1.4',
              marginBottom: '16px'
            }}>
              <strong>TrialDirector Guideline:</strong> Emphasizes leading zero padding (e.g. <code style={{ fontSize: '10px', color: '#fff' }}>PX-0001 - Memo.pdf</code>) for clean alphabetical sorting.
            </div>
          )}
          
          <button className="btn btn-secondary" onClick={onReset} style={{ width: '100%' }}>
            <RefreshCw size={14} />
            Reset Naming Rules
          </button>
        </div>
      </div>
    </div>
  );
}
