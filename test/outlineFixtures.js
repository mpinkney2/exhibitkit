/**
 * Synthetic outline files for extraction tests.
 * The words are fictional. They are not from a real case.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';

export const SAMPLE_OUTLINE_LINES = [
  'Direct examination outline',
  'Ask the witness about PX-0142 (Email from Smith to Jones regarding pricing).',
  'Then move to admit DX 12 at 42:5-43:10, the board minutes.',
  'Cross on JX-3 (Joint pretrial order) p. 4.',
  'Refer to PTX 8, damages summary, 15:2–16:8.',
  'Also DTX-4 (site photographs).',
  'Return to PX-0142 at p. 9 for the pricing clause.',
  'Offer FL-0001, the parenting plan, and skip Section 4 and March 12.',
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function buildDocxBytes(paragraphs) {
  const body = paragraphs.map((paragraph) => (
    `<w:p><w:r><w:t xml:space="preserve">${escapeXml(paragraph)}</w:t></w:r></w:p>`
  )).join('');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}</w:body>
</w:document>`);
  return zip.generateAsync({ type: 'uint8array' });
}

export async function buildTextPdfBytes(lines) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  let y = 740;
  for (const line of lines) {
    page.drawText(line, { x: 48, y, size: 11, font, color: rgb(0, 0, 0) });
    y -= 22;
  }
  return doc.save();
}

const ONE_PIXEL_PNG = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1,
  8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84, 8, 215, 99, 248, 207,
  192, 80, 15, 0, 4, 133, 1, 128, 132, 169, 140, 33, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

/** A page with a drawing and an image, and no text operators. */
export async function buildImageOnlyPdfBytes() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  page.drawRectangle({ x: 48, y: 400, width: 400, height: 180, color: rgb(0.75, 0.78, 0.82) });
  const image = await doc.embedPng(ONE_PIXEL_PNG);
  page.drawImage(image, { x: 72, y: 460, width: 96, height: 96 });
  return doc.save();
}

export function fileFromBytes(bytes, name, type) {
  const copy = new Uint8Array(bytes);
  return new File([copy], name, { type });
}
