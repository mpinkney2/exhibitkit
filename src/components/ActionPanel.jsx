import React from 'react';
import { Play, RotateCcw, Download, Trash2, Files, CheckSquare, AlertCircle, FileSpreadsheet } from 'lucide-react';

export default function ActionPanel({
  items,
  onRenameExecute,
  onUndo,
  canUndo,
  onClear,
  onExportCsv
}) {
  const totalCount = items.length;
  const successCount = items.filter(i => i.status === 'success').length;
  const warningCount = items.filter(i => i.status === 'warning').length;
  const errorCount = items.filter(i => i.status === 'danger').length;

  const hasErrors = errorCount > 0;
  const hasItems = totalCount > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon primary">
            <Files size={18} />
          </div>
          <div className="stat-content">
            <span className="stat-val">{totalCount}</span>
            <span className="stat-label">Total Ingested</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon success">
            <CheckSquare size={18} />
          </div>
          <div className="stat-content">
            <span className="stat-val">{successCount}</span>
            <span className="stat-label">Ready to Rename</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon warning">
            <AlertCircle size={18} />
          </div>
          <div className="stat-content">
            <span className="stat-val">{warningCount}</span>
            <span className="stat-label">Conflicts</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon info" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)' }}>
            <Trash2 size={18} />
          </div>
          <div className="stat-content">
            <span className="stat-val">{errorCount}</span>
            <span className="stat-label">Errors</span>
          </div>
        </div>
      </div>

      {/* Main Execution Actions */}
      <div className="action-bar">
        <div className="action-info">
          <span className="action-title">
            Ready to Process {successCount} / {totalCount} Exhibits
          </span>
          <span className="action-desc">
            {hasErrors 
              ? "❌ Please resolve filename errors before proceeding." 
              : warningCount > 0 
                ? "⚠️ Warning: Duplicate names will overwrite unless resolved." 
                : "✨ All exhibit configurations look clean and ready."
            }
          </span>
        </div>

        <div className="action-buttons">
          <button 
            className="btn btn-secondary" 
            onClick={onClear} 
            disabled={!hasItems}
            title="Remove all loaded exhibits"
          >
            <Trash2 size={14} />
            Clear Ingestion
          </button>

          {hasItems && (
            <button 
              className="btn btn-secondary" 
              onClick={onExportCsv}
              title="Download CSV layout mapping old names to new names"
            >
              <FileSpreadsheet size={14} />
              Export CSV Mapping
            </button>
          )}

          {canUndo && (
            <button 
              className="btn btn-outline-danger" 
              onClick={onUndo}
              title="Revert the last batch of renamed files"
            >
              <RotateCcw size={14} />
              Undo Renames
            </button>
          )}

          <button 
            className="btn btn-success" 
            onClick={onRenameExecute}
            disabled={!hasItems || hasErrors}
            style={{ 
              padding: '12px 24px', 
              fontSize: '15px',
              opacity: (!hasItems || hasErrors) ? 0.4 : 1 
            }}
          >
            <Play size={16} fill="currentColor" />
            Rename {totalCount} PDF Exhibits
          </button>
        </div>
      </div>
    </div>
  );
}
