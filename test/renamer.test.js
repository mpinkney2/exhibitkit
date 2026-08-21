import { expect, test } from 'vitest';
import {
  generateProposedFilename,
  parseFilename,
  resolveDuplicates,
  validateProposedNames
} from '../src/utils/renamer.js';

test('parseFilename recognizes common exhibit conventions', () => {
  expect(parseFilename('PX-1 - Contract.pdf')).toEqual({
    prefix: 'PX',
    number: '1',
    description: 'Contract'
  });
  expect(parseFilename('04 - Jones Photo.pdf')).toEqual({
    prefix: '',
    number: '04',
    description: 'Jones Photo'
  });
});

test('generateProposedFilename applies OnCue and TrialDirector rules', () => {
  const base = { prefix: 'PX', number: '4', description: 'Jones Photo', padLength: 3, caseStyle: 'title' };

  expect(generateProposedFilename({ ...base, preset: 'oncue' })).toBe('PX004 Jones Photo.pdf');
  expect(generateProposedFilename({ ...base, preset: 'trialdirector' })).toBe('PX-004 - Jones Photo.pdf');
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
