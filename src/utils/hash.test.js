import { describe, expect, it } from 'vitest';
import { fingerprintSourceFile, sha256 } from './hash';

describe('source hashing', () => {
  it('produces a stable SHA-256 hex digest', async () => {
    const digest = await sha256('exhibitkit-source');
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(await sha256('exhibitkit-source')).toBe(digest);
    expect(await sha256('exhibitkit-source-changed')).not.toBe(digest);
  });

  it('fingerprints a file with name, size, and hash', async () => {
    const file = new File(['hello messages'], 'thread.txt', { type: 'text/plain' });
    const fp = await fingerprintSourceFile(file);
    expect(fp.originalName).toBe('thread.txt');
    expect(fp.byteSize).toBe(file.size);
    expect(fp.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
