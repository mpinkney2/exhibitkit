/**
 * Deterministic fictional exhibit PDFs for beta testing.
 *
 * Published packs (starter, standard, large) are written at dev/build time.
 * They are not committed. Stress and the single-file ramp are opt-in:
 *   node scripts/generate-test-packs.mjs --packs stress
 *   node scripts/generate-test-packs.mjs --packs ramp
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import JSZip from 'jszip';
import {
  PDFDocument,
  PDFHexString,
  PDFRawStream,
  StandardFonts,
  drawObject,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  scale,
  translate,
} from 'pdf-lib';
import {
  ALL_PACKS,
  BATES_STAMP_PREFIX,
  PUBLISHED_PACKS,
  SAMPLE_BANNER,
  SAMPLE_CASE_CAPTION,
  formatStampRange,
  getPack,
  packStats,
} from '../src/config/testPacks.js';
import { filenamePatternKind, parseFilename } from '../src/utils/renamer.js';

const FIXED_DATE = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));
const ZIP_DATE = new Date(2026, 0, 15, 12, 0, 0);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const FILLER = [
  'This page is fictional filler for an ExhibitKit beta test.',
  'It is not a court filing, not a business record, and not evidence.',
  'No real person, company account, or medical fact is described here.',
  'The footer stamp counts pages across this sample pack only.',
  'The file name is a naming sample and can differ from the footer stamp.',
];

function rasterDimensions(targetBytes) {
  const pixels = Math.max(16, Math.floor(targetBytes / 3));
  const width = Math.max(16, Math.round(Math.sqrt(pixels * (4 / 3))));
  let height = Math.max(12, Math.ceil(pixels / width));
  while (width * height * 3 > targetBytes * 1.08 && height > 12) height -= 1;
  return { width, height };
}

function fillRaster(width, height, seed) {
  const length = width * height * 3;
  const bytes = Buffer.allocUnsafe(length);
  let state = seed >>> 0;
  for (let index = 0; index < length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    bytes[index] = state >>> 24;
  }
  const band = Math.min(height, 6);
  for (let y = 0; y < band; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      bytes[offset] = 36;
      bytes[offset + 1] = 78;
      bytes[offset + 2] = 138;
    }
  }
  return bytes;
}

function hexId(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 32).toUpperCase();
}

async function renderPdf({ pack, file, fileIndex, stampStart }) {
  const pdfDoc = await PDFDocument.create({ updateMetadata: false });
  pdfDoc.setTitle(file.name);
  pdfDoc.setSubject(`${SAMPLE_BANNER}. ${SAMPLE_CASE_CAPTION}`);
  pdfDoc.setCreator('ExhibitKit sample generator');
  pdfDoc.setProducer('ExhibitKit sample generator');
  pdfDoc.setKeywords(['SAMPLE', 'not a real case']);
  pdfDoc.setCreationDate(FIXED_DATE);
  pdfDoc.setModificationDate(FIXED_DATE);
  pdfDoc.context.trailerInfo.ID = pdfDoc.context.obj([
    PDFHexString.of(hexId(`${pack.id}:${file.name}:a`)),
    PDFHexString.of(hexId(`${pack.id}:${file.name}:b`)),
  ]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width: pixelWidth, height: pixelHeight } = rasterDimensions(pack.bytesPerPage);
  const stampEnd = stampStart + file.pages - 1;

  for (let pageIndex = 0; pageIndex < file.pages; pageIndex += 1) {
    const page = pdfDoc.addPage([612, 792]);
    const stamp = formatStampRange(stampStart + pageIndex, stampStart + pageIndex);
    const seed = (pack.id.length * 10007 + fileIndex * 100003 + (pageIndex + 1) * 97) >>> 0;
    const raw = fillRaster(pixelWidth, pixelHeight, seed);
    const compressed = deflateSync(raw, { level: 0 });
    const imageDict = pdfDoc.context.obj({
      Type: 'XObject',
      Subtype: 'Image',
      Width: pixelWidth,
      Height: pixelHeight,
      ColorSpace: 'DeviceRGB',
      BitsPerComponent: 8,
      Filter: 'FlateDecode',
    });
    const imageRef = pdfDoc.context.register(PDFRawStream.of(imageDict, compressed));
    const imageKey = page.node.newXObject('Raster', imageRef);

    page.drawRectangle({
      x: 0,
      y: 752,
      width: 612,
      height: 40,
      color: rgb(0.12, 0.24, 0.42),
    });
    page.drawText(SAMPLE_BANNER, {
      x: 36,
      y: 768,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(SAMPLE_CASE_CAPTION, {
      x: 36,
      y: 720,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.14, 0.22),
    });
    page.drawText(file.name, {
      x: 36,
      y: 700,
      size: 9,
      font,
      color: rgb(0.2, 0.24, 0.3),
    });
    page.drawText(`Pack page stamp ${stamp}. File page ${pageIndex + 1} of ${file.pages}.`, {
      x: 36,
      y: 678,
      size: 9,
      font,
      color: rgb(0.25, 0.28, 0.33),
    });

    FILLER.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: 36,
        y: 650 - lineIndex * 14,
        size: 9,
        font,
        color: rgb(0.15, 0.17, 0.2),
      });
    });

    page.pushOperators(
      pushGraphicsState(),
      translate(48, 150),
      scale(516, 360),
      drawObject(imageKey),
      popGraphicsState(),
    );

    page.drawLine({
      start: { x: 36, y: 64 },
      end: { x: 576, y: 64 },
      thickness: 0.6,
      color: rgb(0.7, 0.74, 0.78),
    });
    page.drawText(`Page ${pageIndex + 1} of ${file.pages}`, {
      x: 36,
      y: 40,
      size: 9,
      font,
      color: rgb(0.25, 0.28, 0.33),
    });
    const stampWidth = fontBold.widthOfTextAtSize(stamp, 11);
    page.drawText(stamp, {
      x: 576 - stampWidth,
      y: 38,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.14, 0.22),
    });
  }

  const bytes = await pdfDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    objectsPerTick: 100,
  });
  return { bytes, stampStart, stampEnd };
}

function expectedParse(filename) {
  const parsed = parseFilename(filename);
  return {
    patternKind: filenamePatternKind(parsed),
    prefix: parsed.prefix || '',
    number: parsed.number || '',
    description: parsed.description || '',
    year: parsed.year || null,
    bates: parsed.bates
      ? {
          prefix: parsed.bates.prefix,
          start: parsed.bates.start,
          end: parsed.bates.end,
          label: parsed.bates.label,
        }
      : null,
  };
}

function manifestFor(pack, rendered) {
  const stats = packStats(pack);
  return {
    id: pack.id,
    label: pack.label,
    published: pack.published,
    sample: true,
    notARealCase: true,
    caseCaption: SAMPLE_CASE_CAPTION,
    banner: SAMPLE_BANNER,
    batesStampPrefix: BATES_STAMP_PREFIX,
    fileCount: stats.fileCount,
    totalPages: stats.totalPages,
    fitsFreeCap: stats.fitsFreeCap,
    files: rendered.map((entry) => ({
      file: entry.file.name,
      pages: entry.file.pages,
      bytes: entry.bytes.length,
      batesRange: formatStampRange(entry.stampStart, entry.stampEnd),
      expectedParse: expectedParse(entry.file.name),
    })),
  };
}

function readmeFor(manifest) {
  const lines = [
    `ExhibitKit ${manifest.label} test pack`,
    SAMPLE_BANNER,
    manifest.caseCaption,
    '',
    'These PDFs are fictional. They contain no real client, medical, financial, or case information.',
    'The footer Bates stamp (ACME000001 style) runs across the pack in page order.',
    'A Bates-style file name is a separate naming sample and may not equal the footer stamp.',
    '',
    'file | pages | bytes | bates range | expected parse',
  ];
  manifest.files.forEach((file) => {
    const parseLabel = file.expectedParse.bates
      ? `${file.expectedParse.patternKind} ${file.expectedParse.bates.label}`
      : file.expectedParse.patternKind;
    lines.push(`${file.file} | ${file.pages} | ${file.bytes} | ${file.batesRange} | ${parseLabel}`);
  });
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function zipPack(manifest, rendered) {
  const zip = new JSZip();
  const options = {
    date: ZIP_DATE,
    compression: 'STORE',
    unixPermissions: 0o644,
  };
  zip.file('README.txt', readmeFor(manifest), options);
  zip.file('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`, options);
  rendered.forEach((entry) => {
    zip.file(entry.file.name, entry.bytes, options);
  });
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'STORE',
    platform: 'UNIX',
  });
}

/**
 * @param {object} options
 * @param {string} options.outDir
 * @param {string[]} [options.packIds]
 * @param {boolean} [options.includeStress]
 * @param {boolean} [options.force]
 */
export async function generatePacks({
  outDir,
  packIds,
  includeStress = false,
  force = false,
} = {}) {
  const ids = packIds?.length
    ? packIds
    : PUBLISHED_PACKS.map((pack) => pack.id).concat(includeStress ? ['stress'] : []);
  const packs = ids.map((id) => {
    const pack = getPack(id);
    if (!pack) throw new Error(`Unknown test pack "${id}".`);
    return pack;
  });

  await mkdir(outDir, { recursive: true });
  const stampPath = resolve(outDir, '.stamp');
  const stamp = await sourceStamp(ids);
  if (!force && await stampMatches(stampPath, stamp, packs, outDir)) {
    const index = JSON.parse(await readFile(resolve(outDir, 'index.json'), 'utf8'));
    return { outDir, index, skipped: true };
  }

  const started = Date.now();
  const summaries = [];
  for (const pack of packs) {
    const packStarted = Date.now();
    let stampCursor = 1;
    const rendered = [];
    for (let fileIndex = 0; fileIndex < pack.files.length; fileIndex += 1) {
      const file = pack.files[fileIndex];
      const pdf = await renderPdf({
        pack,
        file,
        fileIndex,
        stampStart: stampCursor,
      });
      rendered.push({ file, ...pdf });
      stampCursor = pdf.stampEnd + 1;
    }
    const manifest = manifestFor(pack, rendered);
    manifest.totalBytes = rendered.reduce((sum, entry) => sum + entry.bytes.length, 0);
    const zipBytes = await zipPack(manifest, rendered);
    const zipName = `${pack.id}.zip`;
    await writeFile(resolve(outDir, zipName), zipBytes);
    summaries.push({
      id: pack.id,
      label: pack.label,
      published: pack.published,
      fileName: zipName,
      fileCount: manifest.fileCount,
      totalPages: manifest.totalPages,
      totalBytes: manifest.totalBytes,
      zipBytes: zipBytes.length,
      fitsFreeCap: manifest.fitsFreeCap,
      seconds: Number(((Date.now() - packStarted) / 1000).toFixed(2)),
    });
    console.log(
      `test pack ${pack.id}: ${manifest.fileCount} files, ${manifest.totalPages} pages, `
      + `pdf ${(manifest.totalBytes / 1e6).toFixed(2)} MB, zip ${(zipBytes.length / 1e6).toFixed(2)} MB, `
      + `${summaries.at(-1).seconds}s`,
    );
  }

  const index = {
    sample: true,
    notARealCase: true,
    caseCaption: SAMPLE_CASE_CAPTION,
    packs: summaries.map(({ seconds, ...summary }) => summary),
  };
  await writeFile(resolve(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  await writeFile(stampPath, `${stamp}\n`);
  console.log(`test packs written to ${outDir} in ${((Date.now() - started) / 1000).toFixed(2)}s`);
  return { outDir, index, skipped: false, summaries };
}

async function sourceStamp(packIds) {
  const hash = createHash('sha256');
  hash.update(packIds.join(','));
  const files = [
    fileURLToPath(import.meta.url),
    resolve(ROOT, 'src/config/testPacks.js'),
    resolve(ROOT, 'src/utils/renamer.js'),
  ];
  for (const file of files) {
    hash.update(await readFile(file));
  }
  return hash.digest('hex');
}

async function stampMatches(stampPath, stamp, packs, outDir) {
  try {
    const current = (await readFile(stampPath, 'utf8')).trim();
    if (current !== stamp) return false;
    await access(resolve(outDir, 'index.json'));
    for (const pack of packs) {
      await access(resolve(outDir, `${pack.id}.zip`));
    }
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const options = { packIds: null, includeStress: false, outDir: resolve(ROOT, 'public/test-packs'), force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--include-stress') options.includeStress = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--out') options.outDir = resolve(argv[++index] || '');
    else if (arg === '--packs') {
      options.packIds = String(argv[++index] || '').split(',').map((id) => id.trim()).filter(Boolean);
    } else if (arg === '--help') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument "${arg}".`);
    }
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: node scripts/generate-test-packs.mjs [--out dir] [--packs starter,standard,large] [--include-stress] [--force]');
    console.log(`Packs: ${ALL_PACKS.map((pack) => `${pack.id}${pack.published ? '' : ' (not published)'}`).join(', ')}`);
    return;
  }
  await generatePacks(options);
}

const invokedDirectly = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
