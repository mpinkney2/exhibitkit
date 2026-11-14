/**
 * @vitest-environment node
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FREE_MAX_FILES_PER_BATCH } from '../src/config/pricing.js';
import {
  OPTIONAL_PACKS,
  PUBLISHED_PACKS,
  getPack,
  packStats,
} from '../src/config/testPacks.js';
import { filenamePatternKind, parseFilename } from '../src/utils/renamer.js';
import { generatePacks } from './generate-test-packs.mjs';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('test pack plans', () => {
  it('publishes starter, standard, and large only', () => {
    expect(PUBLISHED_PACKS.map((pack) => pack.id)).toEqual(['starter', 'standard', 'large']);
    expect(OPTIONAL_PACKS.map((pack) => pack.id)).toEqual(['stress', 'ramp']);
    expect(OPTIONAL_PACKS.every((pack) => pack.published === false)).toBe(true);
  });

  it('shapes each published pack and keeps names unique', () => {
    const starter = packStats(getPack('starter'));
    expect(starter.fileCount).toBe(5);
    expect(starter.fileCount).toBe(FREE_MAX_FILES_PER_BATCH);
    expect(starter.fitsFreeCap).toBe(true);
    expect(starter.minPages).toBeGreaterThanOrEqual(1);
    expect(starter.maxPages).toBeLessThanOrEqual(5);

    const standard = getPack('standard');
    const standardStats = packStats(standard);
    expect(standardStats.fileCount).toBe(15);
    expect(standardStats.fitsFreeCap).toBe(false);
    const standardPages = standard.files.map((file) => file.pages);
    expect(standardPages.filter((pages) => pages === 50)).toEqual([50]);
    expect(standardPages.filter((pages) => pages !== 50).every((pages) => pages >= 1 && pages <= 25)).toBe(true);

    const large = getPack('large');
    const largeStats = packStats(large);
    expect(largeStats.fileCount).toBe(25);
    const heavy = large.files.filter((file) => file.pages >= 100 && file.pages <= 200);
    expect(heavy).toHaveLength(1);
    expect(large.files.filter((file) => file.pages > 200)).toHaveLength(0);

    for (const pack of PUBLISHED_PACKS) {
      const names = pack.files.map((file) => file.name);
      expect(new Set(names).size).toBe(names.length);
      expect(pack.files.some((file) => filenamePatternKind(parseFilename(file.name)) === 'bates'
        || filenamePatternKind(parseFilename(file.name)) === 'bates-range')).toBe(true);
      expect(pack.files.some((file) => filenamePatternKind(parseFilename(file.name)) === 'unstructured')).toBe(true);
    }
    expect(getPack('stress').files.some((file) => file.pages >= 400)).toBe(true);
    expect(getPack('ramp').files.map((file) => file.pages)).toEqual([1, 5, 10, 25, 50, 100, 200]);
  });
});

describe('starter pack generator', () => {
  it('writes the same bytes on a second run', async () => {
    const root = await mkdtemp(join(tmpdir(), 'exhibitkit-packs-'));
    try {
      const firstDir = join(root, 'a');
      const secondDir = join(root, 'b');
      const first = await generatePacks({ outDir: firstDir, packIds: ['starter'], force: true });
      const second = await generatePacks({ outDir: secondDir, packIds: ['starter'], force: true });
      const firstZip = await readFile(join(firstDir, 'starter.zip'));
      const secondZip = await readFile(join(secondDir, 'starter.zip'));
      expect(sha256(firstZip)).toBe(sha256(secondZip));
      expect(first.index.packs[0].fileCount).toBe(5);
      expect(first.index.packs[0].zipBytes).toBe(second.index.packs[0].zipBytes);
      expect(first.index.packs[0].zipBytes).toBeGreaterThan(0);
      const manifestName = 'manifest.json';
      const { default: JSZip } = await import('jszip');
      const zip = await JSZip.loadAsync(firstZip);
      const manifest = JSON.parse(await zip.file(manifestName).async('string'));
      expect(manifest.notARealCase).toBe(true);
      expect(manifest.files).toHaveLength(5);
      manifest.files.forEach((file) => {
        expect(file.pages).toBeGreaterThanOrEqual(1);
        expect(file.bytes).toBeGreaterThan(0);
        expect(file.batesRange).toMatch(/^ACME\d{6}(?:-ACME\d{6})?$/);
        expect(file.expectedParse.patternKind).toBe(filenamePatternKind(parseFilename(file.file)));
      });
      const readme = await zip.file('README.txt').async('string');
      expect(readme).toMatch(/NOT A REAL CASE/);
      expect(readme).toMatch(/SMITH v\. ACME CORP\./);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 60000);
});
