/**
 * Deterministic, auditable PDF exhibit generation (local-only via pdf-lib).
 */

import { PDFDocument, PDFName, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { prepareMessagesForExport } from './redact';
import { buildExhibitFileName, resolveFileNameCollisions } from './fileNames';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const LINE_HEIGHT = 14;

function wrapText(text, font, size, maxWidth) {
  const words = (text || '').toString().split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function drawFooter(page, font, text) {
  page.drawText(text, {
    x: MARGIN,
    y: 28,
    size: 8,
    font,
    color: rgb(0.35, 0.4, 0.45),
  });
}

/**
 * Build a single exhibit PDF from one conversation.
 */
export async function buildExhibitPdf({
  project,
  exhibit,
  includeCover = false,
  includeDeclaration = true,
  startPageNumber = 1,
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const messages = prepareMessagesForExport(exhibit.messages || []);

  let pageNumber = startPageNumber;

  if (includeCover) {
    const cover = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN - 40;
    cover.drawText('EXHIBIT COVER', {
      x: MARGIN,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35),
    });
    y -= 36;
    cover.drawText(exhibit.label || 'Exhibit', { x: MARGIN, y, size: 22, font: fontBold });
    y -= 28;
    if (project.caseName) {
      cover.drawText(`Matter: ${project.caseName}`, { x: MARGIN, y, size: 12, font });
      y -= 18;
    }
    if (project.court) {
      cover.drawText(`Court: ${project.court}`, { x: MARGIN, y, size: 12, font });
      y -= 18;
    }
    if (project.caption) {
      for (const line of wrapText(project.caption, font, 11, PAGE_WIDTH - MARGIN * 2)) {
        cover.drawText(line, { x: MARGIN, y, size: 11, font });
        y -= 16;
      }
    }
    y -= 24;
    cover.drawText('Prepared locally with ExhibitKit. Evidence was not uploaded.', {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: rgb(0.35, 0.4, 0.45),
    });
    drawFooter(cover, font, `Page ${pageNumber}`);
    pageNumber += 1;
  }

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const title = `${exhibit.label || 'Exhibit'} — Message Exhibit`;
  page.drawText(title, { x: MARGIN, y, size: 14, font: fontBold });
  y -= 22;
  page.drawText(
    'Sequential message references appear as MSG-###. Page references appear in the footer.',
    {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: rgb(0.35, 0.4, 0.45),
    }
  );
  y -= 24;

  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  for (const msg of messages) {
    const seqLabel = `MSG-${String(msg.seq).padStart(3, '0')}`;
    const header = `${seqLabel}  |  ${msg.sender}${msg.timestamp ? `  |  ${msg.timestamp}` : ''}`;
    const bodyLines = wrapText(msg.body || '', font, 11, maxWidth);
    const blockHeight = 18 + bodyLines.length * LINE_HEIGHT + (msg.redacted ? 12 : 0) + 10;

    if (y - blockHeight < MARGIN + 20) {
      drawFooter(page, font, `Page ${pageNumber}`);
      pageNumber += 1;
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    page.drawText(header, { x: MARGIN, y, size: 10, font: fontBold });
    y -= 16;
    for (const line of bodyLines) {
      page.drawText(line, { x: MARGIN, y, size: 11, font });
      y -= LINE_HEIGHT;
    }
    if (msg.redacted) {
      page.drawText('True redaction applied — selected content removed from this exhibit.', {
        x: MARGIN,
        y,
        size: 8,
        font,
        color: rgb(0.55, 0.25, 0.1),
      });
      y -= 12;
    }
    y -= 10;
  }

  drawFooter(page, font, `Page ${pageNumber}`);
  pageNumber += 1;

  if (includeDeclaration) {
    const decl = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let dy = PAGE_HEIGHT - MARGIN;
    decl.drawText('Declaration of Authenticity (Template)', {
      x: MARGIN,
      y: dy,
      size: 14,
      font: fontBold,
    });
    dy -= 28;
    const paragraphs = [
      'I declare under penalty of perjury that the foregoing is true and correct to the best of my knowledge:',
      '1. The attached message exhibit was prepared from an export of electronic messages in my possession or control.',
      '2. The SHA-256 fingerprint recorded in the source-integrity materials identifies the source file used for this exhibit and shows whether that file has changed since fingerprinting. It does not prove who authored the messages.',
      '3. ExhibitKit assisted with organization, redaction, and formatting. ExhibitKit does not certify authorship, authenticate the messages, or guarantee court admissibility.',
      '4. Any redactions shown in the exhibit reflect content intentionally removed (true redaction), not visual overlays.',
      '',
      'Date: ______________________',
      'Signature: ______________________',
      'Printed name: ______________________',
      'Capacity / relationship to the source: ______________________',
    ];
    for (const para of paragraphs) {
      for (const line of wrapText(para, font, 11, maxWidth)) {
        if (dy < MARGIN + 20) break;
        decl.drawText(line, { x: MARGIN, y: dy, size: 11, font });
        dy -= LINE_HEIGHT + 2;
      }
      dy -= 8;
    }
    drawFooter(decl, font, `Page ${pageNumber}`);
    pageNumber += 1;
  }

  const bytes = await pdf.save();
  return {
    bytes,
    pageCount: pdf.getPageCount(),
    nextPageNumber: pageNumber,
    messageCount: messages.length,
  };
}

export async function buildSourceIntegrityReport({ project }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  page.drawText('Source Integrity Report', { x: MARGIN, y, size: 16, font: fontBold });
  y -= 22;
  page.drawText(
    'SHA-256 fingerprints establish whether a source file has changed — not who authored the messages.',
    {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: rgb(0.35, 0.4, 0.45),
    }
  );
  y -= 28;

  for (const exhibit of project.exhibits || []) {
    if (y < MARGIN + 80) break;
    page.drawText(exhibit.label || 'Exhibit', { x: MARGIN, y, size: 12, font: fontBold });
    y -= 18;
    for (const source of exhibit.sourceFiles || []) {
      const lines = [
        `File: ${source.originalName}`,
        `Bytes: ${source.byteSize}`,
        `SHA-256: ${source.sha256}`,
      ];
      for (const line of lines) {
        for (const wrapped of wrapText(line, font, 10, PAGE_WIDTH - MARGIN * 2)) {
          page.drawText(wrapped, { x: MARGIN, y, size: 10, font });
          y -= 14;
        }
      }
      y -= 8;
    }
    y -= 8;
  }

  page.drawText('Generated locally by ExhibitKit. No evidence was uploaded.', {
    x: MARGIN,
    y: 40,
    size: 9,
    font,
    color: rgb(0.35, 0.4, 0.45),
  });

  return pdf.save();
}

export async function buildExhibitIndex({ project, exhibitSummaries }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  page.drawText('Exhibit Index & Evidence Manifest', { x: MARGIN, y, size: 16, font: fontBold });
  y -= 20;
  if (project.caseName) {
    page.drawText(`Matter: ${project.caseName}`, { x: MARGIN, y, size: 11, font });
    y -= 16;
  }
  if (project.caption) {
    for (const line of wrapText(project.caption, font, 10, PAGE_WIDTH - MARGIN * 2)) {
      page.drawText(line, { x: MARGIN, y, size: 10, font });
      y -= 14;
    }
  }
  y -= 16;

  page.drawText('Label', { x: MARGIN, y, size: 10, font: fontBold });
  page.drawText('Messages', { x: MARGIN + 160, y, size: 10, font: fontBold });
  page.drawText('Source SHA-256 (prefix)', { x: MARGIN + 240, y, size: 10, font: fontBold });
  y -= 16;

  for (const row of exhibitSummaries) {
    page.drawText(String(row.label || '').slice(0, 40), { x: MARGIN, y, size: 10, font });
    page.drawText(String(row.messageCount), { x: MARGIN + 160, y, size: 10, font });
    page.drawText((row.sha256Prefix || '—').slice(0, 16), {
      x: MARGIN + 240,
      y,
      size: 9,
      font,
    });
    y -= 16;
  }

  return pdf.save();
}

async function buildBinderPdf({ project, exhibitFiles, summaries }) {
  const binder = await PDFDocument.create();
  const font = await binder.embedFont(StandardFonts.TimesRoman);
  const fontBold = await binder.embedFont(StandardFonts.TimesRomanBold);

  const toc = binder.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  toc.drawText('Combined Exhibit Binder', { x: MARGIN, y, size: 16, font: fontBold });
  y -= 18;
  toc.drawText(project.caseName || 'Untitled matter', { x: MARGIN, y, size: 11, font });
  y -= 28;
  toc.drawText('Contents (internal links)', { x: MARGIN, y, size: 12, font: fontBold });
  y -= 20;

  const linkTargets = [];
  for (let i = 0; i < exhibitFiles.length; i++) {
    const src = await PDFDocument.load(exhibitFiles[i].bytes);
    const pages = await binder.copyPages(src, src.getPageIndices());
    const startPageIndex = binder.getPageCount();
    pages.forEach((p) => binder.addPage(p));
    linkTargets.push({
      label: summaries[i]?.label || exhibitFiles[i].name,
      pageIndex: startPageIndex,
    });
  }

  const annotRefs = [];
  let linkY = y;
  for (const target of linkTargets) {
    const label = `• ${target.label}`;
    toc.drawText(label, {
      x: MARGIN,
      y: linkY,
      size: 11,
      font,
      color: rgb(0.1, 0.25, 0.55),
    });
    const textWidth = font.widthOfTextAtSize(label, 11);
    const destPage = binder.getPage(target.pageIndex);
    const annot = binder.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [MARGIN, linkY - 2, MARGIN + Math.max(textWidth, 40) + 8, linkY + 12],
      Border: [0, 0, 0],
      C: [0.1, 0.25, 0.55],
      A: {
        Type: 'Action',
        S: 'GoTo',
        D: [destPage.ref, 'XYZ', null, null, null],
      },
    });
    annotRefs.push(binder.context.register(annot));
    linkY -= 18;
  }

  if (annotRefs.length) {
    toc.node.set(PDFName.of('Annots'), binder.context.obj(annotRefs));
  }

  return binder.save();
}

/**
 * Export package for Free or Pro.
 * Free: single exhibit PDF.
 * Pro/Case Pass: cover, index, integrity, per-exhibit PDFs, binder + ZIP.
 */
export async function exportProjectPackage(project, options = {}) {
  const pro = Boolean(options.pro);
  const exhibits = project.exhibits || [];
  if (!exhibits.length) {
    throw new Error('No exhibits to export');
  }
  if (!pro && exhibits.length > 1) {
    throw new Error('Free tier supports one conversation exhibit at a time');
  }

  const files = [];
  const summaries = [];
  let pageCursor = 1;

  for (let i = 0; i < exhibits.length; i++) {
    const exhibit = exhibits[i];
    const result = await buildExhibitPdf({
      project,
      exhibit,
      includeCover: pro,
      includeDeclaration: true,
      startPageNumber: pageCursor,
    });
    pageCursor = result.nextPageNumber;
    const desiredName = buildExhibitFileName({
      label: exhibit.label,
      index: (project.numbering?.startNumber || 1) + i,
      prefix: project.numbering?.exhibitPrefix || 'EX',
    });
    files.push({ name: desiredName, bytes: result.bytes, kind: 'exhibit' });
    summaries.push({
      label: exhibit.label,
      messageCount: result.messageCount,
      sha256Prefix: exhibit.sourceFiles?.[0]?.sha256 || '',
      fileName: desiredName,
    });
  }

  if (pro) {
    const indexBytes = await buildExhibitIndex({ project, exhibitSummaries: summaries });
    files.unshift({ name: '00_Exhibit_Index.pdf', bytes: indexBytes, kind: 'index' });

    const integrityBytes = await buildSourceIntegrityReport({ project });
    files.unshift({
      name: '00_Source_Integrity_Report.pdf',
      bytes: integrityBytes,
      kind: 'integrity',
    });

    const exhibitOnly = files.filter((f) => f.kind === 'exhibit');
    const binderBytes = await buildBinderPdf({
      project,
      exhibitFiles: exhibitOnly,
      summaries,
    });
    files.unshift({
      name: '00_Combined_Exhibit_Binder.pdf',
      bytes: binderBytes,
      kind: 'binder',
    });
  }

  const uniqueNames = resolveFileNameCollisions(files.map((f) => f.name));
  const namedFiles = files.map((f, idx) => ({ ...f, name: uniqueNames[idx] }));

  if (pro && options.zip !== false) {
    const zip = new JSZip();
    for (const file of namedFiles) {
      zip.file(file.name, file.bytes);
    }
    const zipBytes = await zip.generateAsync({ type: 'uint8array' });
    return {
      files: namedFiles,
      zip: { name: 'exhibitkit_export.zip', bytes: zipBytes },
      mode: 'pro',
    };
  }

  return {
    files: namedFiles,
    zip: null,
    mode: pro ? 'pro' : 'free',
  };
}

export function downloadBytes(bytes, fileName, mimeType = 'application/pdf') {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
