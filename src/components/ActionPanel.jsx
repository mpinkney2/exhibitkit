import React, { useState } from 'react';
import { Play, RotateCcw, Trash2, Files, CheckSquare, AlertCircle, FileSpreadsheet, ChevronDown, ShieldCheck, Printer, FileText } from 'lucide-react';

export default function ActionPanel({
  items,
  onRenameExecute,
  onUndo,
  canUndo,
  onClear,
  onExportCsv,
  isPro,
  isTrial,
  workstationId,
  preset
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const totalCount = items.length;
  const successCount = items.filter(i => i.status === 'success').length;
  const warningCount = items.filter(i => i.status === 'warning').length;
  const errorCount = items.filter(i => i.status === 'danger').length;

  const hasErrors = errorCount > 0;
  const hasItems = totalCount > 0;

  // Active Mode Badge
  const getModeBadge = () => {
    if (isPro) {
      return (
        <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          🏆 PRO ACTIVE
        </span>
      );
    }
    if (isTrial) {
      return (
        <span className="badge badge-warning" style={{ padding: '6px 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          ⏳ FREE TRIAL BATCH
        </span>
      );
    }
    return (
      <span className="badge badge-info" style={{ padding: '6px 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        ⚙️ DEMO MODE
      </span>
    );
  };

  // Printable HTML Report Generator
  const handleExportHtml = () => {
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      alert("Popup blocker prevented opening the print report. Please allow popups for this site.");
      return;
    }

    const timestamp = new Date().toLocaleString();
    const modeLabel = isPro ? "PRO LICENSE ACTIVE" : isTrial ? "FREE TRIAL MODE" : "DEMO MODE";
    const conflictCount = warningCount;

    let rowsHtml = items.map((item, idx) => `
      <tr>
        <td style="font-family: monospace; font-size: 11px; text-align: center; border-bottom: 1px solid #e5e7eb; padding: 10px;">${idx + 1}</td>
        <td style="border-bottom: 1px solid #e5e7eb; padding: 10px; font-weight: 600; color: ${item.status === 'danger' ? '#ef4444' : item.status === 'warning' ? '#f59e0b' : '#10b981'}">
          ● ${item.status.toUpperCase()}
        </td>
        <td style="font-family: monospace; font-size: 11px; word-break: break-all; border-bottom: 1px solid #e5e7eb; padding: 10px;">${item.originalName}</td>
        <td style="font-family: monospace; font-size: 11px; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding: 10px;">${item.number || '-'}</td>
        <td style="border-bottom: 1px solid #e5e7eb; padding: 10px;">${item.description || '-'}</td>
        <td style="font-family: monospace; font-size: 11px; font-weight: bold; color: #6366f1; word-break: break-all; border-bottom: 1px solid #e5e7eb; padding: 10px;">${item.proposedName}</td>
      </tr>
    `).join("");

    const documentHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>ExhibitKIT | Session Audit Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; padding: 40px; margin: 0; line-height: 1.5; }
            h1 { font-size: 22px; margin: 0 0 4px 0; font-weight: 700; }
            .header-meta { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px; font-size: 11.5px; color: #4b5563; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 10.5px; font-weight: bold; text-transform: uppercase; }
            .badge-pro { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
            .badge-trial { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
            .badge-demo { background-color: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
            table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; margin-bottom: 30px; }
            th { border-bottom: 2px solid #cbd5e1; padding: 12px 10px; font-weight: 600; text-transform: uppercase; font-size: 10.5px; color: #475569; background-color: #f8fafc; }
            .summary-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; gap: 48px; }
            .summary-item { display: flex; flex-direction: column; }
            .summary-val { font-size: 18px; font-weight: bold; }
            .summary-lbl { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
            .local-note { margin-top: 40px; font-size: 10.5px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
            @media print {
              .print-btn { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h1>ExhibitKIT Session Audit Report</h1>
            <button class="print-btn" onclick="window.print()" style="padding: 8px 16px; background-color: #6366f1; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 12.5px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              🖨️ Print Audit Trail
            </button>
          </div>
          
          <div class="header-meta">
            <div>
              <strong>Published:</strong> ${timestamp}<br>
              <strong>Workstation Signature:</strong> ${workstationId || 'Local-Preview-Station'}
            </div>
            <div>
              <strong>Database Preset:</strong> ${preset.toUpperCase()}<br>
              <strong>Activation Tier:</strong> 
              <span class="badge ${isPro ? 'badge-pro' : isTrial ? 'badge-trial' : 'badge-demo'}">
                ${modeLabel}
              </span>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-item">
              <span class="summary-val">${items.length}</span>
              <span class="summary-lbl">Total Exhibits</span>
            </div>
            <div class="summary-item">
              <span class="summary-val" style="color: #10b981;">${items.filter(i => i.status === 'success').length}</span>
              <span class="summary-lbl">Ready</span>
            </div>
            <div class="summary-item">
              <span class="summary-val" style="color: #f59e0b;">${conflictCount}</span>
              <span class="summary-lbl">Conflicts</span>
            </div>
            <div class="summary-item">
              <span class="summary-val" style="color: #ef4444;">${errorCount}</span>
              <span class="summary-lbl">Errors</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th style="width: 90px;">Status</th>
                <th>Original Filename</th>
                <th style="width: 100px;">Exhibit ID</th>
                <th>Description</th>
                <th>Proposed Naming Scheme</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="local-note">
            🛡️ Confidential local-first legal tool. Exhibits are processed directly on your local system under client confidentiality safeguards.
          </div>
        </body>
      </html>
    `;

    reportWindow.document.write(documentHtml);
    reportWindow.document.close();
    setShowExportMenu(false);
  };

  // JSON Audit Log Export
  const handleExportJson = () => {
    const timestamp = new Date().toISOString();
    const payload = {
      reportType: "ExhibitKIT Session Audit Log",
      timestamp,
      workstationId: workstationId || 'Local-Preview-Station',
      mode: isPro ? "Pro" : isTrial ? "Trial" : "Demo",
      preset,
      summary: {
        totalExhibits: totalCount,
        ready: successCount,
        conflicts: warningCount,
        errors: errorCount
      },
      exhibits: items.map(item => ({
        originalName: item.originalName,
        proposedName: item.proposedName,
        exhibitId: item.number,
        description: item.description,
        status: item.status,
        message: item.message
      }))
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exhibitkit_audit_log_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

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
        <div className="action-info" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="action-title" style={{ fontSize: '15px', fontWeight: '600' }}>
              Ready to Process {successCount} / {totalCount} Exhibits
            </span>
            {getModeBadge()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={14} className="text-success" />
            <span>🔒 CONFIDENTIAL LOCAL-FIRST OPERATIONS (NO DOCUMENT UPLOADS)</span>
          </div>
        </div>

        <div className="action-buttons" style={{ position: 'relative' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onClear} 
            disabled={!hasItems}
            title="Remove all loaded exhibits"
            style={{ fontSize: '13px', padding: '8px 14px' }}
          >
            <Trash2 size={13} />
            Clear Ingestion
          </button>

          {/* Combined Session Audit dropdown split-button */}
          {hasItems && (
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <button 
                className="btn btn-secondary" 
                onClick={onExportCsv}
                title="Download CSV layout mapping"
                style={{ fontSize: '13px', padding: '8px 12px', borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
              >
                <FileSpreadsheet size={13} />
                Export CSV
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowExportMenu(!showExportMenu)}
                style={{ fontSize: '13px', padding: '8px 8px', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, minWidth: 0 }}
              >
                <ChevronDown size={13} />
              </button>

              {showExportMenu && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  marginBottom: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  width: '210px',
                  zIndex: 100,
                  overflow: 'hidden'
                }}>
                  <button 
                    onClick={handleExportHtml}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Printer size={12} className="text-primary" />
                    Printable HTML Audit
                  </button>
                  <button 
                    onClick={handleExportJson}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <FileText size={12} className="text-info" />
                    Export JSON Audit Log
                  </button>
                </div>
              )}
            </div>
          )}

          {canUndo && (
            <button 
              className="btn btn-outline-danger" 
              onClick={onUndo}
              title="Revert the last batch of renamed files"
              style={{ fontSize: '13px', padding: '8px 14px' }}
            >
              <RotateCcw size={13} />
              Undo Renames
            </button>
          )}

          <button 
            className="btn btn-success" 
            onClick={onRenameExecute}
            disabled={!hasItems || hasErrors}
            style={{ 
              padding: '10px 20px', 
              fontSize: '13.5px',
              opacity: (!hasItems || hasErrors) ? 0.4 : 1 
            }}
          >
            <Play size={14} fill="currentColor" />
            Rename {totalCount} PDF Exhibits
          </button>
        </div>
      </div>
    </div>
  );
}
