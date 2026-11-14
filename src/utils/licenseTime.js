/**
 * Calendar countdown for time-limited licenses (beta and Case Pass).
 * Days are whole UTC dates. A license that expires later today is the last day.
 * A license whose expiry instant has passed is ended, even on that same date.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const NEAR_EXPIRY_DAYS = 7;

function instant(value) {
  const ms = value instanceof Date ? value.getTime() : Date.parse(value || '');
  return Number.isFinite(ms) ? ms : null;
}

function utcDayNumber(ms) {
  const date = new Date(ms);
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY);
}

/**
 * Whole UTC calendar days from `now` until `expiresAt`.
 * 0 is the expiry date while the instant is still ahead ("Last day").
 * Negative means the expiry instant has passed.
 * null means the date is missing or not a date.
 */
export function calendarDaysRemaining(expiresAt, now = new Date()) {
  const expiryMs = instant(expiresAt);
  const nowMs = instant(now);
  if (expiryMs == null || nowMs == null) return null;
  if (expiryMs <= nowMs) return -1;
  return utcDayNumber(expiryMs) - utcDayNumber(nowMs);
}

export function daysRemainingPhrase(days) {
  if (!Number.isInteger(days) || days < 0) return null;
  if (days === 0) return 'Last day';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export function isNearExpiry(days) {
  return Number.isInteger(days) && days >= 0 && days <= NEAR_EXPIRY_DAYS;
}

export function daysBetween(start, end) {
  const startMs = instant(start);
  const endMs = instant(end);
  if (startMs == null || endMs == null) return null;
  return utcDayNumber(endMs) - utcDayNumber(startMs);
}
