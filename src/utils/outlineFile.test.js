/**
 * @vitest-environment node
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractOutlineCites } from './outlineExtract';
import { OutlineFileError, readOutlineText, setOutlinePdfWorkerSrc } from './outlineFile';
import {
  SAMPLE_OUTLINE_LINES,
  buildDocxBytes,
  buildImageOnlyPdfBytes,
  buildTextPdfBytes,
  fileFromBytes,
} from '../../test/outlineFixtures';

const require = createRequire(import.meta.url);
setOutlinePdfWorkerSrc(
  pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href,
);

describe('outline file text', () => {
  it('reads a synthetic docx in order and finds the same cites', async () => {
    const bytes = await buildDocxBytes(SAMPLE_OUTLINE_LINES);
    const file = fileFromBytes(
      bytes,
      'examination-outline.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    const text = await readOutlineText(file);
    expect(text).toContain('PX-0142');
    expect(text.indexOf('PX-0142')).toBeLessThan(text.indexOf('DX 12'));
    expect(text.indexOf('DX 12')).toBeLessThan(text.indexOf('JX-3'));
    expect(extractOutlineCites(text).map((row) => row.cite)).toEqual([
      'PX-0142',
      'DX 12',
      'JX-3',
      'PTX 8',
      'DTX-4',
      'PX-0142',
      'FL-0001',
    ]);
  });

  it('reads a text-based PDF in order', async () => {
    const bytes = await buildTextPdfBytes(SAMPLE_OUTLINE_LINES);
    const file = fileFromBytes(bytes, 'examination-outline.pdf', 'application/pdf');
    const text = await readOutlineText(file);
    const cites = extractOutlineCites(text);
    expect(cites.map((row) => row.cite)).toEqual([
      'PX-0142',
      'DX 12',
      'JX-3',
      'PTX 8',
      'DTX-4',
      'PX-0142',
      'FL-0001',
    ]);
    expect(cites[1].designation).toBe('42:5-43:10');
    expect(cites[3].designation).toBe('15:2-16:8');
    expect(cites[0].description).toContain('Email from Smith');
  });

  it('reports a scanned PDF that has no extractable text', async () => {
    const bytes = await buildImageOnlyPdfBytes();
    const file = fileFromBytes(bytes, 'scanned-outline.pdf', 'application/pdf');
    await expect(readOutlineText(file)).rejects.toMatchObject({
      name: 'OutlineFileError',
      code: 'no-text',
    });
    await expect(readOutlineText(file)).rejects.toThrow(/no extractable text/i);
    await expect(readOutlineText(file)).rejects.toThrow(/OCR/i);
  });

  it('rejects an older .doc name without reading it as a PDF', async () => {
    const file = fileFromBytes(new Uint8Array([1, 2, 3]), 'outline.doc', 'application/msword');
    await expect(readOutlineText(file)).rejects.toBeInstanceOf(OutlineFileError);
    await expect(readOutlineText(file)).rejects.toMatchObject({ code: 'unsupported' });
  });
});
