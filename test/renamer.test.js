import { expect, test } from 'vitest';
import {
  extractYear,
  generateProposedFilename,
  parseFilename,
  resolveDuplicates,
  resolveExhibitNumber,
  shortenDescription,
  sortItems,
  validateProposedNames,
} from '../src/utils/renamer.js';

test('parseFilename recognizes common exhibit conventions', () => {
  expect(parseFilename('PX-1 - Contract.pdf')).toEqual({
    prefix: 'PX',
    number: '1',
    description: 'Contract',
    year: null,
  });
  expect(parseFilename('04 - Jones Photo.pdf')).toEqual({
    prefix: '',
    number: '04',
    description: 'Jones Photo',
    year: null,
  });
});

test('parseFilename extracts years already present in titles', () => {
  expect(parseFilename('Smith 2012 Memo.pdf')).toMatchObject({
    year: '2012',
    description: 'Smith 2012 Memo',
  });
  expect(parseFilename('2019 - Board Minutes.pdf')).toMatchObject({
    year: '2019',
    number: '',
    description: '2019 Board Minutes',
  });
  expect(parseFilename('DOD - 12 - 2012 - Smith - Report.pdf')).toMatchObject({
    year: '2012',
    number: '12',
  });
  expect(parseFilename('PX-4 - 2021 Settlement Agreement.pdf')).toMatchObject({
    year: '2021',
    number: '4',
  });
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

test('resolveDuplicates produces unique valid output names', () => {
  const resolved = resolveDuplicates([
    { originalName: 'one.pdf', proposedName: 'PX001.pdf' },
    { originalName: 'two.pdf', proposedName: 'PX001.pdf' }
  ]);

  expect(resolved.map(item => item.proposedName)).toEqual(['PX001.pdf', 'PX001_v2.pdf']);
  expect(resolved.every(item => item.status === 'success')).toBe(true);
});
