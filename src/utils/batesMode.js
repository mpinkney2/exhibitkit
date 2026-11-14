import {
  BATES_MODE_AS_EXHIBIT_ID,
  BATES_MODE_SEQUENTIAL,
  DEFAULT_BATES_MODE,
} from './renamer.js';

export {
  BATES_MODE_AS_EXHIBIT_ID,
  BATES_MODE_SEQUENTIAL,
  DEFAULT_BATES_MODE,
};

export const BATES_MODE_STORAGE_KEY = 'exhibitkit_bates_mode_v1';

function resolveStore(storage) {
  if (storage) return storage;
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

/**
 * Saved Bates naming choice. Unknown or missing values use sequential numbering.
 * @param {Storage} [storage]
 * @returns {'sequential'|'as-exhibit-id'}
 */
export function readBatesMode(storage) {
  const store = resolveStore(storage);
  if (!store) return DEFAULT_BATES_MODE;
  try {
    const value = store.getItem(BATES_MODE_STORAGE_KEY);
    if (value === BATES_MODE_AS_EXHIBIT_ID || value === BATES_MODE_SEQUENTIAL) return value;
  } catch {
    // Private mode or a blocked store keeps the default.
  }
  return DEFAULT_BATES_MODE;
}

/**
 * @param {'sequential'|'as-exhibit-id'} mode
 * @param {Storage} [storage]
 */
export function writeBatesMode(mode, storage) {
  const store = resolveStore(storage);
  const safe = mode === BATES_MODE_AS_EXHIBIT_ID
    ? BATES_MODE_AS_EXHIBIT_ID
    : DEFAULT_BATES_MODE;
  if (!store) return safe;
  store.setItem(BATES_MODE_STORAGE_KEY, safe);
  return safe;
}
