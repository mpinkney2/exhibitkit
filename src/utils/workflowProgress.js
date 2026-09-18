export const RENAME_WORKFLOW_STEPS = Object.freeze([
  { id: 'select', label: 'Select' },
  { id: 'review', label: 'Review' },
  { id: 'rename', label: 'Rename' },
]);

export const MESSAGE_WORKFLOW_STEPS = Object.freeze([
  { id: 'import', label: 'Import' },
  { id: 'review', label: 'Review' },
  { id: 'export', label: 'Export' },
]);

/**
 * Linear stage for the exhibit renaming workspace.
 * @param {{ itemCount?: number, hasRenamed?: boolean }} state
 * @returns {number} current step index
 */
export function getRenameWorkflowIndex({ itemCount = 0, hasRenamed = false } = {}) {
  if (hasRenamed) return 2;
  if (itemCount > 0) return 1;
  return 0;
}

/**
 * Linear stage for the message-exhibit workspace.
 * @param {{ exhibitCount?: number, hasExported?: boolean }} state
 * @returns {number} current step index
 */
export function getMessageWorkflowIndex({ exhibitCount = 0, hasExported = false } = {}) {
  if (hasExported) return 2;
  if (exhibitCount > 0) return 1;
  return 0;
}
