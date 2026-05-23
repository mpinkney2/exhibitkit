import React, { useState, useEffect } from 'react';
import { FileText, Award, ShieldAlert, FolderSync, Info, AlertTriangle } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dropzone from './components/Dropzone';
import PreviewTable from './components/PreviewTable';
import ActionPanel from './components/ActionPanel';
import PricingModal from './components/PricingModal';
import { 
  parseFilename, 
  generateProposedFilename, 
  validateProposedNames, 
  resolveDuplicates, 
  cleanDescription,
  formatCase
} from './utils/renamer';

export default function App() {
  // Naming Rule States
  const [preset, setPreset] = useState('oncue');
  const [prefix, setPrefix] = useState('PX');
  const [startNumber, setStartNumber] = useState(1);
  const [padLength, setPadLength] = useState(3);
  const [caseStyle, setCaseStyle] = useState('title');
  const [customTemplate, setCustomTemplate] = useState('{Prefix}{Number} - {Description}');
  const [cleanDesc, setCleanDesc] = useState(true);

  // Ingested Items State
  const [items, setItems] = useState([]);
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [directoryName, setDirectoryName] = useState("");

  // Undo History & Notifications
  const [lastRenameHistory, setLastRenameHistory] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  // Stripe & License States
  const [isProActivated, setIsProActivated] = useState(() => {
    return localStorage.getItem('exhibitkit_pro_activated') === 'true';
  });
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  const isDirectoryApiSupported = 'showDirectoryPicker' in window;

  const handleActivateLicense = (key) => {
    setIsProActivated(true);
    localStorage.setItem('exhibitkit_pro_activated', 'true');
    localStorage.setItem('exhibitkit_license_key', key);
    setIsPricingOpen(false);
    showNotification("🎉 ExhibitKIT Pro unlocked successfully! Thank you for supporting PatentPreppers.", "success");
  };

  // Helper to trigger alert notifications
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  // On mount, check if we returned from a successful Stripe purchase
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('activated') === 'true' || params.get('session_id')) {
      handleActivateLicense('EKIT-STRIPE-SUCCESS');
      // Clean up URL query parameters so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Centralized proposed name update logic
  const updateProposedNames = (itemsList, overrides = {}) => {
    const rules = {
      preset,
      prefix,
      startNumber,
      padLength,
      caseStyle,
      customTemplate,
      cleanDesc,
      ...overrides
    };

    const updated = itemsList.map((item, idx) => {
      // Calculate dynamic sequenced number if not manually edited by the user
      const currentNumber = item.isNumberManuallyEdited 
        ? item.number 
        : String(rules.startNumber + idx);

      const proposed = generateProposedFilename({
        prefix: rules.prefix,
        number: currentNumber,
        description: item.description,
        preset: rules.preset,
        padLength: rules.padLength,
        caseStyle: rules.caseStyle,
        customTemplate: rules.customTemplate
      });

      return {
        ...item,
        number: currentNumber,
        proposedName: proposed,
        preset: rules.preset,
        prefix: rules.prefix
      };
    });

    return validateProposedNames(updated);
  };

  // Re-run proposed name generation when sidebar options update
  useEffect(() => {
    if (items.length > 0) {
      setItems(prevItems => updateProposedNames(prevItems));
    }
  }, [preset, prefix, startNumber, padLength, caseStyle, customTemplate, cleanDesc]);

  // Handle native folder picking
  const handleDirectorySelect = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setDirectoryHandle(handle);
      setDirectoryName(handle.name);

      const files = [];
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
          const file = await entry.getFile();
          
          // Parse original filename to split ID/Description
          const parsed = parseFilename(entry.name);
          
          files.push({
            originalName: entry.name,
            number: parsed.number,
            description: cleanDesc ? cleanDescription(parsed.description) : parsed.description,
            isNumberManuallyEdited: parsed.number ? true : false,
            file: file,
            handle: entry
          });
        }
      }

      if (files.length === 0) {
        showNotification("⚠️ No PDF files found in the selected directory.", "warning");
        return;
      }

      // Sort files alphabetically to ensure consistent auto-sequencing
      files.sort((a, b) => a.originalName.localeCompare(b.originalName, undefined, { numeric: true }));

      const itemsWithProposed = updateProposedNames(files);
      setItems(itemsWithProposed);
      showNotification(`✨ Loaded ${files.length} PDF exhibits from "${handle.name}".`, "success");
    } catch (err) {
      if (err.name !== 'AbortError') {
        showNotification("❌ Directory picker error: " + err.message, "danger");
      }
    }
  };

  // Handle drag and drop file ingestion
  const handleFilesDrop = (filesList) => {
    // If they drag & drop, we operate in standard batch download mode (no direct folder write)
    setDirectoryHandle(null);
    setDirectoryName("Uploaded Upload Ingestion");

    const newItems = filesList.map(file => {
      const parsed = parseFilename(file.name);
      return {
        originalName: file.name,
        number: parsed.number,
        description: cleanDesc ? cleanDescription(parsed.description) : parsed.description,
        isNumberManuallyEdited: parsed.number ? true : false,
        file: file,
        handle: null
      };
    });

    newItems.sort((a, b) => a.originalName.localeCompare(b.originalName, undefined, { numeric: true }));

    const merged = [...items, ...newItems];
    // Remove duplicate original names
    const unique = merged.filter((item, index, self) =>
      index === self.findIndex((t) => t.originalName === item.originalName)
    );

    setItems(updateProposedNames(unique));
    showNotification(`✨ Added ${newItems.length} PDF files for batch preparation.`, "success");
  };

  // Inline edit callback for individual cells
  const handleUpdateItem = (index, key, value) => {
    const updated = [...items];
    if (key === 'number') {
      updated[index] = {
        ...updated[index],
        number: value,
        isNumberManuallyEdited: true // User took manual control of the index
      };
    } else if (key === 'description') {
      updated[index] = {
        ...updated[index],
        description: value
      };
    }

    setItems(updateProposedNames(updated));
  };

  // Bulk operations
  const handleBulkCaseChange = (style) => {
    const updated = items.map(item => ({
      ...item,
      description: formatCase(item.description, style)
    }));
    setItems(updateProposedNames(updated));
    showNotification(`✨ Converted all descriptions to ${style} case.`, "success");
  };

  const handleBulkClean = () => {
    const updated = items.map(item => ({
      ...item,
      description: cleanDescription(item.description)
    }));
    setItems(updateProposedNames(updated));
    showNotification("✨ Standardized and cleaned all exhibit descriptions.", "success");
  };

  const handleAutoSequence = () => {
    const updated = items.map(item => ({
      ...item,
      isNumberManuallyEdited: false // Reset manual override to sequence all
    }));
    setItems(updateProposedNames(updated));
    showNotification("✨ Auto-sequenced all exhibits starting from " + startNumber + ".", "success");
  };

  const handleResolveConflicts = () => {
    const resolved = resolveDuplicates(items);
    setItems(resolved);
    showNotification("✨ Automatically resolved all duplicate filename conflicts.", "success");
  };

  // Rename Execution
  const handleRenameExecute = async () => {
    if (items.length === 0) return;

    if (!isProActivated) {
      setIsPricingOpen(true);
      showNotification("🔒 License required: Unlock ExhibitKIT Pro to execute renaming.", "warning");
      return;
    }

    if (!directoryHandle) {
      // Fallback: Individual downloads since there is no local folder handle
      try {
        for (const item of items) {
          const file = item.file;
          const url = URL.createObjectURL(file);
          const a = document.createElement('a');
          a.href = url;
          a.download = item.proposedName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        showNotification("✨ Successfully exported/downloaded all prepared exhibits!", "success");
      } catch (err) {
        showNotification("❌ Batch download failed: " + err.message, "danger");
      }
      return;
    }

    // Direct In-place folder renaming
    try {
      const history = [];
      const updatedItems = [...items];

      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        const entry = item.handle;
        const oldName = item.originalName;
        const newName = item.proposedName;

        if (oldName === newName) continue; // Skip identical

        if (entry.move) {
          await entry.move(newName);
        } else {
          // Fallback: Copy content and delete
          const file = await entry.getFile();
          const newFileHandle = await directoryHandle.getFileHandle(newName, { create: true });
          const writable = await newFileHandle.createWritable();
          await writable.write(file);
          await writable.close();
          await directoryHandle.removeEntry(oldName);
        }

        // Store history for undo
        history.push({
          oldName,
          newName,
          handle: await directoryHandle.getFileHandle(newName)
        });

        // Update item handle and state in-place
        updatedItems[i] = {
          ...item,
          originalName: newName,
          handle: await directoryHandle.getFileHandle(newName)
        };
      }

      setItems(updateProposedNames(updatedItems));
      setLastRenameHistory(history);
      showNotification(`✨ Successfully renamed ${history.length} exhibits directly inside "${directoryName}"!`, "success");
    } catch (err) {
      showNotification("❌ Renaming operation failed: " + err.message, "danger");
      console.error(err);
    }
  };

  // Undo Rename
  const handleUndo = async () => {
    if (!directoryHandle || lastRenameHistory.length === 0) return;

    try {
      const updatedItems = [...items];

      for (const record of lastRenameHistory) {
        const entry = record.handle;
        const oldName = record.oldName;
        const newName = record.newName;

        if (entry.move) {
          await entry.move(oldName);
        } else {
          const file = await entry.getFile();
          const newFileHandle = await directoryHandle.getFileHandle(oldName, { create: true });
          const writable = await newFileHandle.createWritable();
          await writable.write(file);
          await writable.close();
          await directoryHandle.removeEntry(newName);
        }

        const idx = updatedItems.findIndex(i => i.originalName === newName);
        if (idx !== -1) {
          updatedItems[idx] = {
            ...updatedItems[idx],
            originalName: oldName,
            handle: await directoryHandle.getFileHandle(oldName)
          };
        }
      }

      setItems(updateProposedNames(updatedItems));
      setLastRenameHistory([]);
      showNotification("⏪ Reverted and restored all original exhibit names successfully.", "success");
    } catch (err) {
      showNotification("❌ Undo operation failed: " + err.message, "danger");
      console.error(err);
    }
  };

  // Clear Ingestion State
  const handleClear = () => {
    setItems([]);
    setDirectoryHandle(null);
    setDirectoryName("");
    setLastRenameHistory([]);
    showNotification("🧹 Ingestion cleared successfully.", "success");
  };

  // CSV Map Export utility
  const handleExportCsv = () => {
    if (items.length === 0) return;

    if (!isProActivated) {
      setIsPricingOpen(true);
      showNotification("🔒 License required: Unlock ExhibitKIT Pro to export CSV mappings.", "warning");
      return;
    }

    try {
      const headers = "Original Filename,Exhibit ID,Proposed Filename,Preset Type\n";
      const rows = items.map(item => {
        const escape = (str) => `"${(str || '').replace(/"/g, '""')}"`;
        return `${escape(item.originalName)},${escape(item.number)},${escape(item.proposedName)},${escape(preset)}`;
      }).join("\n");

      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exhibit_rename_map_${directoryName || 'batch'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification("📊 CSV exhibits mapping log exported successfully!", "success");
    } catch (err) {
      showNotification("❌ CSV export failed: " + err.message, "danger");
    }
  };

  // Reset rules back to baseline PX - 001
  const handleResetRules = () => {
    setPreset('oncue');
    setPrefix('PX');
    setStartNumber(1);
    setPadLength(3);
    setCaseStyle('title');
    setCustomTemplate('{Prefix}{Number} - {Description}');
    setCleanDesc(true);
    showNotification("🔄 Naming rules reset to default OnCue PX-001.", "success");
  };

  return (
    <div className="app-container">
      {/* Decorative Orbs */}
      <div className="glow-orb-1"></div>
      <div className="glow-orb-2"></div>

      {/* Configuration Sidebar */}
      <Sidebar 
        preset={preset}
        setPreset={setPreset}
        prefix={prefix}
        setPrefix={setPrefix}
        startNumber={startNumber}
        setStartNumber={setStartNumber}
        padLength={padLength}
        setPadLength={setPadLength}
        caseStyle={caseStyle}
        setCaseStyle={setCaseStyle}
        customTemplate={customTemplate}
        setCustomTemplate={setCustomTemplate}
        cleanDesc={cleanDesc}
        setCleanDesc={setCleanDesc}
        onReset={handleResetRules}
      />

      {/* Main Workspace */}
      <div className="main-content">
        {/* Top Header info bar */}
        <div className="top-bar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>ExhibitKIT | Legal Exhibit Dashboard</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {directoryName 
                ? `📂 Active Folder: ${directoryName} (In-place editing)` 
                : "📂 No active folder selected. Operating in Batch Download Mode."
              }
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <FolderSync size={14} className={directoryHandle ? 'text-success' : 'text-warning'} />
              <span>In-Place Mode: <strong>{directoryHandle ? "ON" : "OFF"}</strong></span>
            </div>
            
            {isProActivated ? (
              <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }} onClick={() => setIsPricingOpen(true)}>
                🏆 Pro Activated (PatentPreppers)
              </span>
            ) : (
              <button 
                className="btn btn-primary" 
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '12px', 
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                  boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)',
                  border: 'none'
                }}
                onClick={() => setIsPricingOpen(true)}
              >
                ⭐ Unlock Pro ($150)
              </button>
            )}

            <a 
              href="https://oncuetech.com" 
              target="_blank" 
              className="badge badge-info" 
              style={{ textDecoration: 'none', cursor: 'pointer' }}
            >
              <Info size={10} /> Exhibits Docs
            </a>
          </div>
        </div>

        {/* Dashboard Workspace */}
        <div className="workspace-view">
          {items.length === 0 ? (
            <Dropzone 
              onDirectorySelect={handleDirectorySelect}
              onFilesDrop={handleFilesDrop}
              isSupported={isDirectoryApiSupported}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <PreviewTable 
                items={items}
                onUpdateItem={handleUpdateItem}
                onBulkCaseChange={handleBulkCaseChange}
                onBulkClean={handleBulkClean}
                onAutoSequence={handleAutoSequence}
                onResolveConflicts={handleResolveConflicts}
              />
              
              <ActionPanel 
                items={items}
                onRenameExecute={handleRenameExecute}
                onUndo={handleUndo}
                canUndo={lastRenameHistory.length > 0}
                onClear={handleClear}
                onExportCsv={handleExportCsv}
              />
            </div>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification.show && (
        <div className={`notification ${notification.type === 'danger' ? 'warning' : 'success'}`}>
          <div className="notification-message">{notification.message}</div>
        </div>
      )}

      {/* Stripe checkout & license pricing */}
      <PricingModal 
        isOpen={isPricingOpen} 
        onClose={() => setIsPricingOpen(false)} 
        onActivate={handleActivateLicense}
        stripeLink="https://buy.stripe.com/cNicN59My1tC6VN0ayg7e00"
      />
    </div>
  );
}
