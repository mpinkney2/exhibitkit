import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateProposedFilename,
  parseFilename,
  resolveDuplicates,
  validateProposedNames
} from '../src/utils/renamer.js';

test('parseFilename recognizes common exhibit conventions', () => {
  assert.deepEqual(parseFilename('PX-1 - Contract.pdf'), {
    prefix: 'PX',
    number: '1',
    description: 'Contract'
  });
  assert.deepEqual(parseFilename('04 - Jones Photo.pdf'), {
    prefix: '',
    number: '04',
    description: 'Jones Photo'
  });
});

test('generateProposedFilename applies OnCue and TrialDirector rules', () => {
  const base = { prefix: 'PX', number: '4', description: 'Jones Photo', padLength: 3, caseStyle: 'title' };

  assert.equal(generateProposedFilename({ ...base, preset: 'oncue' }), 'PX004 Jones Photo.pdf');
  assert.equal(generateProposedFilename({ ...base, preset: 'trialdirector' }), 'PX-004 - Jones Photo.pdf');
});

test('validateProposedNames blocks duplicate and occupied target names', () => {
  const duplicates = validateProposedNames([
    { originalName: 'one.pdf', proposedName: 'PX001.pdf' },
    { originalName: 'two.pdf', proposedName: 'PX001.pdf' }
  ]);
  assert.ok(duplicates.every(item => item.status === 'warning'));

  const occupied = validateProposedNames([
    { originalName: 'one.pdf', proposedName: 'two.pdf' },
    { originalName: 'two.pdf', proposedName: 'PX002.pdf' }
  ]);
  assert.equal(occupied[0].status, 'warning');
  assert.match(occupied[0].message, /already used/i);
});

test('resolveDuplicates produces unique valid output names', () => {
  const resolved = resolveDuplicates([
    { originalName: 'one.pdf', proposedName: 'PX001.pdf' },
    { originalName: 'two.pdf', proposedName: 'PX001.pdf' }
  ]);

  assert.deepEqual(resolved.map(item => item.proposedName), ['PX001.pdf', 'PX001_v2.pdf']);
  assert.ok(resolved.every(item => item.status === 'success'));
});
