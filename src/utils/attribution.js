/**
 * First-touch and last-touch campaign attribution.
 * Only the public campaign parameters are stored. Exhibit filenames and
 * document contents are never read into this record.
 */

export const ATTRIBUTION_KEYS = Object.freeze([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'li_fat_id',
]);

export const FIRST_TOUCH_STORAGE_KEY = 'exhibitkit_attr_first_v1';
export const LAST_TOUCH_STORAGE_KEY = 'exhibitkit_attr_last_v1';

const UTM_MAX_LENGTH = 150;
const FAT_ID_MAX_LENGTH = 200;

export function sanitizeAttributionValue(key, value) {
  const max = key === 'li_fat_id' ? FAT_ID_MAX_LENGTH : UTM_MAX_LENGTH;
  return String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, max);
}

export function attributionFromSearch(search = '') {
  const params = new URLSearchParams(typeof search === 'string' ? search : '');
  const record = {};
  for (const key of ATTRIBUTION_KEYS) {
    const clean = sanitizeAttributionValue(key, params.get(key));
    if (clean) record[key] = clean;
  }
  return record;
}

export function campaignParamsForCheckout(attribution) {
  const record = {};
  if (!attribution || typeof attribution !== 'object') return record;
  for (const key of ATTRIBUTION_KEYS) {
    const clean = sanitizeAttributionValue(key, attribution[key]);
    if (clean) record[key] = clean;
  }
  return record;
}

function hasAttribution(record) {
  return Boolean(record) && ATTRIBUTION_KEYS.some((key) => record[key]);
}

function browserStorages() {
  const root = globalThis;
  return {
    local: root.localStorage,
    session: root.sessionStorage,
  };
}

function readRecord(storage, storageKey) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const record = campaignParamsForCheckout(parsed);
    return hasAttribution(record) ? record : null;
  } catch {
    return null;
  }
}

function writeRecord(storage, storageKey, record) {
  if (!storage) return;
  try {
    storage.setItem(storageKey, JSON.stringify({
      ...campaignParamsForCheckout(record),
      capturedAt: new Date().toISOString(),
    }));
  } catch {
    // Private mode and quota errors should not block the page.
  }
}

/**
 * Persist campaign parameters from a landing URL.
 * First touch is written once to localStorage. Last touch is replaced on each
 * landing that actually carries campaign parameters, in both localStorage and
 * sessionStorage. A landing with none of those parameters leaves storage as it is.
 */
export function captureLandingAttribution(search = globalThis.location?.search || '', storages = browserStorages()) {
  const incoming = attributionFromSearch(search);
  const local = storages?.local;
  const session = storages?.session;
  if (!hasAttribution(incoming)) {
    return {
      captured: false,
      first: readRecord(local, FIRST_TOUCH_STORAGE_KEY),
      last: readRecord(session, LAST_TOUCH_STORAGE_KEY) || readRecord(local, LAST_TOUCH_STORAGE_KEY),
    };
  }

  if (!readRecord(local, FIRST_TOUCH_STORAGE_KEY)) {
    writeRecord(local, FIRST_TOUCH_STORAGE_KEY, incoming);
  }
  writeRecord(local, LAST_TOUCH_STORAGE_KEY, incoming);
  writeRecord(session, LAST_TOUCH_STORAGE_KEY, incoming);

  return {
    captured: true,
    first: readRecord(local, FIRST_TOUCH_STORAGE_KEY),
    last: incoming,
  };
}

/** Last touch wins. First touch is the fallback when this browser has no later campaign. */
export function readCheckoutAttribution(storages = browserStorages()) {
  const local = storages?.local;
  const session = storages?.session;
  return readRecord(session, LAST_TOUCH_STORAGE_KEY)
    || readRecord(local, LAST_TOUCH_STORAGE_KEY)
    || readRecord(local, FIRST_TOUCH_STORAGE_KEY)
    || {};
}
