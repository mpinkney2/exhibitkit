import JSZip from 'jszip';

/**
 * PDF File objects from a test-pack zip. Manifest and readme entries are skipped.
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {Promise<File[]>}
 */
export async function pdfFilesFromZipBytes(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files)
    .filter((name) => !zip.files[name].dir && name.toLowerCase().endsWith('.pdf'))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const files = [];
  for (const name of names) {
    const bytes = await zip.files[name].async('uint8array');
    const base = name.split('/').pop();
    files.push(new File([bytes], base, { type: 'application/pdf' }));
  }
  return files;
}

export async function fetchTestPackIndex(fetchImpl = fetch) {
  const response = await fetchImpl('/test-packs/index.json');
  if (!response.ok) return null;
  return response.json();
}

export function formatByteSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
  const mb = value / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}
