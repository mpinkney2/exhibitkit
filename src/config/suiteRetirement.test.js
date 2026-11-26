import { describe, expect, it, vi } from 'vitest';
import { isLegacyWorkspaceEntry, isSuiteRetired } from './suiteRetirement.js';

describe('suiteRetirement', () => {
  it('treats explicit false as not retired', () => {
    vi.stubEnv('VITE_SUITE_RETIREMENT', 'false');
    vi.stubEnv('PROD', true);
    expect(isSuiteRetired()).toBe(false);
  });

  it('treats explicit true as retired', () => {
    vi.stubEnv('VITE_SUITE_RETIREMENT', 'true');
    vi.stubEnv('PROD', false);
    expect(isSuiteRetired()).toBe(true);
  });

  it('defaults to retired in production when unset', () => {
    vi.stubEnv('VITE_SUITE_RETIREMENT', '');
    vi.stubEnv('PROD', true);
    expect(isSuiteRetired()).toBe(true);
  });

  it('defaults to not retired in development when unset', () => {
    vi.stubEnv('VITE_SUITE_RETIREMENT', '');
    vi.stubEnv('PROD', false);
    expect(isSuiteRetired()).toBe(false);
  });

  it('detects legacy workspace query', () => {
    expect(isLegacyWorkspaceEntry('?legacy=workspace')).toBe(true);
    expect(isLegacyWorkspaceEntry('')).toBe(false);
  });
});