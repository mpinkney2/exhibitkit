/**
 * Native parsing of supported message export formats (local-only).
 * Supported: JSON array, CSV, plain text conversation dumps, SMS Backup & Restore-like XML.
 */

let messageSeqCounter = 0;

function nextId() {
  messageSeqCounter += 1;
  return `msg-${messageSeqCounter}`;
}

function normalizeMessage(partial, index) {
  return {
    id: partial.id || nextId(),
    seq: index + 1,
    timestamp: partial.timestamp || '',
    sender: (partial.sender || 'Unknown').trim() || 'Unknown',
    body: (partial.body || '').toString(),
    selected: true,
    redactions: [],
    fullyRedacted: false,
  };
}

export function resetMessageIdCounter() {
  messageSeqCounter = 0;
}

/**
 * Parse file contents into a conversation object.
 * @param {string} text
 * @param {{ fileName?: string }} [meta]
 */
export function parseMessageExport(text, meta = {}) {
  resetMessageIdCounter();
  const trimmed = (text || '').replace(/^\uFEFF/, '');
  const fileName = meta.fileName || 'conversation.txt';

  if (!trimmed.trim()) {
    return { messages: [], format: 'empty', fileName, warnings: ['File was empty.'] };
  }

  // JSON array or { messages: [] }
  if (trimmed.trimStart().startsWith('{') || trimmed.trimStart().startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);
      const list = Array.isArray(data) ? data : data.messages || data.sms || data.conversation || [];
      if (Array.isArray(list) && list.length > 0) {
        const messages = list.map((item, idx) =>
          normalizeMessage(
            {
              timestamp: item.timestamp || item.date || item.time || item.sent_at || '',
              sender: item.sender || item.from || item.address || item.contact || 'Unknown',
              body: item.body || item.text || item.message || item.content || '',
            },
            idx
          )
        );
        return { messages, format: 'json', fileName, warnings: [] };
      }
    } catch {
      // fall through to other parsers
    }
  }

  // SMS Backup & Restore style XML
  if (trimmed.includes('<sms') || trimmed.includes('<mms')) {
    const messages = parseSmsXml(trimmed);
    if (messages.length) {
      return { messages, format: 'sms_xml', fileName, warnings: [] };
    }
  }

  // CSV with headers
  if (looksLikeCsv(trimmed)) {
    const messages = parseCsvConversation(trimmed);
    if (messages.length) {
      return { messages, format: 'csv', fileName, warnings: [] };
    }
  }

  // Plain text: "Sender [timestamp]: body" or "Sender: body"
  const messages = parsePlainTextConversation(trimmed);
  return {
    messages,
    format: 'plain_text',
    fileName,
    warnings: messages.length ? [] : ['No messages could be parsed from this file.'],
  };
}

function looksLikeCsv(text) {
  const first = text.split(/\r?\n/).find((l) => l.trim());
  if (!first) return false;
  return /sender|from|body|message|text|timestamp|date/i.test(first) && first.includes(',');
}

function parseCsvConversation(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = {
    sender: headers.findIndex((h) => /^(sender|from|contact|address)$/.test(h)),
    body: headers.findIndex((h) => /^(body|message|text|content)$/.test(h)),
    timestamp: headers.findIndex((h) => /^(timestamp|date|time|sent_at|datetime)$/.test(h)),
  };
  if (idx.body < 0) return [];

  return lines.slice(1).map((line, i) => {
    const cols = splitCsvLine(line);
    return normalizeMessage(
      {
        sender: idx.sender >= 0 ? cols[idx.sender] : 'Unknown',
        body: cols[idx.body] || '',
        timestamp: idx.timestamp >= 0 ? cols[idx.timestamp] : '',
      },
      i
    );
  }).filter((m) => m.body);
}

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseSmsXml(text) {
  const messages = [];
  const smsRegex = /<sms\b([^>]*)\/?>/gi;
  let match;
  while ((match = smsRegex.exec(text)) !== null) {
    const attrs = match[1];
    const body = attr(attrs, 'body');
    const address = attr(attrs, 'address');
    const date = attr(attrs, 'date') || attr(attrs, 'readable_date');
    const type = attr(attrs, 'type');
    const sender = type === '2' ? 'Me' : address || 'Unknown';
    if (body) {
      messages.push(
        normalizeMessage(
          {
            sender,
            body: decodeXml(body),
            timestamp: date || '',
          },
          messages.length
        )
      );
    }
  }
  return messages;
}

function attr(attrs, name) {
  const m = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i').exec(attrs);
  return m ? m[1] : '';
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parsePlainTextConversation(text) {
  const lines = text.split(/\r?\n/);
  const messages = [];
  let current = null;

  // [timestamp] Sender: body
  const bracketTimeSender =
    /^\[([^\]]+)\]\s*([^:]+):\s*(.*)$/;
  // Sender [timestamp]: body  OR  Sender (timestamp): body
  const senderTimeBody =
    /^([^:\n]+?)\s*(?:\[([^\]\n]+)\]|\(([^)\n]+)\))\s*:\s*(.*)$/;
  // Sender: body
  const senderBody = /^([^:\n]+):\s*(.*)$/;

  for (const line of lines) {
    if (!line.trim()) continue;

    let next = null;
    let m = line.match(bracketTimeSender);
    if (m) {
      next = { timestamp: m[1].trim(), sender: m[2].trim(), body: (m[3] || '').trim() };
    } else if ((m = line.match(senderTimeBody))) {
      next = {
        sender: m[1].trim(),
        timestamp: (m[2] || m[3] || '').trim(),
        body: (m[4] || '').trim(),
      };
    } else if ((m = line.match(senderBody))) {
      next = { sender: m[1].trim(), timestamp: '', body: (m[2] || '').trim() };
    }

    if (next) {
      if (current) messages.push(current);
      current = next;
    } else if (current) {
      current.body = `${current.body}\n${line}`.trim();
    } else {
      current = { sender: 'Unknown', timestamp: '', body: line.trim() };
    }
  }
  if (current) messages.push(current);

  return messages.map((msg, idx) => normalizeMessage(msg, idx));
}

/** Sample conversation for the free demo / onboarding path. */
export function getSampleConversation() {
  const sample = `[2024-03-12 09:14] Alex Rivera: Can you send the signed addendum today?
[2024-03-12 09:16] Jordan Lee: Yes — attaching it after lunch. Account ending 4421 is on file.
[2024-03-12 09:17] Alex Rivera: Please confirm the warehouse address on Market Street.
[2024-03-12 12:41] Jordan Lee: Sent. Call me if counsel needs the original export.
[2024-03-12 12:45] Alex Rivera: Received. We will mark this thread as Exhibit 12.`;
  return parseMessageExport(sample, { fileName: 'sample-conversation.txt' });
}
