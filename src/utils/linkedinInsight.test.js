import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LINKEDIN_INSIGHT_SCRIPT,
  installLinkedInInsightTag,
  trackLinkedInConversion,
} from './linkedinInsight.js';

afterEach(() => {
  document.querySelectorAll('script[data-exhibitkit-linkedin="insight"]').forEach((node) => node.remove());
  delete window.lintrk;
  delete window._linkedin_partner_id;
  delete window._linkedin_data_partner_ids;
});

describe('LinkedIn Insight Tag', () => {
  it('loads nothing when the partner id is unset', () => {
    expect(installLinkedInInsightTag({ VITE_LINKEDIN_PARTNER_ID: '' })).toBe(false);
    expect(installLinkedInInsightTag({})).toBe(false);
    expect(installLinkedInInsightTag({ VITE_LINKEDIN_PARTNER_ID: 'not-a-number' })).toBe(false);
    expect(document.querySelector('script[data-exhibitkit-linkedin="insight"]')).toBeNull();
    expect(window.lintrk).toBeUndefined();
  });

  it('loads the Insight Tag script for a numeric partner id', () => {
    expect(installLinkedInInsightTag({ VITE_LINKEDIN_PARTNER_ID: '1234567' })).toBe(true);
    const script = document.querySelector('script[data-exhibitkit-linkedin="insight"]');
    expect(script?.src).toBe(LINKEDIN_INSIGHT_SCRIPT);
    expect(window._linkedin_partner_id).toBe('1234567');
    expect(window._linkedin_data_partner_ids).toEqual(['1234567']);
    expect(typeof window.lintrk).toBe('function');
    expect(installLinkedInInsightTag({ VITE_LINKEDIN_PARTNER_ID: '1234567' })).toBe(true);
    expect(document.querySelectorAll('script[data-exhibitkit-linkedin="insight"]')).toHaveLength(1);
  });

  it('does not fire a conversion when the conversion id is unset', () => {
    installLinkedInInsightTag({ VITE_LINKEDIN_PARTNER_ID: '1234567' });
    const lintrk = vi.fn();
    window.lintrk = lintrk;

    expect(trackLinkedInConversion('free_start', { VITE_LINKEDIN_PARTNER_ID: '1234567' })).toBe(false);
    expect(trackLinkedInConversion('pro_checkout', {
      VITE_LINKEDIN_PARTNER_ID: '1234567',
      VITE_LINKEDIN_CONVERSION_PRO_CHECKOUT: 'abc',
    })).toBe(false);
    expect(lintrk).not.toHaveBeenCalled();
  });

  it('fires only the conversion id', () => {
    const lintrk = vi.fn();
    window.lintrk = lintrk;
    const env = {
      VITE_LINKEDIN_PARTNER_ID: '1234567',
      VITE_LINKEDIN_CONVERSION_PRO_PURCHASE: '7654321',
    };

    expect(trackLinkedInConversion('pro_purchase', env)).toBe(true);
    expect(lintrk).toHaveBeenCalledTimes(1);
    expect(lintrk).toHaveBeenCalledWith('track', { conversion_id: 7654321 });
    expect(JSON.stringify(lintrk.mock.calls)).not.toContain('filename');
  });
});
