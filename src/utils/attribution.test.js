import { beforeEach, describe, expect, it } from 'vitest';
import {
  FIRST_TOUCH_STORAGE_KEY,
  LAST_TOUCH_STORAGE_KEY,
  attributionFromSearch,
  campaignParamsForCheckout,
  captureLandingAttribution,
  readCheckoutAttribution,
} from './attribution.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

describe('campaign attribution', () => {
  let local;
  let session;
  let storages;

  beforeEach(() => {
    local = memoryStorage();
    session = memoryStorage();
    storages = { local, session };
    localStorage.clear();
    sessionStorage.clear();
  });

  it('captures utm parameters and li_fat_id, and ignores exhibit fields', () => {
    const record = attributionFromSearch(
      '?utm_source=linkedin&utm_medium=cpc&utm_campaign=spring&utm_content=ad-a&utm_term=exhibits&li_fat_id=fat_123&filename=PX001.pdf&caseName=Doe',
    );

    expect(record).toEqual({
      utm_source: 'linkedin',
      utm_medium: 'cpc',
      utm_campaign: 'spring',
      utm_content: 'ad-a',
      utm_term: 'exhibits',
      li_fat_id: 'fat_123',
    });
    expect(record.filename).toBeUndefined();
    expect(record.caseName).toBeUndefined();
  });

  it('stores first touch once and replaces last touch in both storages', () => {
    const first = captureLandingAttribution(
      '?utm_source=linkedin&utm_medium=cpc&utm_campaign=launch&utm_content=ad&utm_term=trial&li_fat_id=fat1',
      storages,
    );
    const second = captureLandingAttribution(
      '?utm_source=newsletter&utm_campaign=followup',
      storages,
    );

    expect(first.captured).toBe(true);
    expect(first.first).toMatchObject({ utm_source: 'linkedin', utm_campaign: 'launch', li_fat_id: 'fat1' });
    expect(second.first).toMatchObject({ utm_source: 'linkedin', utm_campaign: 'launch' });
    expect(second.last).toEqual({ utm_source: 'newsletter', utm_campaign: 'followup' });
    expect(second.last.utm_medium).toBeUndefined();
    expect(readCheckoutAttribution(storages)).toEqual(second.last);

    const storedLast = JSON.parse(local.getItem(LAST_TOUCH_STORAGE_KEY));
    const storedFirst = JSON.parse(local.getItem(FIRST_TOUCH_STORAGE_KEY));
    const sessionLast = JSON.parse(session.getItem(LAST_TOUCH_STORAGE_KEY));
    expect(storedFirst.utm_source).toBe('linkedin');
    expect(storedLast).toMatchObject({ utm_source: 'newsletter', utm_campaign: 'followup' });
    expect(sessionLast).toMatchObject({ utm_source: 'newsletter', utm_campaign: 'followup' });
    expect(storedFirst.capturedAt).toEqual(expect.any(String));
    expect(campaignParamsForCheckout(storedFirst).capturedAt).toBeUndefined();
  });

  it('leaves stored attribution unchanged when the landing URL has no campaign parameters', () => {
    captureLandingAttribution('?utm_source=linkedin&utm_medium=cpc', storages);
    const quiet = captureLandingAttribution('?filename=PX001.pdf', storages);

    expect(quiet.captured).toBe(false);
    expect(quiet.first).toEqual({ utm_source: 'linkedin', utm_medium: 'cpc' });
    expect(readCheckoutAttribution(storages)).toEqual({ utm_source: 'linkedin', utm_medium: 'cpc' });
  });

  it('sanitizes values to the character set Stripe keeps', () => {
    const record = attributionFromSearch('?utm_source=linked in!&utm_campaign=pro/launch&li_fat_id=fat 123');
    expect(record).toEqual({
      utm_source: 'linkedin',
      utm_campaign: 'prolaunch',
      li_fat_id: 'fat123',
    });
  });

  it('falls back to first touch when last touch is missing', () => {
    captureLandingAttribution('?utm_source=linkedin&utm_campaign=launch', storages);
    session.removeItem(LAST_TOUCH_STORAGE_KEY);
    local.removeItem(LAST_TOUCH_STORAGE_KEY);

    expect(readCheckoutAttribution(storages)).toEqual({
      utm_source: 'linkedin',
      utm_campaign: 'launch',
    });
  });

  it('persists through the browser localStorage and sessionStorage', () => {
    captureLandingAttribution('?utm_source=linkedin&utm_medium=paid&li_fat_id=browserFat');

    expect(JSON.parse(localStorage.getItem(FIRST_TOUCH_STORAGE_KEY)).utm_source).toBe('linkedin');
    expect(JSON.parse(sessionStorage.getItem(LAST_TOUCH_STORAGE_KEY)).li_fat_id).toBe('browserFat');
    expect(readCheckoutAttribution()).toMatchObject({
      utm_source: 'linkedin',
      utm_medium: 'paid',
      li_fat_id: 'browserFat',
    });
  });
});
