/**
 * Read a Word .docx or text-based PDF outline entirely in the browser.
 * mammoth and pdfjs are loaded only when an outline file is opened.
 */

export const OUTLINE_FILE_MAX_BYTES = 32 * 1024 * 1024;

const UNSUPPORTED = 'Upload a Word .docx outline or a text-based PDF. Older .doc files are not supported.';
const NO_TEXT = 'This PDF has no extractable text. It looks scanned or image-only. ExhibitKit does not run OCR. Paste the citations, or upload a text-based PDF or a Word .docx outline.';
const EMPTY_DOCX = 'This Word file has no text to read.';
const TOO_BIG = 'This outline is larger than 32 MB. Paste the citations, or upload a smaller file.';
const PASSWORD = 'This PDF is password-protected. Remove the password, or paste the citations.';
const READ_FAILED = 'This file could not be read as a Word outline or a text-based PDF.';

let pdfWorkerSrc = '';

export class OutlineFileError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'OutlineFileError';
    this.code = code;
  }
}

/** Node tests set a file URL. The browser build uses the bundled worker. */
export function setOutlinePdfWorkerSrc(src) {
  pdfWorkerSrc = String(src || '');
}

function extensionOf(name) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(name || ''));
  return match ? match[1].toLowerCase() : '';
}

async function bytesOf(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > OUTLINE_FILE_MAX_BYTES) {
    throw new OutlineFileError('too-big', TOO_BIG);
  }
  if (bytes.byteLength === 0) {
    throw new OutlineFileError('empty', READ_FAILED);
  }
  return bytes;
}

async function readDocx(bytes) {
  const mammoth = await import('mammoth');
  const api = mammoth.default || mammoth;
  const result = await api.extractRawText({
    arrayBuffer: bytes.buffer,
    buffer: bytes,
  });
  const text = String(result?.value || '').trim();
  if (!text) throw new OutlineFileError('empty', EMPTY_DOCX);
  return text;
}

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (pdfWorkerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
  } else if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  }
  return pdfjs;
}

function textFromItems(items) {
  const lines = [];
  let current = '';
  let lastY = null;
  const pushLine = () => {
    if (current) lines.push(current);
    current = '';
  };

  for (const item of items || []) {
    const str = item?.str ?? '';
    const y = item?.transform?.[5];
    const gap = lastY != null && typeof y === 'number' && Math.abs(y - lastY) > 2;
    if (gap && current) pushLine();
    if (str) {
      if (current && !current.endsWith(' ') && !str.startsWith(' ')) current += ' ';
      current += str;
    }
    if (typeof y === 'number') lastY = y;
    if (item?.hasEOL) pushLine();
  }
  pushLine();
  return lines.join('\n');
}

async function readPdf(data) {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({
    data,
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(textFromItems(content.items));
    }
    const text = pages.join('\n').trim();
    if (!/[A-Za-z]/.test(text)) {
      throw new OutlineFileError('no-text', NO_TEXT);
    }
    return text;
  } finally {
    if (typeof task.destroy === 'function') {
      await task.destroy().catch(() => {});
    }
  }
}

/**
 * @param {File|Blob & { name?: string, size?: number }} file
 * @returns {Promise<string>}
 */
export async function readOutlineText(file) {
  const ext = extensionOf(file?.name);
  if (ext !== 'docx' && ext !== 'pdf') {
    throw new OutlineFileError('unsupported', UNSUPPORTED);
  }
  if (Number(file?.size || 0) > OUTLINE_FILE_MAX_BYTES) {
    throw new OutlineFileError('too-big', TOO_BIG);
  }
  try {
    const bytes = await bytesOf(file);
    if (ext === 'docx') return await readDocx(bytes);
    return await readPdf(bytes);
  } catch (error) {
    if (error instanceof OutlineFileError) throw error;
    const name = String(error?.name || '');
    if (name === 'PasswordException' || /password/i.test(String(error?.message || ''))) {
      throw new OutlineFileError('password', PASSWORD);
    }
    throw new OutlineFileError('read-failed', READ_FAILED);
  }
}
