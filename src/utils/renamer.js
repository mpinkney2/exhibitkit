/**
 * PDF Exhibits Renamer Utility
 * Standardizes legal exhibit filenames for TrialDirector, OnCue, and custom setups.
 */

/** Calendar years commonly found in exhibit titles (1900–2099). */
export const YEAR_PATTERN = /\b((?:19|20)\d{2})\b/;

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
 * Attempts to parse an existing filename into prefix, exhibit number, description, and year.
 * @param {string} filename - The original file name (with or without extension)
 * @returns {object} { prefix: string, number: string, description: string, year: string|null }
 */
export function parseFilename(filename) {
  // Strip extension and trim
  const base = filename.replace(/\.pdf$/i, "").trim();

  // 1. Try matching structured exhibit patterns (e.g. PX-001 - Memo, DX_102 - Invoice, PLTF 5 - Contract)
  const stdPattern = /^(PX|DX|EX|PLTF|DEFT|DEF|DEP|GFX|EXB|DOD|DOC|EXHIBIT)\s*[-_]?\s*(\d+[A-Z]?)\s*(?:[-_–—\s]+)\s*(.+)$/i;
  let match = base.match(stdPattern);
  if (match) {
    const description = cleanDescription(match[3]);
    return {
      prefix: match[1].toUpperCase(),
      number: match[2],
      description,
      year: extractYear(description) || extractYear(base),
    };
  }

  // 2. Try matching prefix and number without description (e.g. PX-001, DX_102, PLTF-5)
  const prefixNumOnlyPattern = /^(PX|DX|EX|PLTF|DEFT|DEF|DEP|GFX|EXB|DOD|DOC|EXHIBIT)\s*[-_]?\s*(\d+[A-Z]?)$/i;
  match = base.match(prefixNumOnlyPattern);
  if (match) {
    return {
      prefix: match[1].toUpperCase(),
      number: match[2],
      description: "",
      year: null,
    };
  }

  // 3. Try matching a leading number only (e.g. "001 - Exhibit of Sale", "25 - Jones Deposition")
  const leadingNumPattern = /^(\d+[A-Z]?)\s*[-_–—\s]+\s*(.+)$/i;
  match = base.match(leadingNumPattern);
  if (match) {
    const description = cleanDescription(match[2]);
    const leading = match[1];
    // A standalone 4-digit leading token is treated as a year title, not an exhibit ID.
    const leadingIsYear = /^(?:19|20)\d{2}$/.test(leading);
    return {
      prefix: "",
      number: leadingIsYear ? "" : leading,
      description: leadingIsYear ? cleanDescription(`${leading} ${description}`) : description,
      year: leadingIsYear ? leading : (extractYear(description) || null),
    };
  }

  // 4. Try matching typical DOD structured pattern from original scripts:
  // e.g., "DOD - 12 - 2012 - Author - Title" or "DOC - 5 - Smith - Memo"
  const dodPattern = /^(DOD|DOC)?\s*-\s*(\d+[-\w]*)\s*-\s*(\d{4})?\s*-\s*([^–-]+)\s*[-–]\s*(.+)$/i;
  match = base.match(dodPattern);
  if (match) {
    const prefix = match[1] || "DOC";
    const docId = match[2].trim();
    const year = match[3] || "";
    const authors = match[4].trim();
    const title = match[5].trim();
    const desc = [authors, year, title].filter(Boolean).join(" - ");
    return {
      prefix: prefix.toUpperCase(),
      number: docId,
      description: cleanDescription(desc),
      year: year || extractYear(desc) || null,
    };
  }

  // 5. Try matching Author Year Title fallback from original scripts
  // e.g. "Smith 2012 Memo" or "Jones-2015-Report"
  const fallbackPattern = /^([A-Za-z]+)[\s_,-]+(19\d{2}|20\d{2})[\s_.-]+(.+)$/;
  match = base.match(fallbackPattern);
  if (match) {
    const author = match[1];
    const year = match[2];
    const rest = match[3];
    return {
      prefix: "",
      number: "",
      description: cleanDescription(`${author} - ${year} - ${rest}`),
      year,
    };
  }

  // 6. Default fallback: treat the entire filename as description
  const description = cleanDescription(base);
  return {
    prefix: "",
    number: "",
    description,
    year: extractYear(description),
  };
}

/**
 * Cleans the description by removing duplicate spaces, replacing underscores/dashes with spaces,
 * and stripping illegal characters.
 * @param {string} text - Raw description
 * @returns {string} Cleaned description
 */
export function cleanDescription(text) {
  if (!text) return "";
  
  return text
    .replace(/[\s_.-]+/g, " ") // replace multiple separators with a single space
    .replace(/["'<>|\\:*?]/g, "") // strip standard OS forbidden filename characters
    .trim();
}

/**
 * Shorten a title/description at a word boundary when it exceeds maxLength.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function shortenDescription(text, maxLength = 48) {
  const cleaned = String(text || "").trim();
  const limit = Number(maxLength);
  if (!cleaned) return "";
  if (!Number.isFinite(limit) || limit <= 0) return cleaned;
  if (cleaned.length <= limit) return cleaned;

  const slice = cleaned.slice(0, limit);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = lastSpace >= Math.floor(limit * 0.5)
    ? slice.slice(0, lastSpace)
    : slice;
  return trimmed.replace(/[-_,.;:]+$/g, "").trim();
}

/**
 * Formats a description to a specific case style.
 * @param {string} text - The input description
 * @param {string} caseStyle - 'title' | 'upper' | 'lower' | 'as-is'
 * @returns {string} The formatted description
 */
export function formatCase(text, caseStyle) {
  if (!text) return "";
  
  switch (caseStyle) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return text
        .toLowerCase()
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    case "as-is":
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
  if (!num) return "";
  const numStr = String(num).trim();
  
  // Extract only the numeric part for padding, keeping any suffix letters (e.g., 25A -> 025A)
  const numericMatch = numStr.match(/^(\d+)(.*)$/);
  if (numericMatch) {
    const digits = numericMatch[1];
    const suffix = numericMatch[2] || "";
    // Do not zero-pad calendar years (keeps 2012 as 2012, not 012 / 2012).
    if (/^(?:19|20)\d{2}$/.test(digits) && !suffix) {
      return digits;
    }
    if (digits.length < padLength) {
      return digits.padStart(padLength, "0") + suffix;
    }
  }
  
  return numStr;
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
 * @param {object} params - { prefix, number, description, preset, padLength, customTemplate, caseStyle, shortenDesc, maxDescLength }
 * @returns {string} Proposed filename with .pdf extension
 */
export function generateProposedFilename({
  prefix = "",
  number = "",
  description = "",
  preset = "oncue",
  padLength = 0,
  caseStyle = "as-is",
  customTemplate = "{Prefix}{Number} - {Description}",
  shortenDesc = false,
  maxDescLength = 48,
}) {
  const cleanPrefix = prefix.trim();
  let formattedDesc = formatCase(cleanDescription(description), caseStyle);
  if (shortenDesc) {
    formattedDesc = shortenDescription(formattedDesc, maxDescLength);
  }
  const formattedNum = padNumber(number, padLength);

  // Apply naming preset rules
  if (preset === "oncue") {
    // ONCUE Rule: [ID][Space][Description].pdf
    const id = `${cleanPrefix}${formattedNum}`.trim();
    if (id && formattedDesc) {
      return `${id} ${formattedDesc}.pdf`;
    } else if (id) {
      return `${id}.pdf`;
    } else {
      return `${formattedDesc || "Exhibit"}.pdf`;
    }
  } else if (preset === "trialdirector") {
    // TRIALDIRECTOR Rule: [Prefix]-[Number] [Description].pdf (standard best practice)
    const idParts = [];
    if (cleanPrefix) idParts.push(cleanPrefix);
    if (formattedNum) idParts.push(formattedNum);
    const id = idParts.join("-");

    if (id && formattedDesc) {
      return `${id} - ${formattedDesc}.pdf`;
    } else if (id) {
      return `${id}.pdf`;
    } else {
      return `${formattedDesc || "Exhibit"}.pdf`;
    }
  } else {
    // CUSTOM Preset: Uses user-defined string template
    let result = customTemplate
      .replace(/{Prefix}/gi, cleanPrefix)
      .replace(/{Number}/gi, formattedNum)
      .replace(/{Description}/gi, formattedDesc);

    // Clean up double dashes or spaces caused by empty parts
    result = result
      .replace(/\s+/g, " ")
      .replace(/-+/g, "-")
      .replace(/_+/g, "_")
      .replace(/-\s*-/g, "-")
      .trim();

    // Clean any leading/trailing dashes/underscores/spaces that look messy
    result = result.replace(/^[-_\s]+|[-_\s]+$/g, "");

    return `${result || "Exhibit"}.pdf`;
  }
}

/**
 * Scans a list of proposed items and flags duplicates and validation errors.
 * @param {Array} items - Array of files with their proposed names and properties
 * @returns {Array} Updated array with status, error, and conflict properties
 */
export function validateProposedNames(items) {
  const nameCounts = {};
  const originalNames = new Set(
    items.map(item => (item.originalName || '').toLowerCase().trim()).filter(Boolean)
  );
  
  // First pass: Count occurrences of proposed names
  items.forEach(item => {
    const name = (item.proposedName || "").toLowerCase().trim();
    if (name) {
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    }
  });

  // Second pass: Set status and messages
  return items.map(item => {
    const proposed = item.proposedName || "";
    const nameLower = proposed.toLowerCase().trim();
    
    let status = "success";
    let message = "Ready to rename";

    // Check for empty name
    if (!proposed || proposed === ".pdf") {
      status = "danger";
      message = "Filename cannot be empty";
    }
    // Check for duplicate names
    else if (nameCounts[nameLower] > 1) {
      status = "warning";
      message = "Duplicate proposed filename detected";
    }
    // Sequential in-place renames must not target another loaded file's current name.
    else if (
      nameLower !== (item.originalName || '').toLowerCase().trim() &&
      originalNames.has(nameLower)
    ) {
      status = "warning";
      message = "Proposed filename is already used by another file in this batch";
    }
    // Check for OS forbidden characters (should already be stripped, but safe check)
    else if (/[\\/:*?"<>|]/.test(proposed.replace(".pdf", ""))) {
      status = "danger";
      message = "Filename contains forbidden characters (\\ / : * ? \" < > |)";
    }
    // Check OnCue space requirements
    else if (item.preset === "oncue" && !proposed.includes(" ") && (item.prefix || item.number) && item.description) {
      status = "warning";
      message = "OnCue prefers a space between the ID and the description";
    }

    return {
      ...item,
      status,
      message
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

  items.forEach(item => {
    let baseProposed = item.proposedName || "Exhibit.pdf";
    const baseName = baseProposed.replace(/\.pdf$/i, "").trim();
    let uniqueName = baseProposed;
    let counter = 1;

    // Check if we've already used this name
    while (nameCounts[uniqueName.toLowerCase().trim()]) {
      counter++;
      uniqueName = `${baseName}_v${counter}.pdf`;
    }

    nameCounts[uniqueName.toLowerCase().trim()] = true;
    resolvedItems.push({
      ...item,
      proposedName: uniqueName
    });
  });

  return validateProposedNames(resolvedItems);
}
