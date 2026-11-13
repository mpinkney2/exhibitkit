import { describe, expect, it } from 'vitest';
import {
  BENCHMARK_PLACEHOLDER,
  CODED_FILE_SIZE_LIMIT,
  CODED_PAGE_LIMIT,
  DEFAULT_BATES_MODE,
  FREE_MAX_FILES_PER_BATCH,
  PREPARED_BATCH_ZIP_NAME,
} from './limitsFacts';

describe('limits facts', () => {
  it('states only coded limits and leaves timings unmeasured', () => {
    expect(FREE_MAX_FILES_PER_BATCH).toBe(5);
    expect(CODED_FILE_SIZE_LIMIT).toBeNull();
    expect(CODED_PAGE_LIMIT).toBeNull();
    expect(DEFAULT_BATES_MODE).toBe('sequential');
    expect(PREPARED_BATCH_ZIP_NAME).toBe('exhibit_batch_prepared.zip');
    expect(BENCHMARK_PLACEHOLDER).toBe('Benchmarking in progress');
  });
});