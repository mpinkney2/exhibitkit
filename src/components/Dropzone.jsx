import React, { useState } from 'react';
import { Upload, FolderOpen, AlertCircle, HelpCircle } from 'lucide-react';

export default function Dropzone({ onDirectorySelect, onFilesDrop, isSupported }) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter(file => 
        file.name.toLowerCase().endsWith('.pdf')
      );
      if (filesArray.length > 0) {
        onFilesDrop(filesArray);
      }
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).filter(file => 
        file.name.toLowerCase().endsWith('.pdf')
      );
      if (filesArray.length > 0) {
        onFilesDrop(filesArray);
      }
    }
  };

  return (
    <div 
      className={`dropzone-container ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <div className="dropzone-icon">
        <Upload size={32} />
      </div>
      
      <h2 className="dropzone-title">Ingest PDF Exhibits</h2>
      <p className="dropzone-desc">
        Select a local folder to rename files directly on your hard drive (Chrome/Edge), 
        or drag and drop a batch of PDF exhibits to parse and prepare them.
      </p>

      {/* Directory Access Mode warning/info */}
      {!isSupported && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--status-warning-bg)',
          border: '1px solid var(--status-warning-border)',
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '20px',
          maxWidth: '500px',
          textAlign: 'left',
          fontSize: '13px',
          color: 'var(--status-warning)'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Note:</strong> Direct folder renaming requires a chromium browser (Chrome, Edge). 
            You can still drag and drop files below to preview and download renamed files individually.
          </span>
        </div>
      )}

      <div className="dropzone-btn-group">
        {isSupported && (
          <button className="btn btn-primary" onClick={onDirectorySelect}>
            <FolderOpen size={16} />
            Select Local Folder
          </button>
        )}
        
        <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
          <Upload size={16} />
          Select PDF Files
          <input 
            type="file" 
            multiple 
            accept=".pdf" 
            onChange={handleFileInput} 
            style={{ display: 'none' }} 
          />
        </label>
      </div>

      <div style={{ marginTop: '32px', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <HelpCircle size={14} />
        <span>TrialDirector & OnCue compatible formatting. All operations run locally.</span>
      </div>
    </div>
  );
}
