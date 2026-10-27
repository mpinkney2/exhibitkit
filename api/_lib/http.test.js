// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { getClientIp, isAllowedBrowserOrigin } from './http.js';

afterEach(() => {
  delete process.env.APP_URL;
  delete process.env.VERCEL_URL;
  delete process.env.VERCEL_BRANCH_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  delete process.env.NODE_ENV;
});

function requestWithOrigin(url, origin, extraHeaders = {}) {
  return new Request(url, {
    method: 'POST',
    headers: {
      origin,
      ...extraHeaders,
    },
  });
}

describe('isAllowedBrowserOrigin', () => {
  it('allows requests with no Origin header', () => {
    const request = new Request('https://exhibitkit.patentpreppers.com/api/founder/unlock', {
      method: 'POST',
    });
    expect(isAllowedBrowserOrigin(request)).toBe(true);
  });

  it('allows the custom domain even when APP_URL points at vercel.app', () => {
    process.env.APP_URL = 'https://exhibitkit-something.vercel.app';
    process.env.NODE_ENV = 'production';
    const request = requestWithOrigin(
      'https://exhibitkit.patentpreppers.com/api/founder/unlock',
      'https://exhibitkit.patentpreppers.com',
      { host: 'exhibitkit.patentpreppers.com', 'x-forwarded-proto': 'https' },
    );
    expect(isAllowedBrowserOrigin(request)).toBe(true);
  });

  it('allows VERCEL_URL deployments', () => {
    process.env.VERCEL_URL = 'exhibitkit-git-main-mpinkney2s-projects.vercel.app';
    process.env.NODE_ENV = 'production';
    const request = requestWithOrigin(
      'https://exhibitkit-git-main-mpinkney2s-projects.vercel.app/api/founder/unlock',
      'https://exhibitkit-git-main-mpinkney2s-projects.vercel.app',
    );
    expect(isAllowedBrowserOrigin(request)).toBe(true);
  });

  it('rejects unrelated origins', () => {
    process.env.APP_URL = 'https://exhibitkit.patentpreppers.com';
    process.env.NODE_ENV = 'production';
    const request = requestWithOrigin(
      'https://exhibitkit.patentpreppers.com/api/founder/unlock',
      'https://evil.example',
    );
    expect(isAllowedBrowserOrigin(request)).toBe(false);
  });

  it('does not hard-fail when APP_URL is malformed', () => {
    process.env.APP_URL = 'not a url';
    process.env.NODE_ENV = 'production';
    const request = requestWithOrigin(
      'https://exhibitkit.patentpreppers.com/api/founder/unlock',
      'https://exhibitkit.patentpreppers.com',
    );
    expect(isAllowedBrowserOrigin(request)).toBe(true);
  });
});

describe('getClientIp', () => {
  it('prefers x-real-ip over a caller-supplied x-forwarded-for list', () => {
    const request = new Request('https://exhibitkit.patentpreppers.com/api/license/activate', {
      headers: {
        'x-real-ip': ' 192.0.2.20 ',
        'x-forwarded-for': '198.51.100.9, 203.0.113.10',
      },
    });
    expect(getClientIp(request)).toBe('192.0.2.20');
  });

  it('uses the last x-forwarded-for hop when x-real-ip is absent', () => {
    const request = new Request('https://exhibitkit.patentpreppers.com/api/license/activate', {
      headers: {
        'x-forwarded-for': '198.51.100.9, 203.0.113.10',
      },
    });
    expect(getClientIp(request)).toBe('203.0.113.10');
  });

  it('keeps a single forwarded address and ignores an empty x-real-ip', () => {
    const request = new Request('https://exhibitkit.patentpreppers.com/api/license/activate', {
      headers: {
        'x-real-ip': '   ',
        'x-forwarded-for': '203.0.113.10',
      },
    });
    expect(getClientIp(request)).toBe('203.0.113.10');
  });

  it('preserves an IPv6 trusted hop and caps long values', () => {
    const ipv6 = new Request('https://exhibitkit.patentpreppers.com/api/license/activate', {
      headers: { 'x-forwarded-for': '198.51.100.9, 2001:db8::1' },
    });
    expect(getClientIp(ipv6)).toBe('2001:db8::1');

    const longIp = `203.0.113.10${'x'.repeat(200)}`;
    const request = new Request('https://exhibitkit.patentpreppers.com/api/license/activate', {
      headers: { 'x-real-ip': longIp },
    });
    expect(getClientIp(request)).toHaveLength(128);
    expect(getClientIp(request)).toBe(longIp.slice(0, 128));
  });

  it('returns unknown when no client address header is present', () => {
    const request = new Request('https://exhibitkit.patentpreppers.com/api/license/activate');
    expect(getClientIp(request)).toBe('unknown');
  });
});
