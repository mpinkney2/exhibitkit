import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LINKEDIN_COLLECT_ORIGIN, LINKEDIN_SCRIPT_ORIGIN } from '../src/utils/linkedinInsight.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function directiveSources(policy, name) {
  const part = policy.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name} `));
  expect(part, name).toBeTruthy();
  return part.slice(name.length).trim().split(/\s+/).filter(Boolean);
}

describe('LinkedIn Content-Security-Policy', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  const meta = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)[1];
  const header = vercel.headers[0].headers.find((item) => item.key === 'Content-Security-Policy').value;

  it('allows the Insight Tag script host and the collect host only', () => {
    for (const policy of [meta, header]) {
      expect(directiveSources(policy, 'script-src')).toContain(LINKEDIN_SCRIPT_ORIGIN);
      expect(directiveSources(policy, 'img-src')).toContain(LINKEDIN_COLLECT_ORIGIN);
      expect(directiveSources(policy, 'connect-src')).toContain(LINKEDIN_COLLECT_ORIGIN);
      expect(policy).not.toContain('*');
      expect(policy).not.toContain('unsafe-eval');
      expect(policy).not.toContain('px4.ads.linkedin.com');
      expect(policy).not.toContain('dc.ads.linkedin.com');
      for (const part of policy.split(';')) {
        const name = part.trim().split(/\s+/)[0];
        if (['script-src', 'img-src', 'connect-src'].includes(name)) continue;
        expect(part).not.toContain('licdn.com');
        expect(part).not.toContain('linkedin.com');
      }
    }
  });

  it('keeps the previous sources and adds LinkedIn only where the tag connects', () => {
    expect(directiveSources(meta, 'script-src')).toEqual([
      "'self'",
      "'sha256-d6mF7ouSb0pLiKHL9uOg+3eHTuFF9+Q25iHI2/sbtmU='",
      LINKEDIN_SCRIPT_ORIGIN,
    ]);
    expect(directiveSources(meta, 'img-src')).toEqual([
      "'self'",
      'data:',
      'blob:',
      LINKEDIN_COLLECT_ORIGIN,
    ]);
    expect(directiveSources(meta, 'connect-src')).toEqual([
      "'self'",
      'ws:',
      'wss:',
      LINKEDIN_COLLECT_ORIGIN,
    ]);
    expect(directiveSources(meta, 'frame-src')).toEqual([
      'https://js.stripe.com',
      'https://hooks.stripe.com',
    ]);
    expect(directiveSources(header, 'script-src')).toEqual([
      "'self'",
      "'sha256-d6mF7ouSb0pLiKHL9uOg+3eHTuFF9+Q25iHI2/sbtmU='",
      LINKEDIN_SCRIPT_ORIGIN,
    ]);
    expect(directiveSources(header, 'img-src')).toEqual(["'self'", 'data:', LINKEDIN_COLLECT_ORIGIN]);
    expect(directiveSources(header, 'connect-src')).toEqual(["'self'", LINKEDIN_COLLECT_ORIGIN]);
    expect(header).toContain("form-action 'self'");
    expect(header).toContain("frame-ancestors 'none'");
  });
});
