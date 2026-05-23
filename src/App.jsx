import React, { useState, useEffect } from 'react';
import { FileText, Award, ShieldAlert, FolderSync, Info, AlertTriangle, ShieldCheck, CreditCard, Key, ArrowLeft, Lock } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dropzone from './components/Dropzone';
import PreviewTable from './components/PreviewTable';
import ActionPanel from './components/ActionPanel';
import PricingModal from './components/PricingModal';
import LandingPage from './components/LandingPage';
import LegalModals from './components/LegalModals';
import { 
  hasProAccess, 
  hasTrialAvailable, 
  markTrialUsed, 
  getWorkstationInfo, 
  activateLicense, 
  deactivateLicense 
} from './utils/license';
import { 
  parseFilename, 
  generateProposedFilename, 
  validateProposedNames, 
  resolveDuplicates, 
  cleanDescription,
  formatCase
} from './utils/renamer';

export default function App() {
  // Application Mode Routing: 'landing' | 'workspace' | 'stripe_success' | 'stripe_cancel'
  const [appRoute, setAppRoute] = useState('landing');
  
  // Workspace Tier States
  const [isPro, setIsPro] = useState(() => hasProAccess());
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Workstation Profile Info
  const [workstation, setWorkstation] = useState(() => getWorkstationInfo());

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

  // Safety & Freezing State
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [isPreviewFreezed, setIsPreviewFreezed] = useState(false);

  // Undo History & Notifications
  const [lastRenameHistory, setLastRenameHistory] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  // Stripe & Pricing Modal
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [licenseInputValue, setLicenseInputValue] = useState('');
  const [activationError, setActivationError] = useState('');

  // Active Legal/Support Modals: null | 'terms' | 'privacy' | 'support' | 'how'
  const [activeModal, setActiveModal] = useState(null);

  const isDirectoryApiSupported = 'showDirectoryPicker' in window;

  // Sync workstation info on load
  useEffect(() => {
    setWorkstation(getWorkstationInfo());
    if (hasProAccess()) {
      setIsPro(true);
      setAppRoute('workspace');
    }
  }, []);

  // Parse Stripe Success/Cancel call routes from URL params on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get('stripe_status');
    if (stripeStatus === 'success') {
      setAppRoute('stripe_success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (stripeStatus === 'cancel') {
      setAppRoute('stripe_cancel');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleActivateLicense = (key) => {
    const success = activateLicense(key);
    if (success) {
      setIsPro(true);
      setIsTrialMode(false);
      setIsDemoMode(false);
      setIsPricingOpen(false);
      setActivationError('');
      setAppRoute('workspace');
      showNotification("🎉 ExhibitKIT Pro unlocked successfully! Workstation registered.", "success");
    } else {
      setActivationError("❌ Invalid license key format. Please double-check your purchase email.");
    }
  };

  const handleDeactivate = () => {
    deactivateLicense();
    setIsPro(false);
    setItems([]);
    setDirectoryHandle(null);
    setDirectoryName("");
    setAppRoute('landing');
    showNotification("🔓 Workstation license deactivated.", "info");
  };

  // Helper to trigger alert notifications
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 4500);
  };

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

  // Re-run proposed name generation when sidebar options update (if not frozen)
  useEffect(() => {
    if (items.length > 0 && !isPreviewFreezed) {
      setItems(prevItems => updateProposedNames(prevItems));
    }
  }, [preset, prefix, startNumber, padLength, caseStyle, customTemplate, cleanDesc]);

  // Apply Matter Profile settings
  const handleApplyProfileSettings = (settings) => {
    if (isPreviewFreezed) return;
    setPreset(settings.preset);
    setPrefix(settings.prefix);
    setStartNumber(settings.startNumber);
    setPadLength(settings.padLength);
    setCaseStyle(settings.caseStyle);
    setCleanDesc(settings.cleanDesc);
    setCustomTemplate(settings.customTemplate);
  };

  // Load sample data exhibits for interactive demo workflow
  const handleLoadSampleData = () => {
    if (isPreviewFreezed) return;
    setDirectoryHandle(null);
    setDirectoryName("Mock Legal Exhibits Dataset");

    const sampleFiles = [
      { name: "1981 - Letter to OSHA - TD Authenticated.pdf" },
      { name: "Abelmann-2018.pdf" },
      { name: "Carbone-2025.pdf" },
      { name: "Merewether 1935 - BEST COPY.pdf" },
      { name: "Mobil Oil Corporation - 1972a.pdf" }
    ];

    const parsedSamples = sampleFiles.map(file => {
      const parsed = parseFilename(file.name);
      return {
        originalName: file.name,
        number: parsed.number,
        description: cleanDesc ? cleanDescription(parsed.description) : parsed.description,
        isNumberManuallyEdited: parsed.number ? true : false,
        file: null, // Mocks have no file handles
        handle: null
      };
    });

    parsedSamples.sort((a, b) => a.originalName.localeCompare(b.originalName, undefined, { numeric: true }));
    setItems(updateProposedNames(parsedSamples));
    showNotification("📊 Mock exhibit dataset loaded. Test presets and sequences above.", "success");
  };

  // Handle native folder picking
  const handleDirectorySelect = async () => {
    if (isDemoMode) {
      showNotification("🔒 Direct folder ingestion is restricted in Demo mode. Load Sample Exhibits or upgrade to Pro.", "warning");
      setIsPricingOpen(true);
      return;
    }

    try {
      const handle = await window.showDirectoryPicker();
      
      const files = [];
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
          const file = await entry.getFile();
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

      // Enforce Trial volume bounds: max 5 files total
      if (isTrialMode && files.length > 5) {
        showNotification("⚠️ Trial tier is restricted to a maximum of 5 files. Please reduce your batch or purchase Pro.", "danger");
        setIsPricingOpen(true);
        return;
      }

      setDirectoryHandle(handle);
      setDirectoryName(handle.name);

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
    if (isDemoMode) {
      showNotification("🔒 Real file ingestion is restricted in Demo mode. Load Sample Exhibits or upgrade to Pro.", "warning");
      setIsPricingOpen(true);
      return;
    }

    // Enforce Trial volume bounds: max 5 files total
    if (isTrialMode && filesList.length > 5) {
      showNotification("⚠️ Trial tier is restricted to a maximum of 5 files. Please reduce your batch or purchase Pro.", "danger");
      setIsPricingOpen(true);
      return;
    }

    setDirectoryHandle(null);
    setDirectoryName("Batch Ingestion (Download Mode)");

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
    setItems(updateProposedNames(newItems));
    showNotification(`✨ Added ${newItems.length} PDF files for batch preparation.`, "success");
  };

  // Inline edit callback for individual cells
  const handleUpdateItem = (index, key, value) => {
    if (isPreviewFreezed) return;
    const updated = [...items];
    if (key === 'number') {
      updated[index] = {
        ...updated[index],
        number: value,
        isNumberManuallyEdited: true
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
    if (isPreviewFreezed) return;
    const updated = items.map(item => ({
      ...item,
      description: formatCase(item.description, style)
    }));
    setItems(updateProposedNames(updated));
    showNotification(`✨ Converted all descriptions to ${style} case.`, "success");
  };

  const handleBulkClean = () => {
    if (isPreviewFreezed) return;
    const updated = items.map(item => ({
      ...item,
      description: cleanDescription(item.description)
    }));
    setItems(updateProposedNames(updated));
    showNotification("✨ Standardized and cleaned all exhibit descriptions.", "success");
  };

  const handleAutoSequence = () => {
    if (isPreviewFreezed) return;
    const updated = items.map(item => ({
      ...item,
      isNumberManuallyEdited: false
    }));
    setItems(updateProposedNames(updated));
    showNotification("✨ Auto-sequenced all exhibits starting from " + startNumber + ".", "success");
  };

  const handleResolveConflicts = () => {
    if (isPreviewFreezed) return;
    const resolved = resolveDuplicates(items);
    setItems(resolved);
    showNotification("✨ Automatically resolved all duplicate filename conflicts.", "success");
  };

  // Trigger Backup Dialog check first
  const handleRenameTrigger = () => {
    if (items.length === 0) return;
    
    // In Demo Mode, block actual rename executions completely
    if (isDemoMode) {
      showNotification("🔒 Renaming real files is restricted in Demo mode. Upgrade to Pro to process exhibits.", "warning");
      setIsPricingOpen(true);
      return;
    }

    // Open backup checkbox confirmation
    setBackupConfirmed(false);
    setShowBackupModal(true);
  };

  // Rename Execution
  const handleRenameExecute = async () => {
    setShowBackupModal(false);
    
    // Freeze preview state before renaming to block mid-operation changes
    setIsPreviewFreezed(true);

    if (!directoryHandle) {
      // Fallback: Individual downloads since there is no local folder handle
      try {
        for (const item of items) {
          if (!item.file) continue;
          const url = URL.createObjectURL(item.file);
          const a = document.createElement('a');
          a.href = url;
          a.download = item.proposedName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        // Consume Trial if in Trial Mode
        if (isTrialMode) {
          markTrialUsed();
          setIsTrialMode(false);
          setIsDemoMode(true);
          setItems([]);
          showNotification("✨ Free trial batch completed! Upgrade to Pro for unlimited local renames.", "success");
          setIsPricingOpen(true);
        } else {
          showNotification("✨ Successfully exported/downloaded all prepared exhibits!", "success");
        }
      } catch (err) {
        showNotification("❌ Batch download failed: " + err.message, "danger");
      } finally {
        setIsPreviewFreezed(false);
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

      // Consume Trial if in Trial Mode
      if (isTrialMode) {
        markTrialUsed();
        setIsTrialMode(false);
        setIsDemoMode(true);
        setItems([]);
        showNotification("✨ Free trial batch completed! Upgrade to Pro for unlimited local renames.", "success");
        setIsPricingOpen(true);
      } else {
        showNotification(`✨ Successfully renamed ${history.length} exhibits directly inside "${directoryName}"!`, "success");
      }
    } catch (err) {
      showNotification("❌ Renaming operation failed: " + err.message, "danger");
      console.error(err);
    } finally {
      setIsPreviewFreezed(false);
    }
  };

  // Undo Rename (Only allowed in Pro)
  const handleUndo = async () => {
    if (!isPro) {
      showNotification("🔒 Reverting renames is an ExhibitKIT Pro feature.", "warning");
      setIsPricingOpen(true);
      return;
    }

    if (!directoryHandle || lastRenameHistory.length === 0) return;

    try {
      setIsPreviewFreezed(true);
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
    } finally {
      setIsPreviewFreezed(false);
    }
  };

  // Clear Ingestion State
  const handleClear = () => {
    if (isPreviewFreezed) return;
    setItems([]);
    setDirectoryHandle(null);
    setDirectoryName("");
    setLastRenameHistory([]);
    showNotification("🧹 Ingestion cleared successfully.", "success");
  };

  // CSV Map Export utility
  const handleExportCsv = () => {
    if (items.length === 0) return;

    // Demo Mode can export sample CSV only
    if (isDemoMode && items[0].file !== null) {
      showNotification("🔒 CSV exporting for real files is restricted in Demo mode. Upgrade to Pro.", "warning");
      setIsPricingOpen(true);
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

  // Reset rules back to default
  const handleResetRules = () => {
    if (isPreviewFreezed) return;
    setPreset('oncue');
    setPrefix('PX');
    setStartNumber(1);
    setPadLength(3);
    setCaseStyle('title');
    setCustomTemplate('{Prefix}{Number} - {Description}');
    setCleanDesc(true);
    showNotification("🔄 Naming rules reset to default OnCue PX-001.", "success");
  };

  // Route Launchers
  const handleLaunchDemoMode = () => {
    setIsDemoMode(true);
    setIsTrialMode(false);
    setItems([]);
    setAppRoute('workspace');
    showNotification("⚙️ In workspace in Demo Mode. Load sample data to evaluate.", "info");
  };

  const handleLaunchTrialMode = () => {
    if (!hasTrialAvailable()) {
      showNotification("⚠️ Your free trial batch has been used. Purchase ExhibitKIT Pro to process exhibits.", "warning");
      setIsPricingOpen(true);
      return;
    }
    setIsTrialMode(true);
    setIsDemoMode(false);
    setItems([]);
    setAppRoute('workspace');
    showNotification("⏳ Live Trial Batch Active (Max 5 real files).", "info");
  };

  // Layout Renderings
  if (appRoute === 'landing') {
    return (
      <LandingPage 
        onLaunchDemo={handleLaunchDemoMode}
        onLaunchTrial={handleLaunchTrialMode}
        onOpenPricing={() => setIsPricingOpen(true)}
      />
    );
  }

  if (appRoute === 'stripe_success') {
    return (
      <div className="landing-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', backgroundColor: 'var(--bg-primary)', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', border: '1px solid var(--status-success-border)' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--status-success-bg)', color: 'var(--status-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <ShieldCheck size={26} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '700' }}>Payment Received!</h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Your ExhibitKIT Pro license key will be delivered to the email used at checkout. Once received, enter the key below to activate this workstation.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleActivateLicense(licenseInputValue); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Activation License Key</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={licenseInputValue} 
                  onChange={(e) => setLicenseInputValue(e.target.value)} 
                  placeholder="Format: EKIT-XXXX-XXXX-XXXX"
                  style={{ flex: 1, fontSize: '13px' }}
                />
                <button type="submit" className="btn btn-success" style={{ flexShrink: 0 }}>
                  Activate Pro
                </button>
              </div>
            </div>

            {activationError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-danger)', fontSize: '11px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', padding: '8px 12px', borderRadius: '6px' }}>
                <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                <span>{activationError}</span>
              </div>
            )}
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
            <span>📧 Technical issues or license recovery? Contact <a href="mailto:support@exhibitkit.app" style={{ color: 'var(--text-secondary)' }}>support@exhibitkit.app</a></span>
          </div>

          <button className="btn btn-secondary" onClick={() => setAppRoute('workspace')} style={{ width: '100%', fontSize: '13px' }}>
            <ArrowLeft size={14} /> Continue to Demo Workspace
          </button>
        </div>
      </div>
    );
  }

  if (appRoute === 'stripe_cancel') {
    return (
      <div className="landing-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', backgroundColor: 'var(--bg-primary)', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <Info size={24} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Checkout Canceled</h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
            Checkout was canceled. You can continue testing in Demo Mode or purchase your professional workstation license whenever you are ready.
          </p>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={() => setIsPricingOpen(true)} style={{ flex: 1, fontSize: '13px' }}>
              Purchase License
            </button>
            <button className="btn btn-secondary" onClick={() => { setAppRoute('workspace'); setIsDemoMode(true); }} style={{ flex: 1, fontSize: '13px' }}>
              Launch Demo Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Decorative Glow Orbs */}
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
        isPro={isPro}
        onApplySettings={handleApplyProfileSettings}
        onOpenModal={(type) => setActiveModal(type)}
        onShowNotification={showNotification}
      />

      {/* Main Workspace */}
      <div className="main-content">
        {/* Top Header info bar */}
        <div className="top-bar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>ExhibitKIT Workspace</h2>
              {isPro ? (
                <span className="badge badge-success" style={{ fontSize: '10.5px' }}>Pro</span>
              ) : isTrialMode ? (
                <span className="badge badge-warning" style={{ fontSize: '10.5px' }}>Trial</span>
              ) : (
                <span className="badge badge-info" style={{ fontSize: '10.5px' }}>Demo</span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {directoryName 
                ? `📂 Active Folder: ${directoryName} (In-place editing)` 
                : "📂 Ingest files below or select folder for live renaming."
              }
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Direct folder writing support indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <FolderSync size={14} className={directoryHandle ? 'text-success' : 'text-warning'} />
              <span>In-Place Mode: <strong>{directoryHandle ? "ON" : "OFF"}</strong></span>
            </div>
            
            {isPro ? (
              <span 
                className="badge badge-success" 
                style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={handleDeactivate}
                title="Click to deactivate license on this workstation"
              >
                🏆 Pro Active (Deactivate)
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

            <button 
              className="badge badge-info" 
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => setActiveModal('how')}
            >
              <Info size={10} /> How to Use
            </button>
          </div>
        </div>

        {/* Dashboard Workspace */}
        <div className="workspace-view">
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '20px' }}>
              <Dropzone 
                onDirectorySelect={handleDirectorySelect}
                onFilesDrop={handleFilesDrop}
                isSupported={isDirectoryApiSupported}
              />
              {/* Quick load sample exhibits button in Demo mode */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={handleLoadSampleData} style={{ padding: '10px 20px', border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.05)' }}>
                  📊 Load Sample exhibits (Demo)
                </button>
              </div>
            </div>
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
                onRenameExecute={handleRenameTrigger}
                onUndo={handleUndo}
                canUndo={lastRenameHistory.length > 0}
                onClear={handleClear}
                onExportCsv={handleExportCsv}
                isPro={isPro}
                isTrial={isTrialMode}
                workstationId={workstation.deviceId}
                preset={preset}
              />
            </div>
          )}
        </div>
      </div>

      {/* Safety Backup Checkbox Confirmation Overlay Modal */}
      {showBackupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5, 7, 12, 0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div className="glass-panel" style={{ maxWidth: '460px', width: '90%', padding: '32px', border: '1px solid var(--status-warning-border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--status-warning)' }}>
              <AlertTriangle size={24} style={{ flexShrink: 0 }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Safety Backup Confirmation</h3>
            </div>
            
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
              Bulk renaming modifies files directly on your local system. Before executing, you must confirm that you have secure duplicates of your original exhibits.
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <input 
                type="checkbox" 
                id="backup-confirm-checkbox"
                checked={backupConfirmed}
                onChange={(e) => setBackupConfirmed(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer' }}
              />
              <label htmlFor="backup-confirm-checkbox" style={{ fontSize: '12.5px', cursor: 'pointer', lineHeight: '1.4' }}>
                <strong>I confirm that I have retained backup copies of all original exhibits before proceeding.</strong>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button className="btn btn-secondary" onClick={() => setShowBackupModal(false)} style={{ padding: '8px 16px', fontSize: '13px' }}>
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                disabled={!backupConfirmed}
                onClick={handleRenameExecute}
                style={{ padding: '8px 16px', fontSize: '13px', opacity: backupConfirmed ? 1 : 0.4 }}
              >
                Proceed to Rename
              </button>
            </div>
          </div>
        </div>
      )}

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
      />

      {/* Legal & Operational support overlays */}
      <LegalModals 
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
