/**
 * True redaction: remove or replace selected content rather than visual overlays.
 */

const DEFAULT_REPLACEMENT = '[REDACTED]';

/**
 * Apply redactions to a message body.
 * @param {string} body
 * @param {Array<{ start: number, end: number }|{ phrase: string }>} redactions
 * @param {string} [replacement]
 */
export function applyRedactions(body, redactions = [], replacement = DEFAULT_REPLACEMENT) {
  if (!body) return '';
  if (!redactions.length) return body;

  // Phrase-based redactions (case-insensitive whole occurrences)
  let result = body;
  const phrases = redactions.filter((r) => typeof r.phrase === 'string' && r.phrase.length > 0);
  for (const { phrase } of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'gi'), replacement);
  }

  // Range-based redactions on the original body when no phrases were used
  const ranges = redactions
    .filter((r) => Number.isInteger(r.start) && Number.isInteger(r.end) && r.end > r.start)
    .sort((a, b) => b.start - a.start);

  if (phrases.length === 0 && ranges.length > 0) {
    result = body;
    for (const { start, end } of ranges) {
      const safeStart = Math.max(0, start);
      const safeEnd = Math.min(result.length, end);
      result = result.slice(0, safeStart) + replacement + result.slice(safeEnd);
    }
  }

  return result;
}

/**
 * Fully redact a message object for export (body content removed).
 */
export function redactMessage(message, options = {}) {
  const replacement = options.replacement || DEFAULT_REPLACEMENT;
  const redactions = message.redactions || options.redactions || [];
  const fullyRedacted = Boolean(message.fullyRedacted || options.fullyRedacted);

  if (fullyRedacted) {
    return {
      ...message,
      body: replacement,
      redacted: true,
      originalBodyRemoved: true,
    };
  }

  const nextBody = applyRedactions(message.body || '', redactions, replacement);
  return {
    ...message,
    body: nextBody,
    redacted: nextBody !== (message.body || ''),
    originalBodyRemoved: nextBody !== (message.body || '') && !nextBody.includes(message.body || ''),
  };
}

/**
 * Produce export-safe messages: selected only, with true redaction applied.
 * Original unredacted body is never retained on the returned objects.
 */
export function prepareMessagesForExport(messages) {
  return messages
    .filter((m) => m.selected !== false)
    .map((m) => {
      const redacted = redactMessage(m);
      const { body: _drop, ...rest } = m;
      void _drop;
      return {
        id: rest.id,
        seq: rest.seq,
        timestamp: rest.timestamp,
        sender: rest.sender,
        body: redacted.body,
        redacted: redacted.redacted,
      };
    });
}
