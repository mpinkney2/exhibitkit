import { beforeEach, describe, expect, it } from 'vitest';
import {
  BATES_MODE_AS_EXHIBIT_ID,
  BATES_MODE_SEQUENTIAL,
  BATES_MODE_STORAGE_KEY,
  readBatesMode,
  writeBatesMode,
} from './batesMode';

describe('bates mode setting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to sequential numbering', () => {
    expect(readBatesMode()).toBe(BATES_MODE_SEQUENTIAL);
    localStorage.setItem(BATES_MODE_STORAGE_KEY, 'use-the-stamp');
    expect(readBatesMode()).toBe(BATES_MODE_SEQUENTIAL);
  });

  it('persists the Bates-as-ID choice', () => {
    expect(writeBatesMode(BATES_MODE_AS_EXHIBIT_ID)).toBe(BATES_MODE_AS_EXHIBIT_ID);
    expect(localStorage.getItem(BATES_MODE_STORAGE_KEY)).toBe(BATES_MODE_AS_EXHIBIT_ID);
    expect(readBatesMode()).toBe(BATES_MODE_AS_EXHIBIT_ID);
  });
});
