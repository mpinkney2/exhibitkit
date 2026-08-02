import { describe, expect, it } from 'vitest';
import { buildExhibitFileName, resolveFileNameCollisions } from './fileNames';

describe('file name collisions', () => {
  it('builds exhibit file names', () => {
    expect(buildExhibitFileName({ label: 'Messages', index: 1, prefix: 'EX' })).toBe(
      'EX001_Messages.pdf'
    );
  });

  it('resolves colliding names safely', () => {
    const names = resolveFileNameCollisions([
      'EX001_Messages.pdf',
      'EX001_Messages.pdf',
      'EX002_Other.pdf',
    ]);
    expect(names[0]).toBe('EX001_Messages.pdf');
    expect(names[1]).toBe('EX001_Messages_2.pdf');
    expect(names[2]).toBe('EX002_Other.pdf');
  });
});
