import { useCallback, useEffect, useRef, useState } from 'react';
import { Table } from 'lucide-react';
import BatesModeControl from './BatesModeControl';

const COLUMN_STORAGE_KEY = 'exhibitkit_preview_column_widths_v1';

const DEFAULT_COLUMNS = [
  { id: 'status', label: 'Status', width: 90, minWidth: 70, align: 'left' },
  { id: 'original', label: 'Original Filename', width: 220, minWidth: 120, align: 'left' },
  { id: 'exhibitId', label: 'Exhibit ID', width: 110, minWidth: 80, align: 'center' },
  { id: 'description', label: 'Document Description', width: 240, minWidth: 120, align: 'left' },
  { id: 'proposed', label: 'Proposed Output Filename', width: 260, minWidth: 140, align: 'left' },
];

const OUTLINE_COLUMNS = [
  { id: 'status', label: 'Status', width: 90, minWidth: 70, align: 'left' },
  { id: 'order', label: 'Order', width: 72, minWidth: 56, align: 'center' },
  { id: 'original', label: 'Original Filename', width: 210, minWidth: 120, align: 'left' },
  { id: 'official', label: 'Official no.', width: 120, minWidth: 88, align: 'left' },
  { id: 'designation', label: 'Designation', width: 120, minWidth: 88, align: 'left' },
  { id: 'type', label: 'Type', width: 150, minWidth: 110, align: 'left' },
  { id: 'description', label: 'Document Description', width: 200, minWidth: 120, align: 'left' },
  { id: 'proposed', label: 'Proposed Output Filename', width: 240, minWidth: 140, align: 'left' },
];

function loadSavedWidths() {
  try {
    const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildInitialColumns(showOutline) {
  const saved = loadSavedWidths();
  const defs = showOutline ? OUTLINE_COLUMNS : DEFAULT_COLUMNS;
  return defs.map((col) => {
    const savedWidth = saved?.[col.id];
    const width = typeof savedWidth === 'number' ? savedWidth : col.width;
    return { ...col, width: Math.max(col.minWidth, width) };
  });
}

export default function PreviewTable({
  items,
  onUpdateItem,
  onBulkCaseChange,
  onBulkClean,
  onAutoSequence,
  onResolveConflicts,
  batesMode = 'sequential',
  onBatesModeChange,
  batesSettingDisabled = false,
  showOutline = false,
}) {
  const [columns, setColumns] = useState(() => buildInitialColumns(showOutline));
  const [outlineLayout, setOutlineLayout] = useState(showOutline);
  if (showOutline !== outlineLayout) {
    setOutlineLayout(showOutline);
    setColumns(buildInitialColumns(showOutline));
  }
  const dragRef = useRef(null);

  useEffect(() => {
    const payload = Object.fromEntries(columns.map((c) => [c.id, c.width]));
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota / private mode
    }
  }, [columns]);

  useEffect(() => {
    const onMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = event.clientX - drag.startX;
      const nextWidth = Math.max(drag.minWidth, drag.startWidth + delta);
      setColumns((prev) =>
        prev.map((col, idx) => (idx === drag.index ? { ...col, width: nextWidth } : col))
      );
    };

    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startResize = useCallback((event, index) => {
    event.preventDefault();
    event.stopPropagation();
    const col = columns[index];
    dragRef.current = {
      index,
      startX: event.clientX,
      startWidth: col.width,
      minWidth: col.minWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columns]);

  const resetColumnWidths = () => {
    const defs = showOutline ? OUTLINE_COLUMNS : DEFAULT_COLUMNS;
    setColumns(defs.map((col) => ({ ...col })));
  };

  const getStatusBadge = (status, message) => {
    switch (status) {
      case 'success':
        return (
          <span
            style={{
              display: 'inline-flex',
              padding: '2px 10px',
              fontSize: '11px',
              fontWeight: '500',
              color: '#15803D',
              backgroundColor: '#DCFCE7',
              borderRadius: '20px',
              fontFamily: 'var(--font-sans)'
            }}
            title={message}
          >
            Valid
          </span>
        );
      case 'warning':
        return (
          <span
            style={{
              display: 'inline-flex',
              padding: '2px 10px',
              fontSize: '11px',
              fontWeight: '500',
              color: '#D97706',
              backgroundColor: '#FEF3C7',
              borderRadius: '20px',
              fontFamily: 'var(--font-sans)'
            }}
            title={message}
          >
            Conflict
          </span>
        );
      case 'danger':
        return (
          <span
            style={{
              display: 'inline-flex',
              padding: '2px 10px',
              fontSize: '11px',
              fontWeight: '500',
              color: '#DC2626',
              backgroundColor: '#FEE2E2',
              borderRadius: '20px',
              fontFamily: 'var(--font-sans)'
            }}
            title={message}
          >
            Error
          </span>
        );
      default:
        return null;
    }
  };

  const getProposedClass = (status) => {
    switch (status) {
      case 'success': return 'proposed-filename-cell success';
      case 'warning': return 'proposed-filename-cell warning';
      case 'danger': return 'proposed-filename-cell danger';
      default: return 'proposed-filename-cell';
    }
  };

  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);

  const renderCell = (columnId, item, index) => {
    const editKey = item.id || index;
    switch (columnId) {
      case 'status':
        return getStatusBadge(item.status, item.message);
      case 'order':
        return (
          <span title={(item.outlineReferences || []).join(' | ') || undefined}>
            {item.outlineOrder || '—'}
          </span>
        );
      case 'original':
        return (
          <div className="original-filename-cell" title={item.originalName}>
            {item.bates ? <span className="badge-bates">Bates</span> : null}
            {item.originalName}
          </div>
        );
      case 'official':
        return (
          <span title={item.officialExhibitNo || 'No exhibit number on this filename'} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            {item.officialExhibitNo || '—'}
          </span>
        );
      case 'designation':
        return (
          <input
            type="text"
            className="table-input"
            value={item.designation || ''}
            placeholder="Page or page:line"
            aria-label={`Designation for ${item.originalName}`}
            onChange={(event) => onUpdateItem(editKey, 'designation', event.target.value)}
          />
        );
      case 'type':
        return (
          <select
            className="table-input"
            value={item.mediaKind || 'exhibit'}
            aria-label={`Type for ${item.originalName}`}
            onChange={(event) => onUpdateItem(editKey, 'mediaKind', event.target.value)}
          >
            <option value="exhibit">Exhibit</option>
            <option value="video">Video (V)</option>
            <option value="demonstrative">Demonstrative (D)</option>
          </select>
        );
      case 'exhibitId':
        return (
          <input
            type="text"
            className="table-input"
            value={item.number || ''}
            placeholder="e.g. 101"
            onChange={(event) => onUpdateItem(editKey, 'number', event.target.value)}
            style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}
          />
        );
      case 'description':
        return (
          <input
            type="text"
            className="table-input"
            value={item.description || ''}
            placeholder="Enter exhibit title/description"
            title={item.description || 'Enter exhibit title/description'}
            onChange={(event) => onUpdateItem(editKey, 'description', event.target.value)}
          />
        );
      case 'proposed':
        return (
          <div className={getProposedClass(item.status)} title={item.proposedName}>
            {item.proposedName}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--color-surface-1)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 320,
      marginBottom: '20px'
    }}>
      {/* Table Action Bar */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        background: 'var(--color-surface-2)'
      }}>
        <div className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
          <Table size={15} style={{ color: 'var(--color-accent)' }} />
          <span>Interactive Renaming Preview Grid</span>
        </div>

        <div className="table-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {items.some((item) => item.bates) && onBatesModeChange && (
            <BatesModeControl
              mode={batesMode}
              onChange={onBatesModeChange}
              disabled={batesSettingDisabled}
              name="bates-mode-review"
            />
          )}
          <button
            type="button"
            onClick={resetColumnWidths}
            title="Reset column widths to defaults"
            className="toolbar-btn"
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              fontFamily: 'var(--font-sans)',
              fontWeight: '500',
              color: 'var(--color-text-muted)',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Reset columns
          </button>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'var(--color-surface-1)' }}>
            <button
              onClick={onAutoSequence}
              title="Re-sequence exhibit numbers based on starting index"
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                fontWeight: '500',
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: 'none',
                borderRight: '1px solid var(--color-border)',
                cursor: 'pointer',
                borderRadius: 0
              }}
              className="toolbar-btn"
            >
              Auto-Sequence
            </button>
            <button
              onClick={onResolveConflicts}
              title="Automatically resolve duplicate filename conflicts"
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                fontWeight: '500',
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: 'none',
                borderRight: '1px solid var(--color-border)',
                cursor: 'pointer',
                borderRadius: 0
              }}
              className="toolbar-btn"
            >
              Fix Conflicts
            </button>
            <button
              onClick={onBulkClean}
              title="Clean text descriptions on all files"
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                fontWeight: '500',
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: 'none',
                borderRight: '1px solid var(--color-border)',
                cursor: 'pointer',
                borderRadius: 0
              }}
              className="toolbar-btn"
            >
              Clean Text
            </button>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onBulkCaseChange(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: 'none',
                borderRadius: 0,
                cursor: 'pointer',
                width: 'auto'
              }}
            >
              <option value="" disabled>Bulk Case...</option>
              <option value="title">Title Case</option>
              <option value="upper">UPPERCASE</option>
              <option value="lower">lowercase</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="table-wrapper">
        <table className="exhibit-table exhibit-table--resizable" style={{ width: tableWidth, minWidth: '100%' }}>
          <colgroup>
            {columns.map((col) => (
              <col key={col.id} style={{ width: col.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th
                  key={col.id}
                  className={col.id === 'proposed' ? 'exhibit-th-proposed' : undefined}
                  style={{ width: col.width, textAlign: col.align || 'left' }}
                  aria-colindex={index + 1}
                >
                  <div className="exhibit-th-content">
                    <span className="exhibit-th-label">{col.label}</span>
                    <span
                      className="exhibit-col-resizer"
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${col.label} column`}
                      title="Drag to resize column"
                      onMouseDown={(event) => startResize(event, index)}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.id || `${item.originalName}-${index}`}
                className={
                  item.status === 'warning' ? 'has-conflict' :
                  item.status === 'danger' ? 'has-error' : ''
                }
              >
                {columns.map((col) => (
                  <td key={col.id} style={{ textAlign: col.align || 'left' }}>
                    {renderCell(col.id, item, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
