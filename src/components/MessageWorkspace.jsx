import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Eye,
  FilePlus2,
  FolderLock,
  Lock,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  createEmptyProject,
  downloadProjectSnapshot,
  importConversationFile,
} from '../utils/project';
import { getSampleConversation } from '../utils/messageParse';
import { fingerprintSourceFile } from '../utils/hash';
import { downloadBytes, exportProjectPackage } from '../utils/exhibitPdf';
import { hasProFeatures, getEffectiveEntitlement, getEntitlementLabel } from '../utils/license';
import { PRIVACY_PAYMENT_NOTICE } from '../utils/pricing';

export default function MessageWorkspace({
  onBack,
  onOpenPricing,
  showNotification,
}) {
  const [project, setProject] = useState(() => createEmptyProject());
  const [activeExhibitId, setActiveExhibitId] = useState(null);
  const [previewInfo, setPreviewInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);
  const isPro = hasProFeatures();
  const entitlement = getEffectiveEntitlement();
  const tierLabel = getEntitlementLabel();

  const activeExhibit = useMemo(
    () => project.exhibits.find((e) => e.id === activeExhibitId) || project.exhibits[0] || null,
    [project, activeExhibitId]
  );

  const updateProject = (updater) => {
    setProject((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return { ...next, updatedAt: new Date().toISOString() };
    });
  };

  const handleImportFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    if (!isPro && project.exhibits.length >= 1) {
      showNotification?.(
        'Free tier imports one conversation at a time. Clear the current exhibit or upgrade for multiple exhibits.',
        'warning'
      );
      onOpenPricing?.();
      return;
    }

    setBusy(true);
    try {
      const imported = [];
      for (const file of files) {
        if (!isPro && imported.length + project.exhibits.length >= 1) break;
        const exhibit = await importConversationFile(file);
        imported.push(exhibit);
      }
      updateProject((prev) => {
        const exhibits = isPro ? [...prev.exhibits, ...imported] : imported.slice(0, 1);
        return { ...prev, exhibits };
      });
      setActiveExhibitId(imported[0]?.id || null);
      showNotification?.(
        `Imported ${imported.length} conversation${imported.length === 1 ? '' : 's'} locally.`,
        'success'
      );
    } catch (err) {
      showNotification?.(`Import failed: ${err.message}`, 'danger');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadSample = async () => {
    if (!isPro && project.exhibits.length >= 1) {
      updateProject((prev) => ({ ...prev, exhibits: [] }));
    }
    const parsed = getSampleConversation();
    const blob = new Blob(
      [
        parsed.messages
          .map((m) => `[${m.timestamp}] ${m.sender}: ${m.body}`)
          .join('\n'),
      ],
      { type: 'text/plain' }
    );
    const fingerprint = await fingerprintSourceFile(
      new File([blob], 'sample-conversation.txt', { type: 'text/plain' }),
      'sample-conversation.txt'
    );
    const exhibit = {
      id: `exh-sample-${Date.now().toString(36)}`,
      label: 'Exhibit A — Sample Messages',
      sourceFiles: [fingerprint],
      messages: parsed.messages,
      format: parsed.format,
      warnings: [],
    };
    updateProject((prev) => ({
      ...prev,
      caseName: prev.caseName || 'Sample Matter',
      exhibits: isPro ? [...prev.exhibits.filter((e) => !e.id.startsWith('exh-sample')), exhibit] : [exhibit],
    }));
    setActiveExhibitId(exhibit.id);
    showNotification?.('Sample conversation loaded. Nothing was uploaded.', 'info');
  };

  const patchActiveExhibit = (patchFn) => {
    if (!activeExhibit) return;
    updateProject((prev) => ({
      ...prev,
      exhibits: prev.exhibits.map((ex) =>
        ex.id === activeExhibit.id ? patchFn(ex) : ex
      ),
    }));
  };

  const toggleMessage = (messageId) => {
    patchActiveExhibit((ex) => ({
      ...ex,
      messages: ex.messages.map((m) =>
        m.id === messageId ? { ...m, selected: m.selected === false } : m
      ),
    }));
  };

  const redactPhrase = (messageId, phrase) => {
    if (!phrase?.trim()) return;
    patchActiveExhibit((ex) => ({
      ...ex,
      messages: ex.messages.map((m) =>
        m.id === messageId
          ? { ...m, redactions: [...(m.redactions || []), { phrase: phrase.trim() }] }
          : m
      ),
    }));
  };

  const fullyRedact = (messageId) => {
    patchActiveExhibit((ex) => ({
      ...ex,
      messages: ex.messages.map((m) =>
        m.id === messageId ? { ...m, fullyRedacted: true } : m
      ),
    }));
  };

  const handleExport = async () => {
    if (!project.exhibits.length) return;
    setBusy(true);
    try {
      const result = await exportProjectPackage(project, { pro: isPro, zip: isPro });
      setPreviewInfo({
        mode: result.mode,
        files: result.files.map((f) => f.name),
        messageCount: project.exhibits.reduce(
          (n, ex) => n + ex.messages.filter((m) => m.selected !== false).length,
          0
        ),
      });

      if (result.zip) {
        downloadBytes(result.zip.bytes, result.zip.name, 'application/zip');
      } else if (result.files[0]) {
        downloadBytes(result.files[0].bytes, result.files[0].name);
      }
      showNotification?.(
        isPro
          ? 'Pro package exported (binder, index, integrity report, ZIP).'
          : 'Clean exhibit PDF downloaded. No watermark.',
        'success'
      );
    } catch (err) {
      showNotification?.(`Export failed: ${err.message}`, 'danger');
    } finally {
      setBusy(false);
    }
  };

  const handleClear = () => {
    setProject(createEmptyProject({
      caseName: project.caseName,
      court: project.court,
      caption: project.caption,
      numbering: project.numbering,
    }));
    setActiveExhibitId(null);
    setPreviewInfo(null);
    showNotification?.('Workspace cleared. Local files on disk were not modified.', 'info');
  };

  return (
    <div className="message-workspace">
      <header className="message-workspace-bar">
        <div className="message-workspace-bar-left">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={14} /> Home
          </button>
          <div>
            <strong>ExhibitKit</strong>
            <span className="message-tier-badge">{tierLabel}</span>
          </div>
        </div>
        <div className="message-workspace-bar-right">
          <span className="message-privacy-chip">
            <FolderLock size={14} /> Evidence stays on this device
          </span>
          {!isPro && (
            <button type="button" className="btn btn-primary" onClick={onOpenPricing}>
              Upgrade
            </button>
          )}
        </div>
      </header>

      <div className="message-workspace-grid">
        <aside className="message-side-panel" aria-label="Matter details">
          <h2>Matter</h2>
          <label className="form-label" htmlFor="case-name">Case / matter name</label>
          <input
            id="case-name"
            value={project.caseName}
            onChange={(e) => updateProject({ ...project, caseName: e.target.value })}
            placeholder="e.g. Rivera v. Lee"
          />
          <label className="form-label" htmlFor="court-name">Court</label>
          <input
            id="court-name"
            value={project.court}
            onChange={(e) => updateProject({ ...project, court: e.target.value })}
            placeholder="Optional"
          />
          <label className="form-label" htmlFor="caption">Caption</label>
          <textarea
            id="caption"
            rows={3}
            value={project.caption}
            onChange={(e) => updateProject({ ...project, caption: e.target.value })}
            placeholder="Optional caption text"
          />

          {isPro && (
            <>
              <h2>Numbering</h2>
              <label className="form-label" htmlFor="exhibit-prefix">Exhibit prefix</label>
              <input
                id="exhibit-prefix"
                value={project.numbering.exhibitPrefix}
                onChange={(e) =>
                  updateProject({
                    ...project,
                    numbering: { ...project.numbering, exhibitPrefix: e.target.value },
                  })
                }
              />
              <label className="form-label" htmlFor="bates-prefix">Bates prefix</label>
              <input
                id="bates-prefix"
                value={project.numbering.batesPrefix}
                onChange={(e) =>
                  updateProject({
                    ...project,
                    numbering: { ...project.numbering, batesPrefix: e.target.value },
                  })
                }
              />
              <label className="form-label" htmlFor="start-number">Start number</label>
              <input
                id="start-number"
                type="number"
                min={1}
                value={project.numbering.startNumber}
                onChange={(e) =>
                  updateProject({
                    ...project,
                    numbering: {
                      ...project.numbering,
                      startNumber: Number(e.target.value) || 1,
                    },
                  })
                }
              />
            </>
          )}

          <div className="message-side-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => downloadProjectSnapshot(project)}
              disabled={!project.exhibits.length}
              title="Downloads a local project snapshot. Message bodies omitted by default."
            >
              <Download size={14} /> Save project locally
            </button>
            <p className="message-side-note">
              Project save is an explicit local download. Message bodies are omitted by default.
            </p>
          </div>

          {entitlement.expiredCasePass && (
            <p className="message-side-note warning">
              Your Case Pass expired. Previously generated files on your device were not deleted.
              Pro generation for new work requires a new Case Pass or Pro license.
            </p>
          )}
        </aside>

        <section className="message-main-panel" aria-label="Conversation workspace">
          {!activeExhibit ? (
            <div className="message-empty">
              <ShieldCheck size={28} />
              <h1>Turn message history into organized, tamper-evident exhibits.</h1>
              <p>
                Import an exported conversation, review and redact what matters, and create a clean
                PDF tied to the original source — all without uploading your evidence.
              </p>
              <div className="message-empty-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                >
                  <FilePlus2 size={16} /> Import conversation
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleLoadSample}>
                  Load sample conversation
                </button>
              </div>
              <ul className="message-empty-points">
                <li>Native parsing of JSON, CSV, plain text, and SMS XML exports</li>
                <li>SHA-256 fingerprint of the source file</li>
                <li>True redaction — content removed, not covered</li>
                <li>No account · No watermark · Local browser processing</li>
              </ul>
            </div>
          ) : (
            <>
              <div className="message-toolbar">
                <div>
                  <label className="form-label" htmlFor="exhibit-label">Exhibit label</label>
                  <input
                    id="exhibit-label"
                    value={activeExhibit.label}
                    onChange={(e) =>
                      patchActiveExhibit((ex) => ({ ...ex, label: e.target.value }))
                    }
                  />
                </div>
                <div className="message-toolbar-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy || (!isPro && project.exhibits.length >= 1)}
                  >
                    {isPro ? 'Add conversation' : 'Replace conversation'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleClear}>
                    <Trash2 size={14} /> Clear
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleExport}
                    disabled={busy}
                  >
                    <Eye size={14} /> {isPro ? 'Export Pro package' : 'Export PDF exhibit'}
                  </button>
                </div>
              </div>

              {activeExhibit.sourceFiles?.[0] && (
                <div className="message-source-card" aria-label="Source integrity">
                  <div>
                    <strong>Source fingerprint</strong>
                    <span>{activeExhibit.sourceFiles[0].originalName}</span>
                  </div>
                  <code title="SHA-256 of the original source file">
                    SHA-256: {activeExhibit.sourceFiles[0].sha256}
                  </code>
                  <small>
                    This hash shows whether the source file has changed. It does not prove who
                    authored the messages.
                  </small>
                </div>
              )}

              {isPro && project.exhibits.length > 1 && (
                <div className="message-exhibit-tabs" role="tablist" aria-label="Exhibits">
                  {project.exhibits.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      role="tab"
                      aria-selected={ex.id === activeExhibit.id}
                      className={ex.id === activeExhibit.id ? 'active' : ''}
                      onClick={() => setActiveExhibitId(ex.id)}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="message-list" role="list">
                {activeExhibit.messages.map((msg) => (
                  <article
                    key={msg.id}
                    className={`message-row ${msg.selected === false ? 'is-deselected' : ''} ${msg.fullyRedacted ? 'is-redacted' : ''}`}
                    role="listitem"
                  >
                    <label className="message-select">
                      <input
                        type="checkbox"
                        checked={msg.selected !== false}
                        onChange={() => toggleMessage(msg.id)}
                      />
                      <span>Include</span>
                    </label>
                    <div className="message-meta">
                      <strong>MSG-{String(msg.seq).padStart(3, '0')}</strong>
                      <span>{msg.sender}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="message-body">
                      {msg.fullyRedacted ? '[REDACTED]' : msg.body}
                    </p>
                    <div className="message-row-actions">
                      <button type="button" onClick={() => fullyRedact(msg.id)}>
                        Redact entire message
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const phrase = window.prompt('Phrase to redact (true removal):');
                          if (phrase) redactPhrase(msg.id, phrase);
                        }}
                      >
                        Redact phrase…
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {previewInfo && (
                <div className="message-preview-summary" aria-live="polite">
                  <strong>Last export preview</strong>
                  <span>
                    {previewInfo.mode.toUpperCase()} · {previewInfo.messageCount} messages ·{' '}
                    {previewInfo.files.join(', ')}
                  </span>
                </div>
              )}
            </>
          )}

          {!isPro && (
            <p className="message-upgrade-hint">
              <Lock size={14} /> Multiple exhibits, cover pages, binder, and ZIP export are available
              with Case Pass or Pro.{' '}
              <button type="button" className="text-link" onClick={onOpenPricing}>
                Compare plans
              </button>
              <span className="message-payment-privacy">{PRIVACY_PAYMENT_NOTICE}</span>
            </p>
          )}
        </section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.csv,.json,.xml,text/plain,text/csv,application/json,text/xml"
        multiple={isPro}
        hidden
        onChange={(e) => handleImportFiles(e.target.files)}
      />
    </div>
  );
}
