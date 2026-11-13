/**
 * Fictional exhibit test packs for beta testing.
 * File lists and page counts are the source of truth for the generator and the UI.
 * Standard and Large binaries are produced at build time and are not committed.
 */

import { FREE_MAX_FILES_PER_BATCH } from './pricing.js';

export const SAMPLE_CASE_CAPTION = 'SMITH v. ACME CORP., No. 26-CV-01001 (N.D. Ill.)';
export const SAMPLE_BANNER = 'SAMPLE — NOT A REAL CASE';
export const BATES_STAMP_PREFIX = 'ACME';
export const BATES_STAMP_WIDTH = 6;

const starter = {
  id: 'starter',
  label: 'Starter',
  published: true,
  bytesPerPage: 70000,
  files: [
    { name: 'PX-1 - Contract.pdf', pages: 2 },
    { name: 'DX_2_Invoice.pdf', pages: 1 },
    { name: 'DEP Jones Exhibit 3.pdf', pages: 3 },
    { name: 'ACME-000456.pdf', pages: 4 },
    { name: 'Unstructured Memo.pdf', pages: 5 },
  ],
};

const standard = {
  id: 'standard',
  label: 'Standard',
  published: true,
  bytesPerPage: 128000,
  files: [
    { name: 'PX-1 - Contract.pdf', pages: 2 },
    { name: 'DX_2_Invoice.pdf', pages: 1 },
    { name: 'DEP Jones Exhibit 3.pdf', pages: 8 },
    { name: 'DOD - 12 - 2012 - Smith - Report.pdf', pages: 4 },
    { name: '04 - Jones Photo.pdf', pages: 3 },
    { name: 'Jones 2015 Expert Report.pdf', pages: 12 },
    { name: '2019 - Board Minutes.pdf', pages: 6 },
    { name: 'SMITH000123.pdf', pages: 10 },
    { name: 'ACME-000456.pdf', pages: 15 },
    { name: 'ACME_000789 - Supply Agreement.pdf', pages: 20 },
    { name: 'ACME 001234 Deposition Excerpt.pdf', pages: 25 },
    { name: 'ACME000123-ACME000140.pdf', pages: 18 },
    { name: 'PLTF-10 - Opening Statement.pdf', pages: 7 },
    { name: 'GFX 8 - Demonstrative.pdf', pages: 5 },
    { name: 'Sample Production Binder.pdf', pages: 50 },
  ],
};

const large = {
  id: 'large',
  label: 'Large',
  published: true,
  bytesPerPage: 160000,
  files: [
    { name: 'PX-1 - Contract.pdf', pages: 3 },
    { name: 'DX_2_Invoice.pdf', pages: 2 },
    { name: 'EX-15 - Email Thread.pdf', pages: 6 },
    { name: 'DEP Jones Exhibit 3.pdf', pages: 10 },
    { name: 'DOD - 12 - 2012 - Smith - Report.pdf', pages: 8 },
    { name: '04 - Jones Photo.pdf', pages: 4 },
    { name: 'Jones 2015 Expert Report.pdf', pages: 14 },
    { name: '2019 - Board Minutes.pdf', pages: 9 },
    { name: 'Smith 2021 Settlement Agreement.pdf', pages: 11 },
    { name: 'SMITH000123.pdf', pages: 16 },
    { name: 'ACME-000456.pdf', pages: 20 },
    { name: 'ACME_000789 - Supply Agreement.pdf', pages: 22 },
    { name: 'NORTH 000321 Site Plan.pdf', pages: 18 },
    { name: 'ACME000123-ACME000140.pdf', pages: 24 },
    { name: 'WIDGET0001001-WIDGET0001018.pdf', pages: 12 },
    { name: 'PLTF-10 - Opening Statement.pdf', pages: 7 },
    { name: 'DEFT 4 - Answer.pdf', pages: 5 },
    { name: 'GFX-2 - Timeline.pdf', pages: 9 },
    { name: 'DOC - 5 - 2014 - Lee - Memo.pdf', pages: 6 },
    { name: 'EXHIBIT 12 - Photograph Log.pdf', pages: 8 },
    { name: 'DEF-7A - Rebuttal Chart.pdf', pages: 4 },
    { name: 'Unstructured Cover Email.pdf', pages: 3 },
    { name: 'Meeting Notes November.pdf', pages: 5 },
    { name: 'PX-30 - Appendix.pdf', pages: 25 },
    { name: 'ACME000500.pdf', pages: 150 },
  ],
};

function stressFiles() {
  const files = [];
  for (let index = 1; index <= 20; index += 1) {
    files.push({ name: `PX-${index} - Stress Sample.pdf`, pages: 5 });
  }
  files.push({ name: 'Unstructured Stress Binder.pdf', pages: 80 });
  files.push({ name: 'ACME009000.pdf', pages: 400 });
  return files;
}

const stress = {
  id: 'stress',
  label: 'Stress',
  published: false,
  bytesPerPage: 300000,
  files: stressFiles(),
};

const ramp = {
  id: 'ramp',
  label: 'Single-file ramp',
  published: false,
  bytesPerPage: 160000,
  files: [1, 5, 10, 25, 50, 100, 200].map((pages) => ({
    name: `Single File ${String(pages).padStart(3, '0')} Pages.pdf`,
    pages,
  })),
};

export const PUBLISHED_PACKS = Object.freeze([starter, standard, large]);
export const OPTIONAL_PACKS = Object.freeze([stress, ramp]);
export const ALL_PACKS = Object.freeze([...PUBLISHED_PACKS, ...OPTIONAL_PACKS]);

export function getPack(id) {
  return ALL_PACKS.find((pack) => pack.id === id) || null;
}

export function packStats(pack) {
  const pages = pack.files.map((file) => file.pages);
  const fileCount = pack.files.length;
  return {
    id: pack.id,
    label: pack.label,
    published: pack.published,
    fileCount,
    totalPages: pages.reduce((sum, count) => sum + count, 0),
    minPages: Math.min(...pages),
    maxPages: Math.max(...pages),
    fitsFreeCap: fileCount <= FREE_MAX_FILES_PER_BATCH,
    bytesPerPage: pack.bytesPerPage,
  };
}

export function formatBatesStamp(sequence) {
  return `${BATES_STAMP_PREFIX}${String(sequence).padStart(BATES_STAMP_WIDTH, '0')}`;
}

export function formatStampRange(startSequence, endSequence) {
  const start = formatBatesStamp(startSequence);
  const end = formatBatesStamp(endSequence);
  return start === end ? start : `${start}-${end}`;
}
