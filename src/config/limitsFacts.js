/**
 * Facts the Limits & sizes page is allowed to state.
 * Counts and patterns come from the rename code. Timing and maximum-size
 * figures are intentionally absent until they are measured.
 */

import { FREE_MAX_FILES_PER_BATCH } from './pricing.js';
import { PUBLISHED_PACKS, packStats } from './testPacks.js';
import {
  BATES_MODE_AS_EXHIBIT_ID,
  BATES_MODE_SEQUENTIAL,
  DEFAULT_BATES_MODE,
  EXHIBIT_PREFIX_LIST,
} from '../utils/renamer.js';

/** Download name used when there is no folder handle. */
export const PREPARED_BATCH_ZIP_NAME = 'exhibit_batch_prepared.zip';

/** The rename path does not enforce a byte or page ceiling. */
export const CODED_FILE_SIZE_LIMIT = null;
export const CODED_PAGE_LIMIT = null;

export const BENCHMARK_PLACEHOLDER = 'Benchmarking in progress';

export const FILENAME_PATTERN_GUIDE = Object.freeze([
  {
    id: 'dod',
    label: 'Structured patent / DOD',
    detail: 'Prefix, document id, 4-digit year, author, and title. This is checked before a generic prefix match.',
    examples: ['DOD - 12 - 2012 - Smith - Report.pdf'],
  },
  {
    id: 'prefix',
    label: 'Exhibit prefix and number',
    detail: `Prefixes: ${EXHIBIT_PREFIX_LIST.join(', ')}. A hyphen, underscore, or space before the number is optional. These names are not treated as Bates numbers.`,
    examples: ['PX-1 - Contract.pdf', 'DX_2_Invoice.pdf', 'PX-0001.pdf'],
  },
  {
    id: 'wordy',
    label: 'Prefix, words, Exhibit, number',
    detail: 'The same prefixes, then words, the word Exhibit, and a number.',
    examples: ['DEP Jones Exhibit 3.pdf'],
  },
  {
    id: 'leading-number',
    label: 'Leading number',
    detail: 'A number at the start of the name, then a description.',
    examples: ['04 - Jones Photo.pdf'],
  },
  {
    id: 'leading-year',
    label: 'Leading calendar year',
    detail: 'A leading 19xx or 20xx year stays a year. It is not an exhibit number and it is not a Bates number.',
    examples: ['2019 - Board Minutes.pdf'],
  },
  {
    id: 'author-year',
    label: 'Author and year',
    detail: 'Author, a 19xx or 20xx year, and a title. Checked before Bates-style names.',
    examples: ['Jones 2015 Expert Report.pdf'],
  },
  {
    id: 'bates',
    label: 'Bates-style filename',
    detail: '2–12 letters, an optional hyphen, underscore, or space, then 4–10 digits. A range repeats the prefix. An optional description may follow. Known exhibit prefixes above are left alone.',
    examples: ['SMITH000123.pdf', 'ACME-000456.pdf', 'ACME_000789 - Supply Agreement.pdf'],
  },
  {
    id: 'bates-range',
    label: 'Bates-style range',
    detail: 'A Bates number, a hyphen, and the same prefix with another 4–10 digit number.',
    examples: ['ACME000123-ACME000140.pdf'],
  },
  {
    id: 'unstructured',
    label: 'Anything else',
    detail: 'The file name becomes the description and the batch can number it sequentially.',
    examples: ['Unstructured Memo.pdf'],
  },
]);

export const BATES_MODE_GUIDE = Object.freeze([
  {
    id: BATES_MODE_SEQUENTIAL,
    label: 'Number exhibits sequentially (PX-1, PX-2…) and keep the Bates number in the description',
    isDefault: DEFAULT_BATES_MODE === BATES_MODE_SEQUENTIAL,
  },
  {
    id: BATES_MODE_AS_EXHIBIT_ID,
    label: 'Use Bates number as exhibit ID',
    isDefault: DEFAULT_BATES_MODE === BATES_MODE_AS_EXHIBIT_ID,
  },
]);

export const PUBLISHED_PACK_STATS = PUBLISHED_PACKS.map((pack) => packStats(pack));

export { FREE_MAX_FILES_PER_BATCH, EXHIBIT_PREFIX_LIST, DEFAULT_BATES_MODE };
