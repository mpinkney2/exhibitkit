/**
 * Pull exhibit citations out of outline prose, in document order.
 * The text is produced in the browser from a .docx or a text-based PDF.
 * Nothing in this module sends the outline anywhere.
 */

import { EXHIBIT_PREFIX_LIST } from './renamer.js';
import { parseOutlineReference } from './outlineImport.js';

export const MAX_DRAFT_DESCRIPTION = 140;

const KNOWN_PREFIXES = new Set(EXHIBIT_PREFIX_LIST);
const KNOWN_ALTERNATION = [...EXHIBIT_PREFIX_LIST]
  .sort((a, b) => b.length - a.length)
  .join('|');

const STOPWORDS = new Set(`
  a an the of to and or at by for in on from with page pages paragraph paragraphs
  section sections chapter chapters rule rules note notes item items tab tabs
  volume vol no nos number date year line lines question questions answer answers
  see also re vs via per as if be is it we he she his her our not but all any
  its this that then than into over under after before about between within
  without during until ask show move admit offer mark next back only such same
  other will may can has had was were are you your their they who what when
  where which how why depo deposition exhibit exhibits plaintiff defendant
  court judge jury trial direct cross redirect recross okay yes no ok id am pm
  fy pre post non sub part january february march april may june july august
  september october november december
`.split(/\s+/).filter(Boolean).map((word) => word.toUpperCase()));

const PAGE_LINE = String.raw`\d{1,4}:\d{1,3}(?:\s*[-–—]\s*(?:\d{1,4}:)?\d{1,3})?`;
const PAGE_SPAN = String.raw`\d{1,4}(?![\d:])(?:\s*[-–—]\s*\d{1,4}(?![\d:]))?`;
const DESIGNATION_PATTERN = new RegExp(
  String.raw`(?:at\s+)?(?:pp\.?|pages?|p\.?)\s*(${PAGE_LINE})|(${PAGE_LINE})|(?:at\s+(?:(?:pp\.?|pages?|p\.?)\s*)?|(?:pp\.?|pages?|p\.?)\s+)(${PAGE_SPAN})`,
  'i',
);

function knownCitePattern() {
  return new RegExp(
    `\\b(?:${KNOWN_ALTERNATION})[ \\t]*(?:[-_.][ \\t]*)?\\d{1,6}[A-Za-z]?\\b`,
    'gi',
  );
}

function hyphenCitePattern() {
  return /\b([A-Za-z]{2,8})[ \t]*[-_][ \t]*\d{1,6}[A-Za-z]?\b/g;
}

function spacedCitePattern() {
  return /\b([A-Z]{2,8})[ \t]+\d{1,6}[A-Za-z]?\b/g;
}

function acceptUnknown(prefix, { hyphen }) {
  const upper = String(prefix || '').toUpperCase();
  if (!upper || STOPWORDS.has(upper) || KNOWN_PREFIXES.has(upper)) return false;
  if (hyphen) return true;
  return /X$/.test(upper) || upper.length <= 3;
}

function normalizeCapturedDesignation(value) {
  return String(value || '').replace(/[–—]/g, '-').replace(/\s+/g, '');
}

function findDesignation(region) {
  const source = String(region || '');
  const match = DESIGNATION_PATTERN.exec(source);
  if (!match) return null;
  const value = normalizeCapturedDesignation(match[1] || match[2] || match[3]);
  if (!value) return null;
  let start = match.index;
  if (!/^at\b/i.test(match[0])) {
    const atLead = /(?:^|\s)at\s*$/i.exec(source.slice(0, start));
    if (atLead) start -= atLead[0].replace(/^\s*/, '').length;
  }
  return {
    value,
    start,
    end: match.index + match[0].length,
  };
}

function cleanDraft(value) {
  let text = String(value || '').replace(/\s+/g, ' ').trim();
  text = text.replace(/^["“”']+|["“”']+$/g, '').trim();
  for (let pass = 0; pass < 4; pass += 1) {
    const next = text
      .replace(/^[\s,;:–—\-./]+/, '')
      .replace(/[\s,;:–—\-./]+$/, '')
      .replace(/^(?:(?:and|or|then|also|for|re|regarding|about|of|with|at)\s+)/i, '')
      .replace(/^(?:the|a|an)\s+/i, '')
      .trim();
    if (next === text) break;
    text = next;
  }
  text = text.replace(/,\s*(?:and|or|then|but)\b[\s\S]*$/i, '').trim();
  if (!text || /^(?:and|or|then|also|for|the|a|an)$/i.test(text)) return '';
  const parsed = parseOutlineReference(text);
  if (parsed.key && parsed.rest.length < 3) return '';
  if (text.length <= MAX_DRAFT_DESCRIPTION) return text;
  const slice = text.slice(0, MAX_DRAFT_DESCRIPTION);
  const lastSpace = slice.lastIndexOf(' ');
  const trimmed = lastSpace >= 90 ? slice.slice(0, lastSpace) : slice;
  return trimmed.replace(/[\s,;:–—\-./]+$/, '').trim();
}

function sentenceBound(region) {
  const abbrev = /(?:^|[\s(])(?:p|pp|e|i|v|no|mr|ms|dr|jr|sr|st)\.$/i;
  for (let index = 0; index < region.length; index += 1) {
    const ch = region[index];
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    if (ch === '.' && abbrev.test(region.slice(Math.max(0, index - 6), index + 1))) continue;
    const next = region[index + 1];
    if (ch === '.' && next && /\d/.test(next)) continue;
    if (!next || /\s/.test(next)) return region.slice(0, index);
  }
  return region;
}

function descriptionBefore(line, citeStart) {
  let before = line.slice(0, citeStart).trim();
  if (!before) return '';
  before = before.replace(/^(?:[-*•]+|\d+[.)])\s+/, '');
  const tail = before.split(/[:;]/).pop().trim().replace(/[,:\s]+$/, '');
  if (!tail || tail.split(/\s+/).length > 14) return '';
  if (/^(?:ask|move|refer|cross|return|then|also|see|show|admit|offer|mark|identify|direct|redirect)\b/i.test(tail)) {
    return '';
  }
  return cleanDraft(tail);
}

function analyzeAfter(after) {
  const line = String(after || '').split('\n')[0];
  const paren = /^\s*\(([^)]*)\)/.exec(line);
  if (paren) {
    const inside = paren[1];
    const inner = findDesignation(inside);
    const outer = findDesignation(line.slice(paren.index + paren[0].length));
    const chosen = outer || inner;
    const descriptionSource = inner
      ? `${inside.slice(0, inner.start)} ${inside.slice(inner.end)}`
      : inside;
    return {
      description: cleanDraft(descriptionSource),
      designation: chosen ? chosen.value : '',
    };
  }

  const sentence = sentenceBound(line);
  const designation = findDesignation(sentence);
  const descriptionSource = designation
    ? `${sentence.slice(0, designation.start)} ${sentence.slice(designation.end)}`
    : sentence;
  return {
    description: cleanDraft(descriptionSource),
    designation: designation ? designation.value : '',
  };
}

function contextSnippet(line, citeStart, citeEnd) {
  const text = line.trim();
  if (text.length <= 220) return text;
  const pad = line.length - line.trimStart().length;
  const start = Math.max(0, citeStart - pad - 70);
  const end = Math.min(text.length, citeEnd - pad + 90);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function collectMatches(source) {
  const found = [];
  const consider = (regex, accept) => {
    regex.lastIndex = 0;
    let match = regex.exec(source);
    while (match) {
      const cite = match[0].replace(/[ \t]+/g, ' ').trim();
      const prefix = match[1] || '';
      if ((!accept || accept(prefix)) && parseOutlineReference(cite).key) {
        found.push({
          start: match.index,
          end: match.index + match[0].length,
          cite,
        });
      }
      if (match.index === regex.lastIndex) regex.lastIndex += 1;
      match = regex.exec(source);
    }
  };

  consider(knownCitePattern(), null);
  consider(hyphenCitePattern(), (prefix) => acceptUnknown(prefix, { hyphen: true }));
  consider(spacedCitePattern(), (prefix) => acceptUnknown(prefix, { hyphen: false }));

  found.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const kept = [];
  let cursor = -1;
  for (const candidate of found) {
    if (candidate.start < cursor) continue;
    kept.push(candidate);
    cursor = candidate.end;
  }
  return kept;
}

/**
 * @param {string} text
 * @returns {Array<{ id: string, cite: string, description: string, designation: string, context: string }>}
 */
export function extractOutlineCites(text) {
  const source = String(text || '').replace(/\r\n?/g, '\n');
  if (!source.trim()) return [];

  return collectMatches(source).map((match, index) => {
    const lineStart = source.lastIndexOf('\n', Math.max(0, match.start - 1)) + 1;
    const breakAt = source.indexOf('\n', match.end);
    const lineEnd = breakAt === -1 ? source.length : breakAt;
    const line = source.slice(lineStart, lineEnd);
    const localStart = match.start - lineStart;
    const localEnd = match.end - lineStart;
    const nearby = analyzeAfter(line.slice(localEnd));
    const description = nearby.description
      || (nearby.designation ? '' : descriptionBefore(line, localStart));
    return {
      id: `c${index + 1}`,
      cite: match.cite,
      description,
      designation: nearby.designation,
      context: contextSnippet(line, localStart, localEnd),
    };
  });
}

function designationForLine(value) {
  const text = String(value || '').trim().replace(/[–—]/g, '-').replace(/\s+/g, ' ');
  if (!text) return '';
  if (/[A-Za-z]/.test(text) || text.includes(':')) return text;
  return `p. ${text}`;
}

/** One outline line. Description stays on the line so a comma is not a new cite. */
export function draftToOutlineLine(draft) {
  const cite = String(draft?.cite || '').trim().replace(/\s+/g, ' ');
  if (!cite) return '';
  const description = String(draft?.description || '').trim().replace(/\s+/g, ' ');
  const designation = designationForLine(draft?.designation);
  return [cite, description, designation].filter(Boolean).join(' ');
}

export function draftsToOutlineText(drafts) {
  return (drafts || []).map(draftToOutlineLine).filter(Boolean).join('\n');
}
