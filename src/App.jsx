import { useState, useEffect } from 'react';
import { ShieldAlert, Info, AlertTriangle, ShieldCheck, ArrowLeft, Menu, Sun, Moon, MoreHorizontal } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dropzone from './components/Dropzone';
import PreviewTable from './components/PreviewTable';
import ActionPanel from './components/ActionPanel';
import PricingModal from './components/PricingModal';
import LandingPage from './components/LandingPage';
import LegalModals from './components/LegalModals';
import MessageWorkspace from './components/MessageWorkspace';
import './components/MessageWorkspace.css';
import JSZip from 'jszip';
import { 
  hasProAccess, 
  hasTrialAvailable, 
  markTrialUsed, 
  getWorkstationInfo, 
  activateLicense, 
  deactivateLicense,
  getEffectiveEntitlement,
  getEntitlementLabel,
  TIERS,
} from './utils/license';
import { startCheckout } from './utils/payment';
import { installEvidenceNetworkGuard } from './utils/privacyGuard';
import { 
  parseFilename, 
  generateProposedFilename, 
  validateProposedNames, 
  resolveDuplicates, 
  cleanDescription,
  formatCase
} from './utils/renamer';

function readStripeRouteFromLocation() {
  if (typeof window === 'undefined') {
    return { route: 'landing', product: null, shouldCleanUrl: false };
  }
  const params = new URLSearchParams(window.location.search);
  const stripeStatus = params.get('stripe_status');
  const product = params.get('product');
  if (stripeStatus === 'success') {
    return { route: 'stripe_success', product, shouldCleanUrl: true };
  }
  if (stripeStatus === 'cancel') {
    return { route: 'stripe_cancel', product, shouldCleanUrl: true };
  }
  return { route: 'landing', product: null, shouldCleanUrl: false };
}

export default function App() {
  const initialStripe = readStripeRouteFromLocation();

  // Application Mode Routing: 'landing' | 'messages' | 'workspace' | 'stripe_success' | 'stripe_cancel'
  const [appRoute, setAppRoute] = useState(initialStripe.route);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [renameStats, setRenameStats] = useState({ count: 0, conflicts: 0, time: "0.0s" });
  const [theme, setTheme] = useState(() => localStorage.getItem('exhibitkit_theme') || 'dark');
  const [checkoutProduct] = useState(initialStripe.product);
  
  // Workspace Tier States
  const [isPro, setIsPro] = useState(() => hasProAccess());
  const [tierLabel, setTierLabel] = useState(() => getEntitlementLabel());
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

  // Privacy: block unexpected evidence upload attempts from the processing context
  useEffect(() => {
    return installEvidenceNetworkGuard();
  }, []);

  // Clean Stripe query params after initial route hydration
  useEffect(() => {
    if (initialStripe.shouldCleanUrl) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [initialStripe.shouldCleanUrl]);

  // Apply theme class to document body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('exhibitkit_theme', theme);
  }, [theme]);

  const refreshEntitlementState = () => {
    setIsPro(hasProAccess());
    setTierLabel(getEntitlementLabel());
    setWorkstation(getWorkstationInfo());
  };

  const handleActivateLicense = (key) => {
    const success = activateLicense(key);
    if (success) {
      refreshEntitlementState();
      setIsTrialMode(false);
      setIsDemoMode(false);
      setIsPricingOpen(false);
      setActivationError('');
      setAppRoute('messages');
      const entitlement = getEffectiveEntitlement();
      const label =
        entitlement.tier === TIERS.CASE_PASS ? 'Case Pass' : 'ExhibitKit Pro';
      showNotification(`${label} activated. Evidence still stays on this device.`, 'success');
    } else {
      setActivationError('Invalid license key format. Please double-check your purchase email.');
    }
  };

  const handleDeactivate = () => {
    deactivateLicense();
    refreshEntitlementState();
    setItems([]);
    setDirectoryHandle(null);
    setDirectoryName('');
    setAppRoute('landing');
    showNotification('License deactivated. Local exhibits on disk were not deleted.', 'info');
  };

  const handlePurchaseCasePass = () => {
    const result = startCheckout('case_pass');
    if (result.status === 'configuration_required') {
      setIsPricingOpen(true);
      showNotification(
        'Case Pass checkout link is not configured yet. You can still activate with a Case Pass key, or set VITE_STRIPE_CASE_PASS_LINK.',
        'warning'
      );
      return;
    }
    showNotification('Opening Case Pass checkout. Evidence is not sent to payment.', 'info');
  };

  const handlePurchasePro = () => {
    const result = startCheckout('pro_perpetual');
    if (result.status === 'configuration_required') {
      setIsPricingOpen(true);
      showNotification(result.error, 'warning');
      return;
    }
    showNotification('Opening ExhibitKit Pro checkout. Evidence is not sent to payment.', 'info');
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
    if (items.length === 0 || isPreviewFreezed) return undefined;
    const frame = requestAnimationFrame(() => {
      setItems((prevItems) => updateProposedNames(prevItems));
    });
    return () => cancelAnimationFrame(frame);
  }, [preset, prefix, startNumber, padLength, caseStyle, customTemplate, cleanDesc, isPreviewFreezed, items.length]);

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
      { name: "PX-1 - Contract.pdf" },
      { name: "DX_2_Invoice.pdf" },
      { name: "DEP Jones Exhibit 3.pdf" },
      { name: "DOD - 12 - 2012 - Smith - Report.pdf" },
      { name: "04 - Jones Photo.pdf" },
      { name: "Unstructured Document.pdf" }
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

    const conflictCount = items.filter(item => item.hasConflict || item.status === 'conflict').length;
    const startTime = performance.now();

    if (!directoryHandle) {
      // Fallback: Zipped batch download since there is no local folder handle
      try {
        const zip = new JSZip();
        
        // Add all renamed PDF files to the zip archive
        for (const item of items) {
          if (!item.file) continue;
          zip.file(item.proposedName, item.file);
        }

        // Add CSV Rename Report to the zip archive
        const headers = "Original Filename,Exhibit ID,Proposed Filename,Preset Type\n";
        const rows = items.map(item => {
          const escape = (str) => `"${(str || '').replace(/"/g, '""')}"`;
          return `${escape(item.originalName)},${escape(item.number)},${escape(item.proposedName)},${escape(preset)}`;
        }).join("\n");
        zip.file("exhibit_rename_report.csv", headers + rows);

        // Compress and trigger a single download package
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exhibit_batch_prepared.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const endTime = performance.now();
        const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);

        // Consume Trial if in Trial Mode
        if (isTrialMode) {
          markTrialUsed();
          setIsTrialMode(false);
          setIsDemoMode(true);
          setItems([]);
          showNotification("✨ Free trial batch completed! Upgrade to Pro for unlimited local renames.", "success");
          setIsPricingOpen(true);
        } else {
          showNotification("✨ Successfully exported prepared exhibits folder ZIP!", "success");
        }

        // Trigger Success Stats Popup
        setRenameStats({
          count: items.length,
          conflicts: conflictCount,
          time: `${elapsedSeconds}s`
        });
        setShowSuccessModal(true);
      } catch (err) {
        showNotification("❌ Zipped batch download failed: " + err.message, "danger");
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

      // Automatically write CSV Rename Report directly inside the local folder
      try {
        const headers = "Original Filename,Exhibit ID,Proposed Filename,Preset Type\n";
        const rows = updatedItems.map(item => {
          const escape = (str) => `"${(str || '').replace(/"/g, '""')}"`;
          return `${escape(item.originalName)},${escape(item.number)},${escape(item.proposedName)},${escape(preset)}`;
        }).join("\n");
        const reportContent = headers + rows;

        const reportFileHandle = await directoryHandle.getFileHandle("_exhibit_rename_report.csv", { create: true });
        const writableReport = await reportFileHandle.createWritable();
        await writableReport.write(reportContent);
        await writableReport.close();
      } catch (reportErr) {
        console.error("Failed to write local directory rename report", reportErr);
      }

      setItems(updateProposedNames(updatedItems));
      setLastRenameHistory(history);

      const endTime = performance.now();
      const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);

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

      // Trigger Success Stats Popup
      setRenameStats({
        count: updatedItems.length,
        conflicts: conflictCount,
        time: `${elapsedSeconds}s`
      });
      setShowSuccessModal(true);
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
  const handleStartFree = () => {
    setIsDemoMode(false);
    setIsTrialMode(false);
    setAppRoute('messages');
    showNotification('Free message exhibit workspace ready. Nothing is uploaded.', 'info');
  };

  const handleLaunchDemoMode = () => {
    // Legacy rename sandbox retained for Pro/ops testing
    setIsDemoMode(true);
    setIsTrialMode(false);
    setItems([]);
    setAppRoute('workspace');
    showNotification('Legacy rename demo opened. Message exhibits are available from Home.', 'info');
  };

  const handleLaunchTrialMode = () => {
    if (!hasTrialAvailable()) {
      showNotification('Legacy rename trial used. Use Free message exhibits or purchase Pro.', 'warning');
      setIsPricingOpen(true);
      return;
    }
    setIsTrialMode(true);
    setIsDemoMode(false);
    setItems([]);
    setAppRoute('workspace');
    showNotification('Legacy rename trial active (max 5 PDF files).', 'info');
  };

  // Layout Renderings
  if (appRoute === 'landing') {
    return (
      <>
        <LandingPage
          onStartFree={handleStartFree}
          onOpenPricing={() => setIsPricingOpen(true)}
          onPurchaseCasePass={handlePurchaseCasePass}
          onPurchasePro={handlePurchasePro}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        />
        <PricingModal
          isOpen={isPricingOpen}
          onClose={() => setIsPricingOpen(false)}
          onActivate={handleActivateLicense}
        />
        {notification.show && (
          <div className={`notification ${notification.type}`}>
            <div className="notification-message">{notification.message}</div>
          </div>
        )}
      </>
    );
  }

  if (appRoute === 'messages') {
    return (
      <>
        <MessageWorkspace
          onBack={() => setAppRoute('landing')}
          onOpenPricing={() => setIsPricingOpen(true)}
          showNotification={showNotification}
        />
        <PricingModal
          isOpen={isPricingOpen}
          onClose={() => setIsPricingOpen(false)}
          onActivate={handleActivateLicense}
        />
        {notification.show && (
          <div className={`notification ${notification.type}`}>
            <div className="notification-message">{notification.message}</div>
          </div>
        )}
      </>
    );
  }

  if (appRoute === 'stripe_success') {
    const productLabel =
      checkoutProduct === 'case_pass' ? 'Case Pass' : 'ExhibitKit Pro perpetual license';
    return (
      <div className="landing-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', backgroundColor: 'var(--bg-primary)', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', border: '1px solid var(--status-success-border)' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--status-success-bg)', color: 'var(--status-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <ShieldCheck size={26} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '700' }}>Payment received</h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Your {productLabel} key will be emailed after checkout. Enter it below to activate this browser. Payment is processed separately — your evidence never enters the payment system.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleActivateLicense(licenseInputValue); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="stripe-success-key">Activation license key</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  id="stripe-success-key"
                  type="text" 
                  value={licenseInputValue} 
                  onChange={(e) => setLicenseInputValue(e.target.value)} 
                  placeholder="EKIT-XXXX-XXXX-XXXX or EKIT-CASE-XXXX-XXXX"
                  style={{ flex: 1, fontSize: '13px' }}
                />
                <button type="submit" className="btn btn-success" style={{ flexShrink: 0 }}>
                  Activate
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
            <span>License recovery: <a href="mailto:support@patentpreppers.com" style={{ color: 'var(--text-secondary)' }}>support@patentpreppers.com</a></span>
          </div>

          <button className="btn btn-secondary" onClick={() => setAppRoute('messages')} style={{ width: '100%', fontSize: '13px' }}>
            <ArrowLeft size={14} /> Continue to exhibit workspace
          </button>
        </div>
      </div>
    );
  }

  if (appRoute === 'stripe_cancel') {
    return (
      <div className="landing-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', backgroundColor: 'var(--bg-primary)', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <Info size={24} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Checkout canceled</h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
            No charge was made. You can keep building exhibits on the free plan or return to pricing when ready.
          </p>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={() => setIsPricingOpen(true)} style={{ flex: 1, fontSize: '13px' }}>
              View pricing
            </button>
            <button className="btn btn-secondary" onClick={handleStartFree} style={{ flex: 1, fontSize: '13px' }}>
              Build an exhibit free
            </button>
          </div>
        </div>
        <PricingModal
          isOpen={isPricingOpen}
          onClose={() => setIsPricingOpen(false)}
          onActivate={handleActivateLicense}
        />
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
        className={isMobileSidebarOpen ? 'mobile-open' : ''}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        theme={theme}
      />

      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)}></div>
      )}

      {/* Main Workspace */}
      <div className="main-content">
        {/* Top Header info bar */}
        <div className="top-bar">
          <div className="top-bar-brand">
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => {
                setIsMobileNavOpen(false);
                setIsMobileSidebarOpen(true);
              }}
              title="Open Settings"
              aria-label="Open Settings"
            >
              <Menu size={20} />
            </button>

            <div
              onClick={() => setAppRoute('landing')}
              className="top-bar-logo"
              title="Go to Landing Page"
              id="nav-logo-link"
              role="link"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setAppRoute('landing');
                }
              }}
            >
              <div className="top-bar-logo-mark" aria-hidden="true">⚖</div>
              <span className="top-bar-logo-text">ExhibitKit</span>
            </div>

            <div className="top-bar-badge">
              {isPro ? (
                <span className="badge badge-success">{tierLabel}</span>
              ) : isTrialMode ? (
                <span className="badge badge-warning">Trial</span>
              ) : (
                <span className="badge badge-info">Demo</span>
              )}
            </div>

            {directoryName && (
              <span className="top-bar-folder" title={directoryName}>
                Active Folder: <strong>{directoryName}</strong>
              </span>
            )}
          </div>

          <div className="top-bar-actions">
            <div
              className="top-bar-inplace"
              title={directoryHandle ? 'Active directory connected' : 'No active directory connected'}
            >
              <span className="top-bar-inplace-label">In-Place Mode</span>
              <div
                className={`top-bar-inplace-toggle ${directoryHandle ? 'is-active' : ''}`}
                aria-hidden="true"
              >
                <span className="top-bar-inplace-knob" />
              </div>
            </div>

            {isPro ? (
              <button
                type="button"
                className="top-bar-pro-active"
                onClick={handleDeactivate}
                title="Click to deactivate license on this workstation"
              >
                Pro Active
              </button>
            ) : (
              <button
                type="button"
                className="top-bar-upgrade"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  setIsPricingOpen(true);
                }}
              >
                <span className="top-bar-upgrade-full">Upgrade to Pro</span>
                <span className="top-bar-upgrade-short">Upgrade</span>
              </button>
            )}

            <nav className="top-bar-links" aria-label="Workspace">
              <button
                type="button"
                id="nav-home-btn"
                className="top-bar-link text-link-hover"
                onClick={() => setAppRoute('landing')}
              >
                Home
              </button>
              <button
                type="button"
                className="top-bar-link text-link-hover"
                onClick={() => setAppRoute('messages')}
              >
                Message exhibits
              </button>
              <button
                type="button"
                className="top-bar-link text-link-hover"
                onClick={() => setActiveModal('how')}
              >
                How to Use
              </button>
              <button
                type="button"
                className="top-bar-link text-link-hover"
                onClick={() => setActiveModal('feedback')}
              >
                Feedback
              </button>
            </nav>

            <button
              type="button"
              className="top-bar-theme"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <div className={`top-bar-more ${isMobileNavOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="top-bar-more-btn"
                onClick={() => setIsMobileNavOpen((open) => !open)}
                aria-expanded={isMobileNavOpen}
                aria-haspopup="menu"
                aria-label="More navigation"
                title="More"
              >
                <MoreHorizontal size={18} />
              </button>
              {isMobileNavOpen && (
                <>
                  <button
                    type="button"
                    className="top-bar-more-backdrop"
                    aria-label="Close menu"
                    onClick={() => setIsMobileNavOpen(false)}
                  />
                  <div className="top-bar-more-menu" role="menu">
                    <div className="top-bar-more-status">
                      <span>In-Place Mode</span>
                      <strong className={directoryHandle ? 'is-on' : 'is-off'}>
                        {directoryHandle ? 'Connected' : 'Off'}
                      </strong>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMobileNavOpen(false);
                        setAppRoute('landing');
                      }}
                    >
                      Home
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMobileNavOpen(false);
                        setAppRoute('messages');
                      }}
                    >
                      Message exhibits
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMobileNavOpen(false);
                        handleLaunchDemoMode();
                      }}
                    >
                      Legacy rename demo
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMobileNavOpen(false);
                        handleLaunchTrialMode();
                      }}
                    >
                      Legacy rename trial
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMobileNavOpen(false);
                        setActiveModal('how');
                      }}
                    >
                      How to Use
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMobileNavOpen(false);
                        setActiveModal('feedback');
                      }}
                    >
                      Feedback
                    </button>
                  </div>
                </>
              )}
            </div>
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
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                <button 
                  onClick={handleLoadSampleData} 
                  style={{ 
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-accent)', 
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '4px 8px'
                  }}
                >
                  Load Sample Exhibits (Demo)
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

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
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
      {/* Animated Success Status Popup Modal */}
      {showSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5, 7, 12, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, animation: 'fadeIn 0.25s ease' }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '90%', padding: '36px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', position: 'relative' }}>
            {/* Big green Checkmark icon */}
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '16px', 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              color: '#fff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '32px',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
              fontWeight: 'bold',
              animation: 'slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              ✓
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                {renameStats.count} Exhibits Renamed Successfully
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Files are ready for import into TrialDirector & OnCue.
              </p>
            </div>

            {/* Statistics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', background: 'var(--bg-tertiary)', padding: '20px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>{renameStats.count}</span>
                <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Renamed</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '24px', fontWeight: '800', color: renameStats.conflicts > 0 ? 'var(--status-warning)' : 'var(--text-secondary)' }}>{renameStats.conflicts}</span>
                <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conflicts</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>{renameStats.time}</span>
                <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</span>
              </div>
            </div>

            <button 
              className="btn btn-secondary" 
              onClick={() => setShowSuccessModal(false)}
              style={{ width: '100%', padding: '12px', fontSize: '13.5px', fontWeight: '600', marginTop: '4px' }}
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div 
          className={`notification ${notification.type}`}
          style={{
            backgroundColor: theme === 'light' ? '#ffffff' : '#111827',
            border: `1px solid ${theme === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
            borderLeft: `4px solid ${
              notification.type === 'danger' || notification.type === 'error' ? 'var(--status-danger)' :
              notification.type === 'warning' ? 'var(--status-warning)' :
              notification.type === 'info' ? 'var(--accent-primary)' :
              'var(--status-success)'
            }`,
            boxShadow: theme === 'light' 
              ? '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.08)' 
              : '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexShrink: 0,
            color: notification.type === 'danger' || notification.type === 'error' ? 'var(--status-danger)' :
                   notification.type === 'warning' ? 'var(--status-warning)' :
                   notification.type === 'info' ? 'var(--accent-primary)' :
                   'var(--status-success)'
          }}>
            {notification.type === 'danger' || notification.type === 'error' ? (
              <ShieldAlert size={16} />
            ) : notification.type === 'warning' ? (
              <AlertTriangle size={16} />
            ) : notification.type === 'info' ? (
              <Info size={16} />
            ) : (
              <ShieldCheck size={16} />
            )}
          </div>
          <div 
            className="notification-message"
            style={{
              color: theme === 'light' ? '#0f172a' : '#f3f4f6'
            }}
          >
            {notification.message}
          </div>
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
