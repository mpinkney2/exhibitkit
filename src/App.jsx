import { lazy, Suspense, useState, useEffect } from 'react';
import { ShieldAlert, Info, AlertTriangle, ShieldCheck, ArrowLeft, Menu, Sun, Moon, MoreHorizontal } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dropzone from './components/Dropzone';
import PreviewTable from './components/PreviewTable';
import ActionPanel from './components/ActionPanel';
import PricingModal from './components/PricingModal';
import LandingPage from './components/LandingPage';
import LegalModals from './components/LegalModals';
import JSZip from 'jszip';
import {
  getEntitlement,
  hasProFeatures,
  isWithinFreeFileLimit,
  getEntitlementLabel,
  restoreFromLicenseKey,
  clearEntitlement,
  deactivateCurrentWorkstation,
  refreshVerifiedEntitlementStatus,
  getWorkstationInfo,
  FREE_MAX_FILES_PER_BATCH,
  migrateLegacyLicenseIfNeeded,
} from './utils/entitlement';
import { 
  parseFilename, 
  generateProposedFilename, 
  validateProposedNames, 
  resolveDuplicates, 
  cleanDescription,
  formatCase
} from './utils/renamer';
import { PRO_PRICE_LABEL } from './utils/payment';

// Always available; production unlock is server-gated via /api/founder/unlock.
const FounderAdmin = lazy(() => import('./components/FounderAdmin'));

function getInitialAppRoute() {
  const stripeStatus = new URLSearchParams(window.location.search).get('stripe_status');
  if (stripeStatus === 'success') return 'stripe_success';
  if (stripeStatus === 'cancel') return 'stripe_cancel';
  return hasProFeatures(getEntitlement()) ? 'workspace' : 'landing';
}

function escapeCsvCell(value) {
  let text = String(value ?? '');
  if (/^[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export default function App() {
  // Application Mode Routing: 'landing' | 'workspace' | 'stripe_success' | 'stripe_cancel'
  const [appRoute, setAppRoute] = useState(getInitialAppRoute);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [renameStats, setRenameStats] = useState({ count: 0, conflicts: 0, time: "0.0s" });
  const [theme, setTheme] = useState(() => localStorage.getItem('exhibitkit_theme') || 'light');
  
  // Entitlement (free | case_pass | pro_perpetual)
  const [entitlement, setEntitlement] = useState(() => {
    migrateLegacyLicenseIfNeeded();
    return getEntitlement();
  });
  const isPro = hasProFeatures(entitlement);
  const planLabel = getEntitlementLabel(entitlement);

  // Workstation Profile Info
  const [workstation] = useState(getWorkstationInfo);

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
  const [pricingIntent, setPricingIntent] = useState('purchase');
  const [licenseInputValue, setLicenseInputValue] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activationInProgress, setActivationInProgress] = useState(false);
  const [activationNeedsTransfer, setActivationNeedsTransfer] = useState(false);

  const openPricing = (intent = 'purchase') => {
    setPricingIntent(intent);
    setIsPricingOpen(true);
  };

  // Active Legal/Support Modals: null | 'terms' | 'privacy' | 'support' | 'how'
  const [activeModal, setActiveModal] = useState(null);

  const isDirectoryApiSupported = 'showDirectoryPicker' in window;

  // Clear Stripe status params after the initial route has been derived.
  useEffect(() => {
    const stripeStatus = new URLSearchParams(window.location.search).get('stripe_status');
    if (stripeStatus === 'success' || stripeStatus === 'cancel') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Apply theme class to document body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('exhibitkit_theme', theme);
  }, [theme]);

  const handleActivateLicense = async (key, confirmTransfer = false) => {
    setActivationInProgress(true);
    setActivationError('');
    const result = await restoreFromLicenseKey(key, {
      workstationId: workstation.deviceId,
      confirmTransfer,
    });
    setActivationInProgress(false);
    if (result.ok) {
      setActivationNeedsTransfer(false);
      setEntitlement(result.entitlement);
      setIsPricingOpen(false);
      setActivationError('');
      setAppRoute('workspace');
      showNotification("ExhibitKIT Pro restored on this workstation.", "success");
    } else {
      setActivationNeedsTransfer(Boolean(result.needsTransfer));
      setActivationError(result.error || "Invalid license key. Please double-check your purchase email.");
    }
  };

  const handleEntitlementActivated = (next) => {
    setEntitlement(next || getEntitlement());
    setIsPricingOpen(false);
    setAppRoute('workspace');
    showNotification("ExhibitKIT Pro restored on this workstation.", "success");
  };

  const handleDeactivate = async () => {
    const deactivation = await deactivateCurrentWorkstation(entitlement);
    clearEntitlement();
    setEntitlement(getEntitlement());
    setItems([]);
    setDirectoryHandle(null);
    setDirectoryName("");
    setAppRoute('landing');
    showNotification(
      deactivation.offline
        ? "License cleared locally. Use your key to transfer if the former seat remains reserved."
        : "License deactivated on this workstation.",
      deactivation.offline ? "warning" : "info"
    );
  };

  // Helper to trigger alert notifications
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  // Reconcile server-issued activations on startup and periodically. Previously
  // verified perpetual licenses remain usable during a temporary network outage.
  useEffect(() => {
    let cancelled = false;

    const refreshLicense = async () => {
      const current = getEntitlement();
      const result = await refreshVerifiedEntitlementStatus(current);
      if (cancelled) return;

      if (result.ok && result.entitlement) {
        setEntitlement(result.entitlement);
      } else if (result.invalid) {
        clearEntitlement();
        setEntitlement(getEntitlement());
        setAppRoute('landing');
      }
    };

    refreshLicense();
    const interval = window.setInterval(refreshLicense, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
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

  const handleRuleChange = (ruleName, value) => {
    if (isPreviewFreezed) return;

    const setters = {
      preset: setPreset,
      prefix: setPrefix,
      startNumber: setStartNumber,
      padLength: setPadLength,
      caseStyle: setCaseStyle,
      customTemplate: setCustomTemplate,
      cleanDesc: setCleanDesc
    };

    setters[ruleName](value);
    setItems(prevItems => (
      prevItems.length > 0
        ? updateProposedNames(prevItems, { [ruleName]: value })
        : prevItems
    ));
  };

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
    setItems(prevItems => (
      prevItems.length > 0 ? updateProposedNames(prevItems, settings) : prevItems
    ));
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

      // Free: up to 5 real files per batch (not a one-time consume limit)
      if (!isWithinFreeFileLimit(files.length, entitlement)) {
        showNotification(
          `Free includes up to ${FREE_MAX_FILES_PER_BATCH} files per batch. Reduce this batch or upgrade for unlimited batches.`,
          "danger"
        );
        setIsPricingOpen(true);
        return;
      }

      setDirectoryHandle(handle);
      setDirectoryName(handle.name);

      // Sort files alphabetically to ensure consistent auto-sequencing
      files.sort((a, b) => a.originalName.localeCompare(b.originalName, undefined, { numeric: true }));

      const itemsWithProposed = updateProposedNames(files);
      setItems(itemsWithProposed);
      showNotification(`Loaded ${files.length} PDF exhibits from "${handle.name}".`, "success");
    } catch (err) {
      if (err.name !== 'AbortError') {
        showNotification("Directory picker error: " + err.message, "danger");
      }
    }
  };

  // Handle drag and drop file ingestion
  const handleFilesDrop = (filesList) => {
    // Free: up to 5 real files per batch (not a one-time consume limit)
    if (!isWithinFreeFileLimit(filesList.length, entitlement)) {
      showNotification(
        `Free includes up to ${FREE_MAX_FILES_PER_BATCH} files per batch. Reduce this batch or upgrade for unlimited batches.`,
        "danger"
      );
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
    showNotification(`Added ${newItems.length} PDF files for batch preparation.`, "success");
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

    // In-place rename and ZIP batch export require Case Pass or Pro
    if (!isPro) {
      const hasRealFiles = items.some((item) => item.file || item.handle);
      if (hasRealFiles) {
        showNotification(
          "In-place renaming and ZIP export require a Case Pass or ExhibitKit Pro. Free includes preview and CSV/HTML export (up to 5 files per batch).",
          "warning"
        );
        setIsPricingOpen(true);
        return;
      }
    }

    // Open backup checkbox confirmation
    setBackupConfirmed(false);
    setShowBackupModal(true);
  };

  // Rename Execution
  const handleRenameExecute = async () => {
    setShowBackupModal(false);

    if (items.some(item => item.status !== 'success')) {
      showNotification("⚠️ The batch changed and now contains filename issues. Review the preview before trying again.", "warning");
      return;
    }
    
    // Freeze preview state before renaming to block mid-operation changes
    setIsPreviewFreezed(true);

    const conflictCount = items.filter(item => item.status === 'warning').length;
    const startTime = performance.now();
    const renameMap = items.map(item => ({
      originalName: item.originalName,
      number: item.number,
      proposedName: item.proposedName
    }));

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
        const rows = renameMap.map(item => {
          return `${escapeCsvCell(item.originalName)},${escapeCsvCell(item.number)},${escapeCsvCell(item.proposedName)},${escapeCsvCell(preset)}`;
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

        showNotification("Successfully exported prepared exhibits ZIP.", "success");

        // Trigger Success Stats Popup
        setRenameStats({
          count: items.length,
          conflicts: conflictCount,
          time: `${elapsedSeconds}s`
        });
        setShowSuccessModal(true);
      } catch (err) {
        showNotification("Zipped batch download failed: " + err.message, "danger");
      } finally {
        setIsPreviewFreezed(false);
      }
      return;
    }

    // Direct In-place folder renaming
    try {
      const history = [];
      const updatedItems = [...items];

      // Fail before changing any files if a target name already exists.
      for (const item of updatedItems) {
        if (item.originalName.toLowerCase() === item.proposedName.toLowerCase()) continue;

        try {
          await directoryHandle.getFileHandle(item.proposedName);
          throw new Error(`A file named "${item.proposedName}" already exists in this folder.`);
        } catch (error) {
          if (error.name !== 'NotFoundError') throw error;
        }
      }

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
        const rows = renameMap.map(item => {
          return `${escapeCsvCell(item.originalName)},${escapeCsvCell(item.number)},${escapeCsvCell(item.proposedName)},${escapeCsvCell(preset)}`;
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

      showNotification(`Successfully renamed ${history.length} exhibits inside "${directoryName}".`, "success");

      // Trigger Success Stats Popup
      setRenameStats({
        count: updatedItems.length,
        conflicts: conflictCount,
        time: `${elapsedSeconds}s`
      });
      setShowSuccessModal(true);
    } catch (err) {
      showNotification("Renaming operation failed: " + err.message, "danger");
      console.error(err);
    } finally {
      setIsPreviewFreezed(false);
    }
  };

  // Undo Rename (Case Pass or Pro)
  const handleUndo = async () => {
    if (!isPro) {
      showNotification("Reverting renames requires a Case Pass or ExhibitKit Pro.", "warning");
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

  // CSV Map Export utility (available on Free, including real files within the Free batch limit)
  const handleExportCsv = () => {
    if (items.length === 0) return;

    try {
      const headers = "Original Filename,Exhibit ID,Proposed Filename,Preset Type\n";
      const rows = items.map(item => {
        return `${escapeCsvCell(item.originalName)},${escapeCsvCell(item.number)},${escapeCsvCell(item.proposedName)},${escapeCsvCell(preset)}`;
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
    const defaults = {
      preset: 'oncue',
      prefix: 'PX',
      startNumber: 1,
      padLength: 3,
      caseStyle: 'title',
      customTemplate: '{Prefix}{Number} - {Description}',
      cleanDesc: true
    };
    setPreset(defaults.preset);
    setPrefix(defaults.prefix);
    setStartNumber(defaults.startNumber);
    setPadLength(defaults.padLength);
    setCaseStyle(defaults.caseStyle);
    setCustomTemplate(defaults.customTemplate);
    setCleanDesc(defaults.cleanDesc);
    setItems(prevItems => (
      prevItems.length > 0 ? updateProposedNames(prevItems, defaults) : prevItems
    ));
    showNotification("🔄 Naming rules reset to default OnCue PX-001.", "success");
  };

  // Route Launchers
  const handleLaunchFree = () => {
    setItems([]);
    setDirectoryHandle(null);
    setDirectoryName("");
    setAppRoute('workspace');
    showNotification(
      `Free workspace ready — up to ${FREE_MAX_FILES_PER_BATCH} files per batch, or load sample exhibits.`,
      "info"
    );
  };

  // Layout Renderings
  const founderAdmin = (
    <Suspense fallback={null}>
      <FounderAdmin
        appRoute={appRoute}
        entitlement={entitlement}
        onEntitlementChange={(next) => setEntitlement(next || getEntitlement())}
        onSetRoute={setAppRoute}
        onOpenPricing={() => setIsPricingOpen(true)}
        onClosePricing={() => setIsPricingOpen(false)}
        onLaunchWorkspace={handleLaunchFree}
      />
    </Suspense>
  );

  if (appRoute === 'landing') {
    return (
      <>
        <LandingPage
          onLaunchFree={handleLaunchFree}
          onOpenPricing={() => openPricing('purchase')}
          onRestoreLicense={() => openPricing('restore')}
          theme={theme}
          onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        />
        <PricingModal
          isOpen={isPricingOpen}
          onClose={() => setIsPricingOpen(false)}
          onActivated={handleEntitlementActivated}
          workstationId={workstation.deviceId}
          initialView={pricingIntent}
        />
        {founderAdmin}
      </>
    );
  }

  if (appRoute === 'stripe_success') {
    return (
      <>
      <div className="landing-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', backgroundColor: 'var(--bg-primary)', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', border: '1px solid var(--status-success-border)' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--status-success-bg)', color: 'var(--status-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <ShieldCheck size={26} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '700' }}>Checkout Complete</h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Your license key will be delivered to the email used at checkout. Enter the key below to restore access on this workstation. Pro access does not expire; Case Pass access lasts 30 consecutive days from purchase.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleActivateLicense(licenseInputValue); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Activation License Key</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={licenseInputValue} 
                  onChange={(e) => {
                    setLicenseInputValue(e.target.value);
                    setActivationError('');
                    setActivationNeedsTransfer(false);
                  }}
                  placeholder="Format: EKIT-XXXX-XXXX-XXXX-XXXX"
                  style={{ flex: 1, fontSize: '13px' }}
                />
                <button type="submit" className="btn btn-success" disabled={activationInProgress} style={{ flexShrink: 0 }}>
                  {activationInProgress ? 'Verifying…' : 'Activate Pro'}
                </button>
              </div>
            </div>

            {activationError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-danger)', fontSize: '11px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', padding: '8px 12px', borderRadius: '6px' }}>
                <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                <span>{activationError}</span>
              </div>
            )}

            {activationNeedsTransfer && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={activationInProgress}
                onClick={() => handleActivateLicense(licenseInputValue, true)}
              >
                Transfer license here and deactivate the former workstation
              </button>
            )}
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
            <span>📧 Technical issues or license recovery? Contact <a href="mailto:support@patentpreppers.com" style={{ color: 'var(--text-secondary)' }}>support@patentpreppers.com</a></span>
          </div>

          <button className="btn btn-secondary" onClick={() => setAppRoute('workspace')} style={{ width: '100%', fontSize: '13px' }}>
            <ArrowLeft size={14} /> Continue to Demo Workspace
          </button>
        </div>
      </div>
      {founderAdmin}
      </>
    );
  }

  if (appRoute === 'stripe_cancel') {
    return (
      <>
      <div className="landing-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', backgroundColor: 'var(--bg-primary)', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <Info size={24} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Checkout Canceled</h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
            Checkout was canceled. You can continue with Free (up to 5 files per batch) or return to pricing when you are ready.
          </p>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={() => openPricing('purchase')} style={{ flex: 1, fontSize: '13px' }}>
              Buy Pro — {PRO_PRICE_LABEL}
            </button>
            <button className="btn btn-secondary" onClick={handleLaunchFree} style={{ flex: 1, fontSize: '13px' }}>
              Rename exhibits free
            </button>
          </div>
        </div>
      </div>
      {isPricingOpen && (
        <PricingModal 
          isOpen={isPricingOpen} 
          onClose={() => setIsPricingOpen(false)} 
          onActivated={handleEntitlementActivated}
          workstationId={workstation.deviceId}
          initialView={pricingIntent}
        />
      )}
      {founderAdmin}
      </>
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
        setPreset={(value) => handleRuleChange('preset', value)}
        prefix={prefix}
        setPrefix={(value) => handleRuleChange('prefix', value)}
        startNumber={startNumber}
        setStartNumber={(value) => handleRuleChange('startNumber', value)}
        padLength={padLength}
        setPadLength={(value) => handleRuleChange('padLength', value)}
        caseStyle={caseStyle}
        setCaseStyle={(value) => handleRuleChange('caseStyle', value)}
        customTemplate={customTemplate}
        setCustomTemplate={(value) => handleRuleChange('customTemplate', value)}
        cleanDesc={cleanDesc}
        setCleanDesc={(value) => handleRuleChange('cleanDesc', value)}
        onReset={handleResetRules}
        isPro={isPro}
        onApplySettings={handleApplyProfileSettings}
        onOpenModal={(type) => setActiveModal(type)}
        onShowNotification={showNotification}
        className={isMobileSidebarOpen ? 'mobile-open' : ''}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
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
              <span className="top-bar-logo-copy">
                <small>Patent Preppers™</small>
                <strong className="top-bar-logo-text">ExhibitKIT</strong>
              </span>
            </div>

            <div className="top-bar-badge">
              {planLabel === 'Pro' || planLabel === 'Firm' ? (
                <span className="badge badge-success">{planLabel}</span>
              ) : planLabel === 'Case Pass' ? (
                <span className="badge badge-warning">Case Pass</span>
              ) : (
                <span className="badge badge-info">Free</span>
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
                  openPricing('purchase');
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                {!isPro && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Free: up to {FREE_MAX_FILES_PER_BATCH} files per batch
                  </span>
                )}
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
                  Load Sample Exhibits
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
                planLabel={planLabel}
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
        onActivated={handleEntitlementActivated}
        workstationId={workstation.deviceId}
        initialView={pricingIntent}
      />

      {/* Legal & Operational support overlays */}
      <LegalModals 
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
      />

      {founderAdmin}
    </div>
  );
}
