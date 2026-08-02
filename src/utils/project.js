/**
 * Browser-local project model for message-evidence exhibits.
 * Evidence is held in memory. Persistence is an explicit local download only.
 */

import { fingerprintSourceFile } from './hash';
import { parseMessageExport } from './messageParse';

export function createEmptyProject(overrides = {}) {
  return {
    id: overrides.id || `proj-${Date.now().toString(36)}`,
    caseName: overrides.caseName || '',
    court: overrides.court || '',
    caption: overrides.caption || '',
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    numbering: {
      exhibitPrefix: 'EX',
      batesPrefix: 'BATES',
      startNumber: 1,
      padLength: 3,
      ...(overrides.numbering || {}),
    },
    exhibits: overrides.exhibits || [],
    namingPresets: overrides.namingPresets || [],
  };
}

export function createExhibitShell(overrides = {}) {
  return {
    id: overrides.id || `exh-${Date.now().toString(36)}`,
    label: overrides.label || 'Exhibit A',
    sourceFiles: overrides.sourceFiles || [],
    messages: overrides.messages || [],
    format: overrides.format || null,
    warnings: overrides.warnings || [],
  };
}

/**
 * Import a conversation file into an exhibit (in-memory only).
 * @param {File} file
 * @param {object} [exhibitOverrides]
 */
export async function importConversationFile(file, exhibitOverrides = {}) {
  const text = await file.text();
  const parsed = parseMessageExport(text, { fileName: file.name });
  const fingerprint = await fingerprintSourceFile(file, file.name);

  return createExhibitShell({
    ...exhibitOverrides,
    label: exhibitOverrides.label || deriveLabelFromFileName(file.name),
    sourceFiles: [
      {
        ...fingerprint,
        // Intentionally omit file contents from the project model snapshot
      },
    ],
    messages: parsed.messages,
    format: parsed.format,
    warnings: parsed.warnings,
  });
}

function deriveLabelFromFileName(name) {
  return (name || 'Messages').replace(/\.[^.]+$/, '').slice(0, 80) || 'Messages';
}

/**
 * Build a privacy-safe project snapshot for optional local download.
 * Message bodies that are selected/redacted may be included only when explicitly requested.
 * By default, evidence message bodies are excluded from the downloadable project file.
 */
export function serializeProjectForLocalDownload(project, options = {}) {
  const includeMessageBodies = options.includeMessageBodies === true;
  const snapshot = {
    schema: 'exhibitkit.project.v1',
    notice:
      'This file was saved locally by ExhibitKit. It was not uploaded. Re-import source files to regenerate exhibits if message bodies were omitted.',
    exportedAt: new Date().toISOString(),
    caseName: project.caseName,
    court: project.court,
    caption: project.caption,
    numbering: project.numbering,
    namingPresets: project.namingPresets || [],
    exhibits: (project.exhibits || []).map((ex) => ({
      id: ex.id,
      label: ex.label,
      format: ex.format,
      sourceFiles: (ex.sourceFiles || []).map((s) => ({
        originalName: s.originalName,
        byteSize: s.byteSize,
        sha256: s.sha256,
        mimeType: s.mimeType,
      })),
      messages: (ex.messages || []).map((m) => ({
        id: m.id,
        seq: m.seq,
        timestamp: m.timestamp,
        sender: m.sender,
        selected: m.selected !== false,
        fullyRedacted: Boolean(m.fullyRedacted),
        redactions: m.redactions || [],
        ...(includeMessageBodies ? { body: m.body } : {}),
      })),
    })),
  };
  return JSON.stringify(snapshot, null, 2);
}

export function downloadProjectSnapshot(project, options = {}) {
  const json = serializeProjectForLocalDownload(project, options);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(project.caseName || 'exhibitkit-project').replace(/[^\w-]+/g, '_')}.exhibitkit.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
