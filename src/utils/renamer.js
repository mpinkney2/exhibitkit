/**
 * PDF Exhibits Renamer Utility
 * Standardizes legal exhibit filenames for TrialDirector, OnCue, Patent DOD, and custom setups.
 */

import { resolvePresetEngine } from '../config/presets.js';

/** Calendar years commonly found in exhibit titles (1900–2099). */
export const YEAR_PATTERN = /\b((?:19|20)\d{2})\b/;

export const EXHIBIT_PREFIX_LIST = Object.freeze([
  'PX', 'DX', 'EX', 'PLTF', 'DEFT', 'DEF', 'DEP', 'GFX', 'EXB', 'DOD', 'DOC', 'EXHIBIT',
]);

const EXHIBIT_PREFIXES = EXHIBIT_PREFIX_LIST.join('|');

/**
 * Sequential keeps the preset exhibit ID (PX-1, PX-2, …) and leaves the Bates
 * control number in the description. Using the Bates number as the exhibit ID
 * replaces that prefix and number, which OnCue, TrialDirector, and Patent DOD
 * templates are built around, so it stays opt-in.
 */
export const BATES_MODE_SEQUENTIAL = 'sequential';
export const BATES_MODE_AS_EXHIBIT_ID = 'as-exhibit-id';
export const DEFAULT_BATES_MODE = BATES_MODE_SEQUENTIAL;

const KNOWN_EXHIBIT_PREFIXES = new Set(EXHIBIT_PREFIX_LIST);

const WORDY_EXHIBIT_PATTERN = new RegExp(
  `^(${EXHIBIT_PREFIXES})\\s+(.+?)\\s+Exhibit\\s+(\\d+[A-Z]?)(?:\\s*[-_–—]+\\s*(.+))?$`,
  'i',
);

/**
 * Structured DOD / patent document pattern (run before generic exhibit prefix matching).
 * e.g. "DOD - 12 - 2012 - Smith - Report" or "DOC - 5 - 2012 - Jones - Memo"
 */
const DOD_STRUCTURED_PATTERN = new RegExp(
  `^(${EXHIBIT_PREFIXES})\\s*[-_]\\s*(\\d+[-\\w]*)\\s*[-_]\\s*(\\d{4})\\s*[-_]\\s*([^–-]+?)\\s*[-–]\\s*(.+)$`,
  'i',
);

/**
 * Extract the first calendar year (19xx/20xx) from a filename or title.
 * @param {string} text
 * @returns {string|null} Four-digit year or null
 */
export function extractYear(text) {
  if (!text) return null;
  const match = String(text).match(YEAR_PATTERN);
  return match ? match[1] : null;
}

/**
 * Year used for sorting and year-as-ID.
 * Bates control numbers stay out of this, including names like ACME-2019.pdf.
 * A description the user typed is read before the original filename.
 * @param {object} input
 * @returns {string|null}
 */
export function resolveIngestYear({
  bates = null,
  sourceDescription = '',
  description = '',
  userEditedDescription = false,
  existingYear = null,
  originalName = '',
} = {}) {
  const text = userEditedDescription ? description : sourceDescription;
  const fromText = extractYear(text);
  if (bates) return fromText || null;
  return fromText || existingYear || extractYear(originalName) || null;
}

/**
 * @param {object} fields
 * @returns {object}
 */
function withStructuredFields({
  prefix = '',
  number = '',
  description = '',
  year = null,
  docId = '',
  author = '',
  title = '',
} = {}) {
  const resolvedDocId = docId || number || '';
  return {
    prefix,
    number: number || resolvedDocId,
    description,
    year,
    docId: resolvedDocId,
    author,
    title,
  };
}

export function batesLabel(bates) {
  if (!bates?.prefix || !bates?.start) return '';
  const start = `${bates.prefix}${bates.start}`;
  if (!bates.end) return start;
  return `${start}-${bates.prefix}${bates.end}`;
}

function isCalendarYear(digits) {
  return /^(?:19|20)\d{2}$/.test(digits);
}

/**
 * Bates-style stem: 2–12 letters, optional "-" / "_" / space, then 4–10 digits,
 * an optional same-prefix range, and an optional trailing description.
 * Returns null for known exhibit prefixes and for a spaced 4-digit calendar year.
 * @param {string} base filename without extension
 * @returns {object|null}
 */
export function matchBatesFilename(base) {
  const head = /^([A-Za-z]{2,12})([-_ ]?)(\d{4,10})([\s\S]*)$/.exec(String(base || ''));
  if (!head) return null;

  const rawPrefix = head[1];
  const separator = head[2];
  const start = head[3];
  let rest = head[4] || '';
  const prefix = rawPrefix.toUpperCase();

  if (KNOWN_EXHIBIT_PREFIXES.has(prefix)) return null;
  if (separator === ' ' && isCalendarYear(start)) return null;

  let end = null;
  const range = /^\s*-\s*([A-Za-z]{2,12})([-_ ]?)(\d{4,10})([\s\S]*)$/.exec(rest);
  if (range && range[1].toUpperCase() === prefix && range[2] === separator) {
    end = range[3];
    rest = range[4] || '';
  }

  let description = '';
  if (rest.length > 0) {
    const described = /^(?:\s*[-_–—]+\s*|\s+)(.+)$/.exec(rest);
    if (!described || !described[1].trim()) return null;
    description = described[1].trim();
  }

  const bates = { prefix, separator, start, end };
  return { ...bates, label: batesLabel(bates), description };
}

/**
 * Stable label for which naming rule recognized a parsed filename.
 * @param {object} parsed
 * @returns {string}
 */
export function filenamePatternKind(parsed) {
  if (parsed?.bates?.end) return 'bates-range';
  if (parsed?.bates) return 'bates';
  if (parsed?.exhibitStyle === 'wordy') return 'wordy';
  if (parsed?.prefix && parsed?.author && parsed?.title) return 'dod';
  if (parsed?.author && parsed?.year && !parsed?.prefix) return 'author-year';
  if (!parsed?.prefix && !parsed?.number && parsed?.year) return 'leading-year';
  if (!parsed?.prefix && parsed?.number) return 'leading-number';
  if (parsed?.prefix && parsed?.number) return 'prefix';
  return 'unstructured';
}

/**
 * Choose the exhibit prefix, number, and description for one ingested file.
 * Manual number and description edits win over both Bates modes.
 * @param {object} input
 */
export function resolveExhibitIdentity({
  bates = null,
  sourceDescription = '',
  description = '',
  number = '',
  isNumberManuallyEdited = false,
  userEditedNumber = false,
  userEditedDescription = false,
  sequenceOverride = false,
  year = null,
  index = 0,
  prefix = 'PX',
  startNumber = 1,
  useYearAsNumber = false,
  batesMode = DEFAULT_BATES_MODE,
} = {}) {
  const sequentialNumber = String(Number(startNumber) + Number(index));
  const yearReplacesNumber = Boolean(useYearAsNumber && year) && !userEditedNumber;
  const modeUsesBatesId = Boolean(bates)
    && batesMode === BATES_MODE_AS_EXHIBIT_ID
    && !sequenceOverride;

  let resolvedPrefix = prefix;
  let resolvedNumber;
  if (userEditedNumber) {
    resolvedNumber = number;
  } else if (yearReplacesNumber) {
    resolvedNumber = String(year);
  } else if (sequenceOverride) {
    resolvedNumber = sequentialNumber;
  } else if (modeUsesBatesId) {
    resolvedPrefix = '';
    resolvedNumber = batesLabel(bates);
  } else if (isNumberManuallyEdited && !bates) {
    resolvedNumber = number;
  } else {
    resolvedNumber = sequentialNumber;
  }

  const prose = userEditedDescription ? description : sourceDescription;
  const descriptionLead = !userEditedDescription && bates && (!modeUsesBatesId || yearReplacesNumber)
    ? batesLabel(bates)
    : '';
  const displayDescription = userEditedDescription
    ? description
    : [descriptionLead, prose].filter(Boolean).join(' ');

  return {
    prefix: resolvedPrefix,
    number: resolvedNumber,
    description: displayDescription,
    descriptionLead: userEditedDescription ? '' : descriptionLead,
    prose: userEditedDescription ? description : prose,
  };
}

/**
 * Attempts to parse an existing filename into prefix, exhibit number, description, year,
 * and optional structured patent fields (docId, author, title).
 * @param {string} filename - The original file name (with or without extension)
 * @returns {object}
 */
export function parseFilename(filename) {
  // Strip extension and trim
  const base = filename.replace(/\.pdf$/i, '').trim();

  // 1. Structured DOD / patent document pattern (must run before generic DOD prefix match)
  let match = base.match(DOD_STRUCTURED_PATTERN);
  if (match) {
    const prefix = match[1].toUpperCase();
    const docId = match[2].trim();
    const year = match[3];
    const author = match[4].trim();
    const title = match[5].trim();
    return withStructuredFields({
      prefix,
      number: docId,
      docId,
      author,
      title,
      description: cleanDescription([author, title].filter(Boolean).join(' - ')),
      year,
    });
  }

  // 2. Try matching structured exhibit patterns (e.g. PX-001 - Memo, DX_102 - Invoice)
  const stdPattern = new RegExp(
    `^(${EXHIBIT_PREFIXES})\\s*[-_]?\\s*(\\d+[A-Z]?)\\s*(?:[-_–—\\s]+)\\s*(.+)$`,
    'i',
  );
  match = base.match(stdPattern);
  if (match) {
    const description = cleanDescription(match[3]);
    return withStructuredFields({
      prefix: match[1].toUpperCase(),
      number: match[2],
      description,
      year: extractYear(description) || extractYear(base),
    });
  }

  // 3. Try matching prefix and number without description (e.g. PX-001, DX_102)
  const prefixNumOnlyPattern = new RegExp(
    `^(${EXHIBIT_PREFIXES})\\s*[-_]?\\s*(\\d+[A-Z]?)$`,
    'i',
  );
  match = base.match(prefixNumOnlyPattern);
  if (match) {
    return withStructuredFields({
      prefix: match[1].toUpperCase(),
      number: match[2],
      description: '',
      year: null,
    });
  }

  // 4. Try matching a leading number only (e.g. "001 - Exhibit of Sale")
  const leadingNumPattern = /^(\d+[A-Z]?)\s*[-_–—\s]+\s*(.+)$/i;
  match = base.match(leadingNumPattern);
  if (match) {
    const description = cleanDescription(match[2]);
    const leading = match[1];
    const leadingIsYear = /^(?:19|20)\d{2}$/.test(leading);
    return withStructuredFields({
      prefix: '',
      number: leadingIsYear ? '' : leading,
      description: leadingIsYear ? cleanDescription(`${leading} ${description}`) : description,
      year: leadingIsYear ? leading : (extractYear(description) || null),
    });
  }

  // 5. Author + year + title fallback from original Patent Preppers scripts.
  // Runs before Bates detection so "Smith 2012 Memo" is not a Bates number.
  const fallbackPattern = /^([A-Za-z]+)[\s_,-]+(19\d{2}|20\d{2})[\s_.-]+(.+)$/;
  match = base.match(fallbackPattern);
  if (match) {
    const author = match[1];
    const year = match[2];
    const title = cleanDescription(match[3]);
    return withStructuredFields({
      prefix: '',
      number: '',
      author,
      title,
      description: cleanDescription(`${author} - ${year} - ${title}`),
      year,
    });
  }

  // 6. Prefix + words + "Exhibit" + number (e.g. "DEP Jones Exhibit 3")
  match = base.match(WORDY_EXHIBIT_PATTERN);
  if (match) {
    const description = cleanDescription([match[2], match[4]].filter(Boolean).join(' '));
    return {
      ...withStructuredFields({
        prefix: match[1].toUpperCase(),
        number: match[3],
        description,
        year: extractYear(description),
      }),
      exhibitStyle: 'wordy',
    };
  }

  // 7. Bates-style control numbers (SMITH000123, ACME-000456, ACME000123-ACME000140).
  // Known exhibit prefixes are already consumed above, and this step refuses to
  // claim PX / DX / DOD names or a spaced calendar year.
  const bates = matchBatesFilename(base);
  if (bates) {
    const description = cleanDescription(bates.description);
    return {
      ...withStructuredFields({
        prefix: '',
        number: '',
        description,
        year: extractYear(description),
      }),
      bates: {
        prefix: bates.prefix,
        separator: bates.separator,
        start: bates.start,
        end: bates.end,
        label: bates.label,
      },
    };
  }

  // 8. Default fallback: treat the entire filename as description
  const description = cleanDescription(base);
  return withStructuredFields({
    prefix: '',
    number: '',
    description,
    year: extractYear(description),
  });
}

/**
 * Cleans the description by removing duplicate spaces, replacing underscores/dashes with spaces,
 * and stripping illegal characters.
 * @param {string} text - Raw description
 * @returns {string} Cleaned description
 */
export function cleanDescription(text) {
  if (!text) return '';

  return text
    .replace(/[\s_.-]+/g, ' ')
    .replace(/["'<>|\\:*?]/g, '')
    .trim();
}

/**
 * Shorten a title/description at a word boundary when it exceeds maxLength.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function shortenDescription(text, maxLength = 48) {
  const cleaned = String(text || '').trim();
  const limit = Number(maxLength);
  if (!cleaned) return '';
  if (!Number.isFinite(limit) || limit <= 0) return cleaned;
  if (cleaned.length <= limit) return cleaned;

  const slice = cleaned.slice(0, limit);
  const lastSpace = slice.lastIndexOf(' ');
  const trimmed = lastSpace >= Math.floor(limit * 0.5)
    ? slice.slice(0, lastSpace)
    : slice;
  return trimmed.replace(/[-_,.;:]+$/g, '').trim();
}

/**
 * Formats a description to a specific case style.
 * @param {string} text - The input description
 * @param {string} caseStyle - 'title' | 'upper' | 'lower' | 'as-is'
 * @returns {string} The formatted description
 */
export function formatCase(text, caseStyle) {
  if (!text) return '';

  switch (caseStyle) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return text
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    case 'as-is':
    default:
      return text;
  }
}

/**
 * Formats the number with leading zeros up to the pad length.
 * @param {string|number} num - The number to pad
 * @param {number} padLength - Number of digits (e.g. 3 for "001")
 * @returns {string} Padded number
 */
export function padNumber(num, padLength) {
  if (!num) return '';
  const numStr = String(num).trim();

  const numericMatch = numStr.match(/^(\d+)(.*)$/);
  if (numericMatch) {
    const digits = numericMatch[1];
    const suffix = numericMatch[2] || '';
    if (/^(?:19|20)\d{2}$/.test(digits) && !suffix) {
      return digits;
    }
    if (digits.length < padLength) {
      return digits.padStart(padLength, '0') + suffix;
    }
  }

  return numStr;
}

/**
 * Replace template tokens in a custom naming pattern.
 * @param {string} template
 * @param {Record<string, string>} tokens
 */
export function applyTemplateTokens(template, tokens) {
  let result = String(template || '');
  for (const [key, value] of Object.entries(tokens)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), value ?? '');
  }
  return result;
}

/**
 * Compare ingest items for sorting.
 * @param {'filename'|'year'} sortMode
 */
export function compareItemsForSort(a, b, sortMode = 'filename') {
  if (sortMode === 'year') {
    const yearA = a.year || extractYear(a.description) || extractYear(a.originalName);
    const yearB = b.year || extractYear(b.description) || extractYear(b.originalName);
    const numA = yearA ? Number(yearA) : Number.POSITIVE_INFINITY;
    const numB = yearB ? Number(yearB) : Number.POSITIVE_INFINITY;
    if (numA !== numB) return numA - numB;
  }
  return String(a.originalName || '').localeCompare(String(b.originalName || ''), undefined, { numeric: true });
}

/**
 * Sort a copy of items by the active sort mode.
 * @param {Array} items
 * @param {'filename'|'year'} sortMode
 */
export function sortItems(items, sortMode = 'filename') {
  return [...items].sort((a, b) => compareItemsForSort(a, b, sortMode));
}

/**
 * Resolve exhibit number for an ingested/parsed item.
 * When useYearAsNumber is on and a year is present in the title, use that year.
 */
export function resolveExhibitNumber({ parsedNumber = '', year = null, useYearAsNumber = false } = {}) {
  if (useYearAsNumber && year) return String(year);
  return parsedNumber ? String(parsedNumber) : '';
}

/**
 * Standardizes and generates a proposed filename according to presets and custom rules.
 * @param {object} params
 * @returns {string} Proposed filename with .pdf extension
 */
export function generateProposedFilename({
  prefix = '',
  number = '',
  description = '',
  year = null,
  docId = '',
  author = '',
  title = '',
  preset = 'oncue',
  padLength = 0,
  caseStyle = 'as-is',
  customTemplate = '{Prefix}{Number} - {Description}',
  shortenDesc = false,
  maxDescLength = 48,
  descriptionLead = '',
}) {
  const cleanPrefix = prefix.trim();
  const lead = String(descriptionLead || '').trim();
  let formattedDesc = formatCase(cleanDescription(description), caseStyle);
  if (shortenDesc) {
    formattedDesc = shortenDescription(formattedDesc, maxDescLength);
  }
  let formattedTitle = title
    ? formatCase(cleanDescription(title), caseStyle)
    : formattedDesc;
  if (shortenDesc && formattedTitle) {
    formattedTitle = shortenDescription(formattedTitle, maxDescLength);
  }
  if (lead) {
    formattedDesc = [lead, formattedDesc].filter(Boolean).join(' ');
    formattedTitle = title
      ? [lead, formattedTitle].filter(Boolean).join(' ')
      : formattedDesc;
  }
  const formattedNum = padNumber(number, padLength);
  const resolvedDocId = padNumber(docId || number, padLength);
  const formattedAuthor = formatCase(cleanDescription(author), caseStyle);
  const yearToken = year ? String(year) : 'n.d.';
  const engine = resolvePresetEngine(preset);
  const batesLabelAsId = !cleanPrefix && /^[A-Z]{2,12}\d{4,10}(?:-[A-Z]{2,12}\d{4,10})?$/.test(formattedNum);

  if (engine === 'oncue') {
    const id = `${cleanPrefix}${formattedNum}`.trim();
    if (id && formattedDesc) {
      return `${id} ${formattedDesc}.pdf`;
    }
    if (id) {
      return `${id}.pdf`;
    }
    return `${formattedDesc || 'Exhibit'}.pdf`;
  }

  if (engine === 'trialdirector') {
    const idParts = [];
    if (cleanPrefix) idParts.push(cleanPrefix);
    if (formattedNum) idParts.push(formattedNum);
    const id = idParts.join('-');

    if (id && formattedDesc) {
      return `${id} - ${formattedDesc}.pdf`;
    }
    if (id) {
      return `${id}.pdf`;
    }
    return `${formattedDesc || 'Exhibit'}.pdf`;
  }

  if (preset === 'patent-dod') {
    if (batesLabelAsId) {
      const titlePart = formattedTitle || formattedDesc || 'Document';
      if (formattedAuthor) {
        return `${formattedNum} - ${yearToken} - ${formattedAuthor} - ${titlePart}.pdf`;
      }
      return `${formattedNum} - ${yearToken} - ${titlePart}.pdf`;
    }
    const prefixPart = cleanPrefix || 'DOC';
    const docPart = resolvedDocId || formattedNum || '0';
    const titlePart = formattedTitle || formattedDesc || 'Document';
    if (formattedAuthor) {
      return `${prefixPart} - ${docPart} - ${yearToken} - ${formattedAuthor} - ${titlePart}.pdf`;
    }
    return `${prefixPart} - ${docPart} - ${yearToken} - ${titlePart}.pdf`;
  }

  let result = applyTemplateTokens(customTemplate, {
    Prefix: cleanPrefix,
    Number: formattedNum,
    Description: formattedDesc,
    Year: yearToken,
    Author: formattedAuthor,
    Title: formattedTitle,
    DocId: resolvedDocId || formattedNum,
  });

  result = result
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .replace(/-\s*-/g, '-')
    .trim()
    .replace(/^[-_\s]+|[-_\s]+$/g, '');

  return `${result || 'Exhibit'}.pdf`;
}

/**
 * Scans a list of proposed items and flags duplicates and validation errors.
 * @param {Array} items - Array of files with their proposed names and properties
 * @returns {Array} Updated array with status, error, and conflict properties
 */
export function validateProposedNames(items) {
  const nameCounts = {};
  const originalNames = new Set(
    items.map((item) => (item.originalName || '').toLowerCase().trim()).filter(Boolean),
  );

  items.forEach((item) => {
    const name = (item.proposedName || '').toLowerCase().trim();
    if (name) {
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    }
  });

  return items.map((item) => {
    const proposed = item.proposedName || '';
    const nameLower = proposed.toLowerCase().trim();

    let status = 'success';
    let message = 'Ready to rename';

    if (!proposed || proposed === '.pdf') {
      status = 'danger';
      message = 'Filename cannot be empty';
    } else if (nameCounts[nameLower] > 1) {
      status = 'warning';
      message = 'Duplicate proposed filename detected';
    } else if (
      nameLower !== (item.originalName || '').toLowerCase().trim()
      && originalNames.has(nameLower)
    ) {
      status = 'warning';
      message = 'Proposed filename is already used by another file in this batch';
    } else if (/[\\/:*?"<>|]/.test(proposed.replace('.pdf', ''))) {
      status = 'danger';
      message = 'Filename contains forbidden characters (\\ / : * ? " < > |)';
    } else if (resolvePresetEngine(item.preset) === 'oncue' && !proposed.includes(' ') && (item.prefix || item.number) && item.description) {
      status = 'warning';
      message = 'OnCue prefers a space between the ID and the description';
    }

    return {
      ...item,
      status,
      message,
    };
  });
}

/**
 * Resolves duplicates by automatically appending a counter to conflicting names.
 * @param {Array} items - The list of items
 * @returns {Array} Resolved list of items
 */
export function resolveDuplicates(items) {
  const nameCounts = {};
  const resolvedItems = [];

  items.forEach((item) => {
    const baseProposed = item.proposedName || 'Exhibit.pdf';
    const baseName = baseProposed.replace(/\.pdf$/i, '').trim();
    let uniqueName = baseProposed;
    let counter = 1;

    while (nameCounts[uniqueName.toLowerCase().trim()]) {
      counter += 1;
      uniqueName = `${baseName}_v${counter}.pdf`;
    }

    nameCounts[uniqueName.toLowerCase().trim()] = true;
    resolvedItems.push({
      ...item,
      proposedName: uniqueName,
    });
  });

  return validateProposedNames(resolvedItems);
}
