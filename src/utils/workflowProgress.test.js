import { describe, expect, it } from 'vitest';
import { getMessageWorkflowIndex, getRenameWorkflowIndex } from './workflowProgress';

describe('getRenameWorkflowIndex', () => {
  it('starts on Select with an empty workspace', () => {
    expect(getRenameWorkflowIndex({ itemCount: 0, hasRenamed: false })).toBe(0);
  });

  it('moves to Review after exhibits are ingested', () => {
    expect(getRenameWorkflowIndex({ itemCount: 12, hasRenamed: false })).toBe(1);
  });

  it('highlights Rename after a successful rename', () => {
    expect(getRenameWorkflowIndex({ itemCount: 12, hasRenamed: true })).toBe(2);
  });
});

describe('getMessageWorkflowIndex', () => {
  it('starts on Import with no exhibits', () => {
    expect(getMessageWorkflowIndex({ exhibitCount: 0, hasExported: false })).toBe(0);
  });

  it('moves to Review after import', () => {
    expect(getMessageWorkflowIndex({ exhibitCount: 1, hasExported: false })).toBe(1);
  });

  it('highlights Export after a package is produced', () => {
    expect(getMessageWorkflowIndex({ exhibitCount: 1, hasExported: true })).toBe(2);
  });
});
