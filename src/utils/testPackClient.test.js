import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { formatByteSize, pdfFilesFromZipBytes } from './testPackClient';

describe('test pack zip loading', () => {
  it('returns only PDF File objects', async () => {
    const zip = new JSZip();
    zip.file('README.txt', 'sample');
    zip.file('manifest.json', '{}');
    zip.file('PX-1 - Contract.pdf', new Uint8Array([37, 80, 68, 70]));
    zip.file('notes/ACME-000456.pdf', new Uint8Array([37, 80, 68, 70, 45]));
    const buffer = await zip.generateAsync({ type: 'uint8array' });
    const files = await pdfFilesFromZipBytes(buffer);
    expect(files.map((file) => file.name)).toEqual([
      'ACME-000456.pdf',
      'PX-1 - Contract.pdf',
    ]);
    expect(files[0]).toBeInstanceOf(File);
    expect(files[0].type).toBe('application/pdf');
    expect(files[0].size).toBe(5);
  });

  it('formats byte sizes from measured counts', () => {
    expect(formatByteSize(1536)).toBe('1.5 KB');
    expect(formatByteSize(2.5 * 1024 * 1024)).toBe('2.50 MB');
  });
});
