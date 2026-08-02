import { describe, expect, it } from 'vitest';
import { wouldBlockEvidenceUpload } from './privacyGuard';

describe('evidence upload guard', () => {
  it('allows same-origin requests', () => {
    expect(wouldBlockEvidenceUpload('/assets/index.js')).toBe(false);
  });

  it('blocks cross-origin evidence-looking uploads', () => {
    expect(
      wouldBlockEvidenceUpload('https://evil.example/upload', {
        body: JSON.stringify({ filename: 'messages.txt', sha256: 'abc' }),
      })
    ).toBe(true);
  });

  it('blocks allowlisted payment hosts if evidence fields are present in body', () => {
    expect(
      wouldBlockEvidenceUpload('https://buy.stripe.com/test', {
        body: JSON.stringify({ caseName: 'Doe v. Roe', messages: [] }),
      })
    ).toBe(true);
  });
});
