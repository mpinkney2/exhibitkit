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
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        width: '100%',
        padding: '24px 0'
      }}
    >
      <div style={{
        maxWidth: '560px',
        width: '100%',
        backgroundColor: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '48px 40px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        {/* Upload Icon: FolderOpen thin-stroke */}
        <div style={{ color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          <FolderOpen size={40} strokeWidth={1.2} />
        </div>
        
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '12px', fontFamily: 'var(--font-sans)', letterSpacing: '-0.4px' }}>
          Ingest PDF Exhibits
        </h2>
        
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '380px', margin: '0 auto 32px auto', lineHeight: '1.6', fontFamily: 'var(--font-sans)' }}>
          Select a local folder to rename files directly on your hard drive, or select a batch of PDF exhibits to parse and prepare them.
        </p>

        {/* Directory Access Mode warning/info */}
        {!isSupported && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '10px 14px',
            marginBottom: '24px',
            maxWidth: '100%',
            textAlign: 'left',
            fontSize: '12.5px',
            color: 'var(--color-text-secondary)',
            lineHeight: '1.5'
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--color-warning)' }} />
            <span>
              Direct folder renaming requires a Chromium browser (Chrome, Edge). You can still select files below to prepare and download renamed exhibits.
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {isSupported && (
            <button 
              className="btn" 
              onClick={onDirectorySelect}
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#ffffff',
                fontFamily: 'var(--font-sans)',
                fontWeight: '500',
                fontSize: '14px',
                borderRadius: '6px',
                padding: '10px 20px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Select Local Folder
            </button>
          )}
          
          <label 
            className="btn btn-secondary" 
            style={{ cursor: 'pointer' }}
          >
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

        <div style={{ marginTop: '24px', color: 'var(--color-text-muted)', fontSize: '12px', fontFamily: 'var(--font-sans)' }}>
          🔒 TrialDirector & OnCue compatible. All operations run locally.
        </div>
      </div>
    </div>
  );
}
