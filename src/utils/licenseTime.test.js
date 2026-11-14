import { describe, expect, it } from 'vitest';
import {
  calendarDaysRemaining,
  daysRemainingPhrase,
  isNearExpiry,
  NEAR_EXPIRY_DAYS,
} from './licenseTime.js';

const NOW = new Date('2026-11-14T18:00:00.000Z');

describe('calendar days remaining', () => {
  it('counts whole UTC dates, including 12 days, one day, and the last day', () => {
    expect(calendarDaysRemaining('2026-11-26T18:00:00.000Z', NOW)).toBe(12);
    expect(daysRemainingPhrase(12)).toBe('12 days left');

    expect(calendarDaysRemaining('2026-11-15T18:00:00.000Z', NOW)).toBe(1);
    expect(daysRemainingPhrase(1)).toBe('1 day left');

    expect(calendarDaysRemaining('2026-11-14T23:30:00.000Z', NOW)).toBe(0);
    expect(daysRemainingPhrase(0)).toBe('Last day');
  });

  it('treats a passed expiry instant as ended, including earlier the same UTC date', () => {
    expect(calendarDaysRemaining('2026-11-14T12:00:00.000Z', NOW)).toBe(-1);
    expect(calendarDaysRemaining('2026-11-01T00:00:00.000Z', NOW)).toBe(-1);
    expect(daysRemainingPhrase(-1)).toBeNull();
    expect(daysRemainingPhrase(null)).toBeNull();
  });

  it('marks the last day through 7 days as near expiry', () => {
    expect(NEAR_EXPIRY_DAYS).toBe(7);
    expect(isNearExpiry(0)).toBe(true);
    expect(isNearExpiry(1)).toBe(true);
    expect(isNearExpiry(7)).toBe(true);
    expect(isNearExpiry(8)).toBe(false);
    expect(isNearExpiry(-1)).toBe(false);
  });
});
