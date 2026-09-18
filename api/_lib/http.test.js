// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { isAllowedBrowserOrigin } from './http.js';

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
