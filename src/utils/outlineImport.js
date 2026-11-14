/**
 * Outline-order matching for a hot-seat exhibit list.
 *
 * A pasted citation matches a loaded file by its official exhibit number.
 * Zero-padding, spacing, prefix case, and hyphen / underscore / no-separator
 * variants all match. A trailing page, page range, or page:line citation is
 * stored separately and is not part of the exhibit number. The same file
 * cited twice stays one staged file; both citations are kept.
 */

import { EXHIBIT_PREFIX_LIST, sortItems } from './renamer.js';

const EXHIBIT_PREFIXES = EXHIBIT_PREFIX_LIST.join('|');
const KNOWN_PREFIXES = new Set(EXHIBIT_PREFIX_LIST);

export const ACCEPTED_EXHIBIT_EXTENSIONS = Object.freeze([
  '.pdf',
  '.mp4',
  '.mov',
  '.m4v',
  '.webm',
  '.avi',
  '.wmv',
  '.mkv',
  '.ppt',
  '.pptx',
]);

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.avi', '.wmv', '.mkv']);
const SLIDE_EXTENSIONS = new Set(['.ppt', '.pptx']);

const PAGE_MARKER_SUFFIX = /\s+(?:at\s+)?(?:pp\.?|pages?|p\.?)\s+(\d{1,4}(?:\s*[-–—]\s*\d{1,4})?)\s*$/i;
const AT_PAGE_SUFFIX = /\s+at\s+(\d{1,4}(?:\s*[-–—]\s*\d{1,4})?)\s*$/i;
const PAGE_LINE_SUFFIXES = [
  /\s+(\d{1,4}:\d{1,3}\s*[-–—]\s*\d{1,4}:\d{1,3})\s*$/,
  /\s+(\d{1,4}:\d{1,3}\s*[-–—]\s*\d{1,3})\s*$/,
  /\s+(\d{1,4}:\d{1,3})\s*$/,
];

export function fileExtension(name) {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(String(name || ''));
  return match ? `.${match[1].toLowerCase()}` : '';
}

export function isAcceptedExhibitName(name) {
  const extension = fileExtension(name);
  return ACCEPTED_EXHIBIT_EXTENSIONS.includes(extension);
}

export function acceptAttribute() {
  return ACCEPTED_EXHIBIT_EXTENSIONS.join(',');
}

/**
 * V for video, D for a slide deck or a demonstrative, otherwise blank.
 * @param {string} filename
 * @param {string} [prefix]
 * @returns {'video'|'demonstrative'|'exhibit'}
 */
export function inferMediaKind(filename, prefix = '') {
  const extension = fileExtension(filename);
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (SLIDE_EXTENSIONS.has(extension)) return 'demonstrative';
  if (String(prefix || '').toUpperCase() === 'GFX') return 'demonstrative';
  if (/\bdemonstratives?\b/i.test(String(filename || ''))) return 'demonstrative';
  return 'exhibit';
}

export function typePrefixForKind(kind) {
  if (kind === 'video') return 'V';
  if (kind === 'demonstrative') return 'D';
  return '';
}

function isCalendarYear(digits) {
  return /^(?:19|20)\d{2}$/.test(digits);
}

/**
 * Official exhibit number as it is written on the file, including padding and separators.
 * @param {string} filename
 * @returns {string}
 */
export function extractOfficialExhibitNumber(filename) {
  const base = String(filename || '').replace(/\.[^.]+$/, '').trim();
  if (!base) return '';

  const known = new RegExp(`^(?:${EXHIBIT_PREFIXES})\\s*[-_ ]?\\s*\\d+[A-Za-z]?`, 'i');
  const knownMatch = known.exec(base);
  if (knownMatch) return base.slice(0, knownMatch[0].length).trim();

  const hyphenated = /^[A-Za-z]{1,8}\s*[-_]\s*\d+[A-Za-z]?/;
  const hyphenatedMatch = hyphenated.exec(base);
  if (hyphenatedMatch) return base.slice(0, hyphenatedMatch[0].length).trim();

  const spaced = /^([A-Za-z]{1,8})\s+(\d+[A-Za-z]?)(?=$|[\s._-])/;
  const spacedMatch = spaced.exec(base);
  if (spacedMatch) {
    const digits = spacedMatch[2].match(/\d+/)?.[0] || '';
    const rest = base.slice(spacedMatch[0].length).trim();
    if (!(isCalendarYear(digits) && rest)) {
      return base.slice(0, spacedMatch[0].length).trim();
    }
  }

  const wordy = new RegExp(`^(?:${EXHIBIT_PREFIXES})\\s+.+?\\s+Exhibit\\s+\\d+[A-Za-z]?`, 'i');
  const wordyMatch = wordy.exec(base);
  if (wordyMatch) return base.slice(0, wordyMatch[0].length).trim();

  const leading = /^(\d+[A-Za-z]?)(?=$|[\s._-])/;
  const leadingMatch = leading.exec(base);
  if (leadingMatch && !isCalendarYear(leadingMatch[1])) return leadingMatch[1];

  return '';
}

/**
 * Comparable key: prefix, significant digits, optional letter suffix.
 * `PX-0142`, `px 142`, and `PX_142` share a key. `PX-0142A` does not.
 * @param {string} official
 * @returns {string}
 */
/**
 * Title text that follows the official exhibit number, without cleaning hyphens away.
 * @param {string} filename
 * @param {string} officialExhibitNo
 * @returns {string}
 */
export function descriptionAfterOfficialNumber(filename, officialExhibitNo) {
  const base = String(filename || '').replace(/\.[^.]+$/, '').trim();
  const official = String(officialExhibitNo || '').trim();
  if (official && base.slice(0, official.length).toLowerCase() === official.toLowerCase()) {
    return base.slice(official.length).replace(/^[\s._-]+/, '').trim();
  }
  return base;
}

export function matchKeyFromOfficial(official) {
  const text = String(official || '').trim();
  if (!text) return '';

  const wordy = new RegExp(`^(${EXHIBIT_PREFIXES})\\b[\\s\\S]*?\\bExhibit\\s+(\\d+)([A-Za-z]?)$`, 'i');
  const wordyMatch = wordy.exec(text);
  if (wordyMatch) {
    return `${wordyMatch[1].toUpperCase()}-${parseInt(wordyMatch[2], 10)}${(wordyMatch[3] || '').toUpperCase()}`;
  }

  const id = /^([A-Za-z]{1,12})\s*[-_ ]?\s*0*(\d+)([A-Za-z]?)$/.exec(text);
  if (id) {
    return `${id[1].toUpperCase()}-${parseInt(id[2], 10)}${(id[3] || '').toUpperCase()}`;
  }

  const numeric = /^0*(\d+)([A-Za-z]?)$/.exec(text);
  if (numeric) {
    return `#-${parseInt(numeric[1], 10)}${(numeric[2] || '').toUpperCase()}`;
  }

  return '';
}

export function normalizeOutlinePhrase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\.[a-z0-9]{1,8}$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function splitOutlineList(text) {
  const entries = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    for (const part of line.split(',')) {
      const trimmed = part.trim();
      if (trimmed) entries.push(trimmed);
    }
  }
  return entries;
}

export function normalizeDesignation(value) {
  return String(value || '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '');
}

function cleanupDesignationBody(body) {
  return String(body || '')
    .replace(/\s+(?:at\s+)?(?:pp\.?|pages?|p\.?)\s*$/i, '')
    .replace(/\s+at\s*$/i, '')
    .trim();
}

function isPrefixOnly(body, extraPrefixes) {
  const token = String(body || '').trim();
  if (!/^[A-Za-z]{1,12}$/.test(token)) return false;
  const upper = token.toUpperCase();
  return KNOWN_PREFIXES.has(upper) || extraPrefixes.has(upper);
}

/**
 * Pull a trailing page, page range, or page:line citation off one reference.
 * Page:line stays attached when removing it would leave only a prefix (`PX 45:3`).
 * @param {string} raw
 * @param {Set<string>} extraPrefixes
 */
export function splitDesignation(raw, extraPrefixes = new Set()) {
  const text = String(raw || '').trim();
  const marked = PAGE_MARKER_SUFFIX.exec(text) || AT_PAGE_SUFFIX.exec(text);
  if (marked) {
    return {
      body: cleanupDesignationBody(text.slice(0, marked.index)),
      designation: normalizeDesignation(marked[1]),
    };
  }

  for (const pattern of PAGE_LINE_SUFFIXES) {
    const match = pattern.exec(text);
    if (!match) continue;
    const body = cleanupDesignationBody(text.slice(0, match.index));
    if (!body || isPrefixOnly(body, extraPrefixes)) continue;
    return {
      body,
      designation: normalizeDesignation(match[1]),
    };
  }

  return { body: text, designation: '' };
}

/**
 * @param {string} body
 * @param {Set<string>} extraPrefixes
 * @returns {{ key: string, rest: string } | null}
 */
export function parseExhibitId(body, extraPrefixes = new Set()) {
  const text = String(body || '').trim();
  if (!text) return null;

  const numeric = /^0*(\d+)([A-Za-z]?)$/.exec(text);
  if (numeric) {
    return {
      key: `#-${parseInt(numeric[1], 10)}${(numeric[2] || '').toUpperCase()}`,
      rest: '',
    };
  }

  const match = /^([A-Za-z]{1,12})\s*([-_ ]?)\s*0*(\d+)([A-Za-z]?)\b\s*(.*)$/.exec(text);
  if (!match) return null;

  const prefix = match[1].toUpperCase();
  const separator = match[2];
  const digits = match[3];
  const suffix = (match[4] || '').toUpperCase();
  const rest = (match[5] || '').trim();
  const known = KNOWN_PREFIXES.has(prefix) || extraPrefixes.has(prefix);
  const bare = rest.length === 0;
  const separated = separator === '-' || separator === '_' || separator === ' ';
  if (!known && !bare && !separated) return null;
  if (!known && prefix.length > 8) return null;
  if (!known && isCalendarYear(digits) && rest) return null;

  return {
    key: `${prefix}-${parseInt(digits, 10)}${suffix}`,
    rest,
  };
}

export function parseOutlineReference(raw, extraPrefixes = new Set()) {
  const trimmed = String(raw || '').trim();
  const split = splitDesignation(trimmed, extraPrefixes);
  const id = parseExhibitId(split.body, extraPrefixes);
  return {
    raw: trimmed,
    body: split.body,
    designation: split.designation,
    key: id?.key || '',
    rest: id?.rest || '',
  };
}

function fileRecord(file) {
  const officialExhibitNo = file.officialExhibitNo || extractOfficialExhibitNumber(file.originalName);
  return {
    id: file.id,
    originalName: file.originalName || '',
    description: file.description || '',
    officialExhibitNo,
    matchKey: file.matchKey || matchKeyFromOfficial(officialExhibitNo),
  };
}

function candidateOf(file) {
  return {
    id: file.id,
    originalName: file.originalName,
    officialExhibitNo: file.officialExhibitNo,
  };
}

function narrowByWords(candidates, rest) {
  const phrase = normalizeOutlinePhrase(rest);
  if (!phrase) return candidates;
  const narrowed = candidates.filter((file) => {
    const haystack = normalizeOutlinePhrase(`${file.originalName} ${file.description}`);
    return haystack.includes(phrase);
  });
  return narrowed.length > 0 ? narrowed : candidates;
}

function textMatches(body, files) {
  const phrase = normalizeOutlinePhrase(body);
  if (phrase.length < 4) return [];
  return files.filter((file) => {
    const haystack = normalizeOutlinePhrase(`${file.originalName} ${file.description}`);
    return haystack.includes(phrase);
  });
}

function prefixesInFiles(files) {
  const prefixes = new Set();
  for (const file of files) {
    const match = /^([A-Za-z]{1,12})/.exec(String(file.officialExhibitNo || '').trim());
    if (match) prefixes.add(match[1].toUpperCase());
  }
  return prefixes;
}

export function countOutline(references) {
  const fileIds = new Set();
  let matched = 0;
  let ambiguous = 0;
  let missing = 0;
  for (const reference of references) {
    if (reference.status === 'matched') {
      matched += 1;
      if (reference.fileId) fileIds.add(reference.fileId);
    } else if (reference.status === 'ambiguous') {
      ambiguous += 1;
    } else if (reference.status === 'missing') {
      missing += 1;
    }
  }
  return { matched, ambiguous, missing, files: fileIds.size };
}

export function finalizeOutline(references) {
  const orderByFile = new Map();
  let nextOrder = 0;
  return references.map((reference) => {
    if (reference.status !== 'matched' || !reference.fileId) {
      return { ...reference, outlineOrder: null, sharedWithOrder: null };
    }
    if (orderByFile.has(reference.fileId)) {
      const outlineOrder = orderByFile.get(reference.fileId);
      return { ...reference, outlineOrder, sharedWithOrder: outlineOrder };
    }
    nextOrder += 1;
    orderByFile.set(reference.fileId, nextOrder);
    return { ...reference, outlineOrder: nextOrder, sharedWithOrder: null };
  });
}

function withCounts(references) {
  const finalized = finalizeOutline(references);
  return { references: finalized, counts: countOutline(finalized) };
}

/**
 * Match pasted outline text to loaded files.
 * @param {string} text
 * @param {Array<{ id: string, originalName: string, description?: string, officialExhibitNo?: string }>} files
 */
export function matchOutline(text, files) {
  const records = (files || []).map(fileRecord);
  const extraPrefixes = prefixesInFiles(records);
  const entries = splitOutlineList(text);

  const references = entries.map((entry, index) => {
    const parsed = parseOutlineReference(entry, extraPrefixes);
    const matches = parsed.key
      ? narrowByWords(
        records.filter((file) => file.matchKey === parsed.key),
        parsed.rest,
      )
      : textMatches(parsed.body, records);
    const pool = [...matches].sort((a, b) => a.originalName.localeCompare(b.originalName, undefined, { numeric: true }));
    const candidates = pool.map(candidateOf);

    let status = 'missing';
    let fileId = null;
    if (candidates.length === 1) {
      status = 'matched';
      fileId = candidates[0].id;
    } else if (candidates.length > 1) {
      status = 'ambiguous';
    }

    return {
      id: `r${index + 1}`,
      raw: parsed.raw,
      body: parsed.body,
      designation: parsed.designation,
      key: parsed.key,
      status,
      fileId,
      candidates,
      outlineOrder: null,
      sharedWithOrder: null,
    };
  });

  return withCounts(references);
}

export function assignOutlineCandidate(match, referenceId, fileId) {
  if (!match) return match;
  const references = match.references.map((reference) => {
    if (reference.id !== referenceId) return reference;
    const allowed = reference.candidates.some((candidate) => candidate.id === fileId);
    if (!allowed) return reference;
    return { ...reference, status: 'matched', fileId };
  });
  return withCounts(references);
}

function uniqueJoin(values, separator) {
  const seen = new Set();
  const kept = [];
  for (const value of values) {
    const text = String(value || '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    kept.push(text);
  }
  return kept.join(separator);
}

/**
 * Reorder items to outline order and mark everything else as not included.
 * A file cited twice keeps one row, the first outline position, and every citation.
 * @param {Array} items
 * @param {{ references: Array }} match
 */
export function applyOutlineResult(items, match) {
  const groups = new Map();
  for (const reference of match?.references || []) {
    if (reference.status !== 'matched' || !reference.fileId) continue;
    const current = groups.get(reference.fileId) || {
      order: reference.outlineOrder,
      designations: [],
      raws: [],
    };
    if (reference.designation) current.designations.push(reference.designation);
    current.raws.push(reference.raw);
    if (reference.outlineOrder) current.order = reference.outlineOrder;
    groups.set(reference.fileId, current);
  }

  return (items || []).map((item) => {
    const group = groups.get(item.id);
    if (!group) {
      return {
        ...item,
        included: false,
        outlineOrder: null,
        designation: item.designationUserEdited ? item.designation : '',
        outlineReferences: [],
      };
    }
    return {
      ...item,
      included: true,
      outlineOrder: group.order,
      designation: item.designationUserEdited
        ? item.designation
        : uniqueJoin(group.designations, '; '),
      outlineReferences: group.raws,
    };
  });
}

export function clearOutlineFields(items) {
  return (items || []).map((item) => ({
    ...item,
    included: true,
    outlineOrder: null,
    designation: '',
    designationUserEdited: false,
    outlineReferences: [],
  }));
}

/**
 * Staged files stay in outline order. Other sort modes apply to files that were not cited.
 * @param {Array} items
 * @param {'filename'|'year'|'outline'} sortMode
 */
export function orderStagedItems(items, sortMode = 'filename') {
  const staged = [];
  const rest = [];
  for (const item of items || []) {
    if (item.included !== false && item.outlineOrder) staged.push(item);
    else rest.push(item);
  }
  if (staged.length === 0) {
    return sortItems(items || [], sortMode === 'outline' ? 'filename' : sortMode);
  }
  staged.sort((a, b) => a.outlineOrder - b.outlineOrder);
  const restMode = sortMode === 'year' ? 'year' : 'filename';
  return [...staged, ...sortItems(rest, restMode)];
}

export function stagedItems(items) {
  return (items || []).filter((item) => item.included !== false);
}

/** Rules the Limits page and help text are allowed to state. */
export const OUTLINE_MATCH_GUIDE = Object.freeze([
  {
    id: 'split',
    label: 'How to paste',
    detail: 'One reference per line, or several references on a line separated by commas. A comma inside a title needs its own line.',
  },
  {
    id: 'number',
    label: 'Exhibit number',
    detail: 'The reference matches the official number on a loaded file. Zero-padding, spacing, prefix case, and hyphen, underscore, or no separator are ignored. A letter suffix still counts, so PX-0142A does not match PX-0142.',
  },
  {
    id: 'words',
    label: 'Extra words',
    detail: 'Words after a unique number are optional. When two files share a number, those words pick one file. A reference with no exhibit number, such as a deposition name, matches the filename and description.',
  },
  {
    id: 'designation',
    label: 'Page and page:line',
    detail: 'A trailing at 3, p. 12-14, pp. 12-14, page 12, or 45:3-46:10 becomes the Designation. It is editable and is not written into the filename. Page:line is kept when it follows a name; it is not peeled off a bare prefix.',
  },
  {
    id: 'repeat',
    label: 'Cited twice',
    detail: 'The same file stays one staged row at its first outline position. Later citations stay on that row, and different designations are joined with a semicolon.',
  },
  {
    id: 'missing',
    label: 'Ambiguous, missing, and left out',
    detail: 'More than one file for a reference is ambiguous until you pick one. A reference with no file is missing. Loaded files that were not cited stay available and are left out of staging, rename, ZIP, and the crosswalk.',
  },
]);
