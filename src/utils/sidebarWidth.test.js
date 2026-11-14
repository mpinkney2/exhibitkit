import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_KEY,
  loadSidebarWidth,
  nudgeSidebarWidth,
  persistSidebarWidth,
  resetSidebarWidth,
} from './sidebarWidth.js';

beforeEach(() => {
  localStorage.clear();
});

describe('sidebar width persistence', () => {
  it('uses a default wide enough for menu labels when nothing is saved', () => {
    expect(loadSidebarWidth()).toBe(DEFAULT_SIDEBAR_WIDTH);
    expect(DEFAULT_SIDEBAR_WIDTH).toBeGreaterThanOrEqual(240);
    expect(DEFAULT_SIDEBAR_WIDTH).toBeLessThanOrEqual(280);
  });

  it('does not keep the old accidental 200px minimum as the saved width', () => {
    localStorage.setItem('exhibitkit_sidebar_width_v1', '200');
    expect(loadSidebarWidth()).toBe(DEFAULT_SIDEBAR_WIDTH);
  });

  it('keeps a width the user actually chose on the previous rail', () => {
    localStorage.setItem('exhibitkit_sidebar_width_v1', '360');
    expect(loadSidebarWidth()).toBe(360);
  });

  it('persists a resized width and reloads it', () => {
    expect(persistSidebarWidth(312)).toBe(312);
    expect(localStorage.getItem(SIDEBAR_WIDTH_KEY)).toBe('312');
    expect(loadSidebarWidth()).toBe(312);
  });

  it('clamps persisted and keyboard-nudged widths to the min and max', () => {
    expect(persistSidebarWidth(80)).toBe(MIN_SIDEBAR_WIDTH);
    expect(loadSidebarWidth()).toBe(MIN_SIDEBAR_WIDTH);
    expect(nudgeSidebarWidth(MIN_SIDEBAR_WIDTH, 'decrease')).toBe(MIN_SIDEBAR_WIDTH);

    persistSidebarWidth(900);
    expect(loadSidebarWidth()).toBe(MAX_SIDEBAR_WIDTH);
    expect(nudgeSidebarWidth(MAX_SIDEBAR_WIDTH, 'increase', { large: true })).toBe(MAX_SIDEBAR_WIDTH);
  });

  it('steps by a small amount, a larger amount with shift, and resets to the default', () => {
    expect(nudgeSidebarWidth(280, 'increase')).toBe(296);
    expect(nudgeSidebarWidth(280, 'decrease')).toBe(264);
    expect(nudgeSidebarWidth(280, 'increase', { large: true })).toBe(328);
    expect(resetSidebarWidth()).toBe(DEFAULT_SIDEBAR_WIDTH);
  });
});
