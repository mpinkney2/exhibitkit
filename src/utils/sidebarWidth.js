/**
 * Left-rail width. Persisted per browser.
 *
 * v1 treated a missing localStorage value as 0 and clamped it to the minimum,
 * so a first visit was saved at 200px and menu labels truncated. v2 defaults
 * to a width that fits the preset labels. A saved v1 width other than that
 * accidental minimum is kept.
 */

export const SIDEBAR_WIDTH_KEY = 'exhibitkit_sidebar_width_v2';
const LEGACY_SIDEBAR_WIDTH_KEY = 'exhibitkit_sidebar_width_v1';
const LEGACY_ACCIDENTAL_MIN = 200;

export const DEFAULT_SIDEBAR_WIDTH = 280;
export const MIN_SIDEBAR_WIDTH = 220;
export const MAX_SIDEBAR_WIDTH = 480;
export const SIDEBAR_WIDTH_STEP = 16;
export const SIDEBAR_WIDTH_PAGE_STEP = 48;

export function clampSidebarWidth(value) {
  const width = Number(value);
  if (!Number.isFinite(width)) return DEFAULT_SIDEBAR_WIDTH;
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));
}

function readWidth(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (raw == null || String(raw).trim() === '') return null;
    const width = Number(raw);
    if (!Number.isFinite(width)) return null;
    return width;
  } catch {
    return null;
  }
}

export function loadSidebarWidth(storage = localStorage) {
  const saved = readWidth(storage, SIDEBAR_WIDTH_KEY);
  if (saved != null) return clampSidebarWidth(saved);

  const legacy = readWidth(storage, LEGACY_SIDEBAR_WIDTH_KEY);
  if (legacy != null && legacy !== LEGACY_ACCIDENTAL_MIN) {
    return clampSidebarWidth(legacy);
  }
  return DEFAULT_SIDEBAR_WIDTH;
}

export function persistSidebarWidth(width, storage = localStorage) {
  const next = clampSidebarWidth(width);
  try {
    storage.setItem(SIDEBAR_WIDTH_KEY, String(next));
  } catch {
    // Private mode or a full quota should not block resizing.
  }
  return next;
}

export function nudgeSidebarWidth(width, direction, { large = false } = {}) {
  const step = large ? SIDEBAR_WIDTH_PAGE_STEP : SIDEBAR_WIDTH_STEP;
  const delta = direction === 'decrease' ? -step : step;
  return clampSidebarWidth(Number(width) + delta);
}

export function resetSidebarWidth() {
  return DEFAULT_SIDEBAR_WIDTH;
}
