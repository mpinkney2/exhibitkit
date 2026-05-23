import React from 'react';
import { Table, Wand2, Type, RefreshCcw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

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
          <span className="badge badge-success" title={message}>
            <CheckCircle size={10} /> Valid
          </span>
        );
      case 'warning':
        return (
          <span className="badge badge-warning" title={message}>
            <AlertTriangle size={10} /> Conflict
          </span>
        );
      case 'danger':
        return (
          <span className="badge badge-danger" title={message}>
            <XCircle size={10} /> Error
          </span>
        );
      default:
        return null;
    }
  };

  const getProposedClass = (status) => {
    switch (status) {
      case 'success': return 'cell-proposed success';
      case 'warning': return 'cell-proposed warning';
      case 'danger': return 'cell-proposed danger';
      default: return 'cell-proposed';
    }
  };

  return (
    <div className="glass-panel table-panel">
      {/* Table Action Bar */}
      <div className="table-header-bar">
        <div className="table-title">
          <Table size={16} color="var(--accent-primary)" />
          <span>Interactive Renaming Preview Grid</span>
        </div>

        <div className="table-actions">
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={onAutoSequence}
            title="Re-sequence exhibit numbers based on starting index"
          >
            <RefreshCcw size={12} />
            Auto-Sequence
          </button>
          
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={onResolveConflicts}
            title="Automatically resolve duplicate filename conflicts"
          >
            <Wand2 size={12} />
            Fix Conflicts
          </button>

          <div style={{ height: '16px', width: '1px', background: 'var(--border-color)' }}></div>

          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={onBulkClean}
            title="Clean text descriptions on all files"
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
            style={{ padding: '5px 10px', fontSize: '12px', width: 'auto', background: 'rgba(255,255,255,0.03)' }}
            defaultValue=""
          >
            <option value="" disabled>Bulk Case...</option>
            <option value="title">Title Case</option>
            <option value="upper">UPPERCASE</option>
            <option value="lower">lowercase</option>
          </select>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="table-wrapper">
        <table className="exhibit-table">
          <thead>
            <tr>
              <th style={{ width: '90px' }}>Status</th>
              <th>Original Filename</th>
              <th style={{ width: '110px' }}>Exhibit ID</th>
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
                  <div className="cell-original" title={item.originalName}>
                    {item.originalName}
                  </div>
                </td>
                <td>
                  <div className="cell-editable cell-mono">
                    <input 
                      type="text" 
                      value={item.number || ''} 
                      placeholder="e.g. 101"
                      onChange={(e) => onUpdateItem(index, 'number', e.target.value)} 
                    />
                  </div>
                </td>
                <td>
                  <div className="cell-editable">
                    <input 
                      type="text" 
                      value={item.description || ''} 
                      placeholder="Enter exhibit title/description"
                      onChange={(e) => onUpdateItem(index, 'description', e.target.value)} 
                    />
                  </div>
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
