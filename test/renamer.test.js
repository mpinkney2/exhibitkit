import { expect, test } from 'vitest';
import {
  BATES_MODE_AS_EXHIBIT_ID,
  BATES_MODE_SEQUENTIAL,
  DEFAULT_BATES_MODE,
  applyTemplateTokens,
  batesLabel,
  extractYear,
  filenamePatternKind,
  generateProposedFilename,
  matchBatesFilename,
  parseFilename,
  resolveDuplicates,
  resolveExhibitIdentity,
  resolveExhibitNumber,
  shortenDescription,
  sortItems,
  validateProposedNames,
} from '../src/utils/renamer.js';
import { FILENAME_PATTERN_GUIDE } from '../src/config/limitsFacts.js';

test('parseFilename recognizes common exhibit conventions', () => {
  expect(parseFilename('PX-1 - Contract.pdf')).toEqual({
    prefix: 'PX',
    number: '1',
    description: 'Contract',
    year: null,
    docId: '1',
    author: '',
    title: '',
  });
  expect(parseFilename('04 - Jones Photo.pdf')).toEqual({
    prefix: '',
    number: '04',
    description: 'Jones Photo',
    year: null,
    docId: '04',
    author: '',
    title: '',
  });
});

test('parseFilename extracts years already present in titles', () => {
  expect(parseFilename('Smith 2012 Memo.pdf')).toMatchObject({
    year: '2012',
    author: 'Smith',
    title: 'Memo',
    description: 'Smith 2012 Memo',
  });
  expect(parseFilename('2019 - Board Minutes.pdf')).toMatchObject({
    year: '2019',
    number: '',
    description: '2019 Board Minutes',
  });
  expect(parseFilename('DOD - 12 - 2012 - Smith - Report.pdf')).toMatchObject({
    prefix: 'DOD',
    year: '2012',
    number: '12',
    docId: '12',
    author: 'Smith',
    title: 'Report',
    description: 'Smith Report',
  });
  expect(parseFilename('PX-4 - 2021 Settlement Agreement.pdf')).toMatchObject({
    year: '2021',
    number: '4',
  });
});

test('parseFilename prefers structured DOD pattern over generic DOD prefix match', () => {
  const parsed = parseFilename('DOD - 12 - 2012 - Smith - Report.pdf');
  expect(parsed.author).toBe('Smith');
  expect(parsed.title).toBe('Report');
  expect(parsed.description).not.toMatch(/2012 Smith Report/);
});

test('extractYear and resolveExhibitNumber support year-as-ID renaming', () => {
  expect(extractYear('Jones 2015 Report')).toBe('2015');
  expect(extractYear('No calendar here')).toBe(null);
  expect(resolveExhibitNumber({ parsedNumber: '4', year: '2015', useYearAsNumber: true })).toBe('2015');
  expect(resolveExhibitNumber({ parsedNumber: '4', year: '2015', useYearAsNumber: false })).toBe('4');
});

test('sortItems orders by year when present, then filename', () => {
  const sorted = sortItems([
    { originalName: 'Smith 2020 Memo.pdf', description: 'Smith 2020 Memo', year: '2020' },
    { originalName: 'Alpha.pdf', description: 'Alpha', year: null },
    { originalName: 'Jones 2015 Report.pdf', description: 'Jones 2015 Report', year: '2015' },
  ], 'year');

  expect(sorted.map((item) => item.originalName)).toEqual([
    'Jones 2015 Report.pdf',
    'Smith 2020 Memo.pdf',
    'Alpha.pdf',
  ]);
});

test('shortenDescription trims on a word boundary', () => {
  const long = 'Comprehensive Settlement Agreement Between Parties Regarding Licensing';
  expect(shortenDescription(long, 32)).toBe('Comprehensive Settlement');
  expect(shortenDescription('Short', 48)).toBe('Short');
});

test('generateProposedFilename applies OnCue and TrialDirector rules', () => {
  const base = { prefix: 'PX', number: '4', description: 'Jones Photo', padLength: 3, caseStyle: 'title' };

  expect(generateProposedFilename({ ...base, preset: 'oncue' })).toBe('PX004 Jones Photo.pdf');
  expect(generateProposedFilename({ ...base, preset: 'trialdirector' })).toBe('PX-004 - Jones Photo.pdf');
});

test('generateProposedFilename applies Patent DOD preset matching PP output', () => {
  expect(generateProposedFilename({
    prefix: 'DOD',
    number: '12',
    docId: '12',
    year: '2012',
    author: 'Smith',
    title: 'Report',
    description: 'Smith Report',
    preset: 'patent-dod',
    caseStyle: 'as-is',
  })).toBe('DOD - 12 - 2012 - Smith - Report.pdf');

  expect(generateProposedFilename({
    prefix: 'DOC',
    number: '5',
    docId: '5',
    year: null,
    author: 'Jones',
    title: 'Memo',
    description: 'Jones Memo',
    preset: 'patent-dod',
    caseStyle: 'as-is',
  })).toBe('DOC - 5 - n.d. - Jones - Memo.pdf');
});

test('generateProposedFilename can shorten titles and leave years unpadded', () => {
  const long = 'Comprehensive Settlement Agreement Between Parties Regarding Licensing';
  expect(generateProposedFilename({
    prefix: 'PX',
    number: '2019',
    description: long,
    preset: 'oncue',
    padLength: 3,
    caseStyle: 'title',
    shortenDesc: true,
    maxDescLength: 32,
  })).toBe('PX2019 Comprehensive Settlement.pdf');
});

test('applyTemplateTokens supports structured patent fields', () => {
  const result = applyTemplateTokens('{Prefix} - {DocId} - {Year} - {Author} - {Title}', {
    Prefix: 'DOD',
    DocId: '12',
    Year: '2012',
    Author: 'Smith',
    Title: 'Report',
  });
  expect(result).toBe('DOD - 12 - 2012 - Smith - Report');
});

test('generateProposedFilename applies area-specific preset aliases', () => {
  expect(generateProposedFilename({
    prefix: 'FL',
    number: '4',
    description: 'Parenting Plan',
    preset: 'family-oncue',
    padLength: 3,
    caseStyle: 'title',
  })).toBe('FL004 Parenting Plan.pdf');

  expect(generateProposedFilename({
    prefix: 'BK',
    number: '12',
    description: 'Creditor Schedule',
    preset: 'bankruptcy-trialdirector',
    padLength: 4,
    caseStyle: 'title',
  })).toBe('BK-0012 - Creditor Schedule.pdf');
});

test('validateProposedNames blocks duplicate and occupied target names', () => {
  const duplicates = validateProposedNames([
    { originalName: 'one.pdf', proposedName: 'PX001.pdf' },
    { originalName: 'two.pdf', proposedName: 'PX001.pdf' }
  ]);
  expect(duplicates.every(item => item.status === 'warning')).toBe(true);

  const occupied = validateProposedNames([
    { originalName: 'one.pdf', proposedName: 'two.pdf' },
    { originalName: 'two.pdf', proposedName: 'PX002.pdf' }
  ]);
  expect(occupied[0].status).toBe('warning');
  expect(occupied[0].message).toMatch(/already used/i);
});

test('parseFilename keeps existing patterns ahead of Bates-style names', () => {
  expect(parseFilename('PX-1 - Contract.pdf')).toMatchObject({ prefix: 'PX', number: '1' });
  expect(parseFilename('PX-1 - Contract.pdf').bates).toBeUndefined();
  expect(parseFilename('DX_2_Invoice.pdf')).toMatchObject({ prefix: 'DX', number: '2' });
  expect(parseFilename('PX-0001.pdf').bates).toBeUndefined();
  expect(parseFilename('PX000123.pdf')).toMatchObject({ prefix: 'PX', number: '000123' });
  expect(parseFilename('DX_0002.pdf')).toMatchObject({ prefix: 'DX', number: '0002' });
  expect(filenamePatternKind(parseFilename('DOD - 12 - 2012 - Smith - Report.pdf'))).toBe('dod');
  expect(filenamePatternKind(parseFilename('Jones 2015 Expert Report.pdf'))).toBe('author-year');
  expect(filenamePatternKind(parseFilename('2019 - Board Minutes.pdf'))).toBe('leading-year');
  expect(matchBatesFilename('2019 - Board Minutes')).toBeNull();
  expect(matchBatesFilename('Smith 2012 Memo')).toBeNull();
  expect(matchBatesFilename('PX-0001')).toBeNull();
});

test('parseFilename reads prefix words Exhibit number', () => {
  expect(parseFilename('DEP Jones Exhibit 3.pdf')).toMatchObject({
    prefix: 'DEP',
    number: '3',
    description: 'Jones',
    exhibitStyle: 'wordy',
  });
  expect(filenamePatternKind(parseFilename('DEP Jones Exhibit 3 - Transcript.pdf'))).toBe('wordy');
  expect(parseFilename('DEP Jones Exhibit 3 - Transcript.pdf').description).toBe('Jones Transcript');
});

test('parseFilename detects Bates-style names, ranges, and separators', () => {
  expect(parseFilename('SMITH000123.pdf').bates).toMatchObject({
    prefix: 'SMITH',
    separator: '',
    start: '000123',
    end: null,
    label: 'SMITH000123',
  });
  expect(parseFilename('ACME-000456.pdf').bates).toMatchObject({
    prefix: 'ACME',
    separator: '-',
    start: '000456',
    end: null,
  });
  expect(parseFilename('ACME_000789 - Supply Agreement.pdf').bates).toMatchObject({
    prefix: 'ACME',
    separator: '_',
    start: '000789',
  });
  expect(parseFilename('ACME_000789 - Supply Agreement.pdf').description).toBe('Supply Agreement');
  expect(parseFilename('ACME 001234 Deposition Excerpt.pdf').bates).toMatchObject({
    prefix: 'ACME',
    separator: ' ',
    start: '001234',
  });
  expect(parseFilename('ACME000123-ACME000140.pdf').bates).toMatchObject({
    prefix: 'ACME',
    start: '000123',
    end: '000140',
    label: 'ACME000123-ACME000140',
  });
  expect(filenamePatternKind(parseFilename('ACME000123-ACME000140.pdf'))).toBe('bates-range');
  expect(parseFilename('ACME-000123-ACME-000140.pdf').bates.label).toBe('ACME000123-ACME000140');
  expect(batesLabel(parseFilename('WIDGET0001001-WIDGET0001018.pdf').bates)).toBe('WIDGET0001001-WIDGET0001018');
});

test('filename guide examples match the parser', () => {
  for (const pattern of FILENAME_PATTERN_GUIDE) {
    for (const example of pattern.examples) {
      expect(filenamePatternKind(parseFilename(example)), example).toBe(pattern.id);
    }
  }
});

test('Bates mode defaults to sequential and manual edits win', () => {
  expect(DEFAULT_BATES_MODE).toBe(BATES_MODE_SEQUENTIAL);
  const bates = parseFilename('ACME-000456.pdf').bates;

  const sequential = resolveExhibitIdentity({
    bates,
    sourceDescription: '',
    index: 0,
    prefix: 'PX',
    startNumber: 1,
    batesMode: BATES_MODE_SEQUENTIAL,
  });
  expect(sequential.number).toBe('1');
  expect(sequential.descriptionLead).toBe('ACME000456');
  expect(generateProposedFilename({
    prefix: sequential.prefix,
    number: sequential.number,
    description: sequential.prose,
    descriptionLead: sequential.descriptionLead,
    preset: 'oncue',
    padLength: 3,
    caseStyle: 'title',
  })).toBe('PX001 ACME000456.pdf');

  const asId = resolveExhibitIdentity({
    bates,
    sourceDescription: 'Supply Agreement',
    prefix: 'PX',
    batesMode: BATES_MODE_AS_EXHIBIT_ID,
  });
  expect(asId.prefix).toBe('');
  expect(asId.number).toBe('ACME000456');
  expect(asId.descriptionLead).toBe('');
  expect(asId.description).toBe('Supply Agreement');

  const manual = resolveExhibitIdentity({
    bates,
    sourceDescription: 'Supply Agreement',
    description: 'Kept by hand',
    number: '99',
    userEditedNumber: true,
    userEditedDescription: true,
    batesMode: BATES_MODE_AS_EXHIBIT_ID,
  });
  expect(manual.number).toBe('99');
  expect(manual.description).toBe('Kept by hand');
  expect(manual.descriptionLead).toBe('');

  const ranged = resolveExhibitIdentity({
    bates: parseFilename('ACME000123-ACME000140.pdf').bates,
    sourceDescription: '',
    batesMode: BATES_MODE_AS_EXHIBIT_ID,
  });
  expect(generateProposedFilename({
    prefix: ranged.prefix,
    number: ranged.number,
    description: ranged.prose,
    preset: 'trialdirector',
    padLength: 3,
  })).toBe('ACME000123-ACME000140.pdf');
  expect(generateProposedFilename({
    prefix: '',
    number: 'ACME000123',
    description: 'Notes',
    preset: 'patent-dod',
  })).toBe('ACME000123 - n.d. - Notes.pdf');
});

test('descriptionLead keeps a Bates range hyphen', () => {
  expect(generateProposedFilename({
    prefix: 'PX',
    number: '2',
    description: 'Supply Agreement',
    descriptionLead: 'ACME000123-ACME000140',
    preset: 'oncue',
    padLength: 3,
    caseStyle: 'title',
  })).toBe('PX002 ACME000123-ACME000140 Supply Agreement.pdf');
});

test('resolveDuplicates produces unique valid output names', () => {
  const resolved = resolveDuplicates([
    { originalName: 'one.pdf', proposedName: 'PX001.pdf' },
    { originalName: 'two.pdf', proposedName: 'PX001.pdf' }
  ]);

  expect(resolved.map(item => item.proposedName)).toEqual(['PX001.pdf', 'PX001_v2.pdf']);
  expect(resolved.every(item => item.status === 'success')).toBe(true);
});
