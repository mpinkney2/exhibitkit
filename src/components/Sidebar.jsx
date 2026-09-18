import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, RefreshCw, X } from 'lucide-react';
import MatterProfiles from './MatterProfiles';
import { APP_VERSION } from '../utils/license';
import { PRACTICE_AREAS, getPresetMeta, CUSTOM_TEMPLATE_TOKENS } from '../config/presets';

const SIDEBAR_WIDTH_KEY = 'exhibitkit_sidebar_width_v1';
const SIDEBAR_SECTIONS_KEY = 'exhibitkit_sidebar_sections_v1';
const DEFAULT_SIDEBAR_WIDTH = 240;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 480;

const DEFAULT_SECTIONS = {
  preset: true,
  exhibitId: true,
  year: true,
  description: true,
  custom: true,
};

function loadSidebarWidth() {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const value = Number(raw);
    if (!Number.isFinite(value)) return DEFAULT_SIDEBAR_WIDTH;
    return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, value));
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

function loadSectionState() {
  try {
    const raw = localStorage.getItem(SIDEBAR_SECTIONS_KEY);
    if (!raw) return { ...DEFAULT_SECTIONS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SECTIONS };
    return { ...DEFAULT_SECTIONS, ...parsed };
  } catch {
    return { ...DEFAULT_SECTIONS };
  }
}

function CollapsibleSection({ id, title, open, onToggle, children, style }) {
  return (
    <div className={`sidebar-section ${open ? 'is-open' : 'is-collapsed'}`} style={style}>
      <button
        type="button"
        className="sidebar-section-toggle"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        aria-controls={`sidebar-section-${id}`}
      >
        <span className="sidebar-section-title">{title}</span>
        <ChevronDown
          size={14}
          className={`sidebar-section-chevron ${open ? 'is-open' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div id={`sidebar-section-${id}`} className="sidebar-section-body">
          {children}
        </div>
      )}
    </div>
  );
}

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
  sortMode,
  setSortMode,
  useYearAsNumber,
  setUseYearAsNumber,
  shortenDesc,
  setShortenDesc,
  maxDescLength,
  setMaxDescLength,
  onReset,
  isPro,
  onApplySettings,
  onOpenModal,
  onShowNotification,
  className = '',
  onCloseMobile
}) {
  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth);
  const [sectionsOpen, setSectionsOpen] = useState(loadSectionState);
  const [scrollHints, setScrollHints] = useState({ top: false, bottom: false });
  const dragRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    } catch {
      // ignore quota / private mode
    }
  }, [sidebarWidth]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(sectionsOpen));
    } catch {
      // ignore
    }
  }, [sectionsOpen]);

  const updateScrollHints = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const canScroll = scrollHeight > clientHeight + 2;
    setScrollHints({
      top: canScroll && scrollTop > 4,
      bottom: canScroll && scrollTop + clientHeight < scrollHeight - 4,
    });
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return undefined;
    updateScrollHints();
    el.addEventListener('scroll', updateScrollHints, { passive: true });
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateScrollHints)
      : null;
    resizeObserver?.observe(el);
    window.addEventListener('resize', updateScrollHints);
    return () => {
      el.removeEventListener('scroll', updateScrollHints);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateScrollHints);
    };
  }, [updateScrollHints, sectionsOpen, preset, shortenDesc]);

  useEffect(() => {
    const onMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      const next = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, drag.startWidth + (event.clientX - drag.startX)),
      );
      setSidebarWidth(next);
    };

    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.classList.remove('sidebar-resizing');
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startResize = useCallback((event) => {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.body.classList.add('sidebar-resizing');
  }, [sidebarWidth]);

  const resetSidebarWidth = () => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  };

  const toggleSection = (id) => {
    setSectionsOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activePresetMeta = getPresetMeta(preset);

  const currentSettings = {
    preset,
    prefix,
    startNumber,
    padLength,
    caseStyle,
    cleanDesc,
    customTemplate,
    sortMode,
    useYearAsNumber,
    shortenDesc,
    maxDescLength,
  };

  return (
    <div
      className={`sidebar ${className}`}
      style={{
        '--sidebar-width': `${sidebarWidth}px`,
        width: sidebarWidth,
        minWidth: sidebarWidth,
        maxWidth: sidebarWidth,
      }}
    >
      <div
        className="sidebar-resizer"
        onMouseDown={startResize}
        onDoubleClick={resetSidebarWidth}
        title="Drag to resize sidebar · Double-click to reset"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize settings sidebar"
      />
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

      <div
        className={[
          'sidebar-content-shell',
          scrollHints.top ? 'has-scroll-top' : '',
          scrollHints.bottom ? 'has-scroll-bottom' : '',
        ].filter(Boolean).join(' ')}
      >
        <div className="sidebar-content" ref={contentRef}>
          <CollapsibleSection
            id="preset"
            title="Renaming Preset"
            open={sectionsOpen.preset}
            onToggle={toggleSection}
          >
            {PRACTICE_AREAS.map((area) => (
              <div key={area.id} className="preset-practice-area">
                <div className="preset-practice-header">
                  <span className="preset-practice-label">{area.label}</span>
                  <span className="preset-practice-desc">{area.description}</span>
                </div>
                <div className="preset-selector preset-selector-stacked">
                  {area.presets.map((presetOption) => {
                    const isActive = preset === presetOption.id;
                    return (
                      <button
                        key={presetOption.id}
                        type="button"
                        className={`preset-card ${isActive ? 'active' : ''}`}
                        onClick={() => setPreset(presetOption.id)}
                        aria-pressed={isActive}
                      >
                        <span className="preset-card-title">{presetOption.label}</span>
                        <span className="preset-card-desc">{presetOption.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            id="exhibitId"
            title="Exhibit ID Settings"
            open={sectionsOpen.exhibitId}
            onToggle={toggleSection}
          >
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
          </CollapsibleSection>

          <CollapsibleSection
            id="year"
            title="Title Year Detection"
            open={sectionsOpen.year}
            onToggle={toggleSection}
          >
            <div className="form-group">
              <label className="form-label">Sort Batch By</label>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
              >
                <option value="filename">Filename (A–Z)</option>
                <option value="year">Year in title (oldest first)</option>
              </select>
            </div>

            <div className="switch-container">
              <span className="switch-label">Use year as exhibit ID</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={useYearAsNumber}
                  onChange={(e) => setUseYearAsNumber(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '-4px', lineHeight: 1.4 }}>
              When a 19xx/20xx year already appears in the title, sort by that year and optionally rename with it as the exhibit number (e.g. PX2019 …).
            </span>
          </CollapsibleSection>

          <CollapsibleSection
            id="description"
            title="Description Styling"
            open={sectionsOpen.description}
            onToggle={toggleSection}
          >
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

            <div className="switch-container" style={{ marginTop: '12px' }}>
              <span className="switch-label">Shorten titles</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={shortenDesc}
                  onChange={(e) => setShortenDesc(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '-4px', lineHeight: 1.4 }}>
              Trim long descriptions at a word boundary for cleaner OnCue / TrialDirector names.
            </span>

            {shortenDesc && (
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">Max title length</label>
                <input
                  type="number"
                  min="12"
                  max="120"
                  value={maxDescLength}
                  onChange={(e) => setMaxDescLength(Math.max(12, Math.min(120, parseInt(e.target.value, 10) || 48)))}
                />
              </div>
            )}
          </CollapsibleSection>

          {preset === 'custom' && (
            <CollapsibleSection
              id="custom"
              title="Custom Pattern"
              open={sectionsOpen.custom}
              onToggle={toggleSection}
              style={{ animation: 'slideIn 0.2s ease' }}
            >
              <div className="form-group">
                <label className="form-label">Template String</label>
                <input
                  type="text"
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  placeholder="{Prefix}{Number} - {Description}"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                  Variables:{' '}
                  {CUSTOM_TEMPLATE_TOKENS.map((token) => (
                    <code key={token} style={{ fontSize: '10px', marginRight: '4px' }}>{token}</code>
                  ))}
                </span>
              </div>
            </CollapsibleSection>
          )}

          <MatterProfiles
            isPro={isPro}
            currentSettings={currentSettings}
            onApplySettings={onApplySettings}
            onShowNotification={onShowNotification}
          />

          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            {activePresetMeta?.guideline && (
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
                <strong>{activePresetMeta.label}:</strong>{' '}
                {activePresetMeta.guideline}
                {activePresetMeta.example && (
                  <>
                    {' '}
                    e.g.{' '}
                    <code style={{ fontSize: '10px', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {activePresetMeta.example}
                    </code>
                  </>
                )}
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
    </div>
  );
}
