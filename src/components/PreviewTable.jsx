import { Table } from 'lucide-react';

export default function PreviewTable({
  items,
  onUpdateItem,
  onBulkCaseChange,
  onBulkClean,
  onAutoSequence,
  onResolveConflicts
}) {
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

  return (
    <div style={{
      backgroundColor: 'var(--color-surface-1)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      marginBottom: '20px'
    }}>
      {/* Table Action Bar */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-surface-2)'
      }}>
        <div className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
          <Table size={15} style={{ color: 'var(--color-accent)' }} />
          <span>Interactive Renaming Preview Grid</span>
        </div>

        <div className="table-actions" style={{ display: 'flex', alignItems: 'center' }}>
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
                  e.target.value = ""; // Reset dropdown
                }
              }}
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
              <option value="" disabled selected>Bulk Case...</option>
              <option value="title">Title Case</option>
              <option value="upper">UPPERCASE</option>
              <option value="lower">lowercase</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="table-wrapper">
        <table className="exhibit-table">
          <thead>
            <tr>
              <th style={{ width: '90px' }}>Status</th>
              <th>Original Filename</th>
              <th style={{ width: '110px', textAlign: 'center' }}>Exhibit ID</th>
              <th>Document Description</th>
              <th>Proposed Output Filename</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr 
                key={index} 
                className={
                  item.status === 'warning' ? 'has-conflict' : 
                  item.status === 'danger' ? 'has-error' : ''
                }
              >
                <td>{getStatusBadge(item.status, item.message)}</td>
                <td>
                  <div className="original-filename-cell" title={item.originalName}>
                    {item.originalName}
                  </div>
                </td>
                <td>
                  <input 
                    type="text" 
                    className="table-input"
                    value={item.number || ''} 
                    placeholder="e.g. 101"
                    onChange={(e) => onUpdateItem(index, 'number', e.target.value)} 
                    style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    className="table-input"
                    value={item.description || ''} 
                    placeholder="Enter exhibit title/description"
                    title={item.description || "Enter exhibit title/description"}
                    onChange={(e) => onUpdateItem(index, 'description', e.target.value)} 
                  />
                </td>
                <td>
                  <div className={getProposedClass(item.status)} title={item.proposedName}>
                    {item.proposedName}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
