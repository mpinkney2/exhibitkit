/**
 * Large-volume exhibit conversion benchmarks.
 * Run: node scripts/benchmark-exhibits.mjs
 *
 * Generates synthetic message exhibits (including multipage), measures PDF
 * package export time, and writes JSON + SVG charts under docs/benchmarks/.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { webcrypto } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// pdf-lib / exhibitPdf expect Web Crypto in some environments
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { createEmptyProject } = await import(pathToFileURL(join(root, 'src/utils/project.js')).href);
const { exportProjectPackage } = await import(
  pathToFileURL(join(root, 'src/utils/exhibitPdf.js')).href
);
const { CAPACITY } = await import(pathToFileURL(join(root, 'src/utils/capacity.js')).href);

function makeMessages(count, seed = 0) {
  const senders = ['Alex Rivera', 'Jordan Lee', 'Counsel Desk', 'Records Unit'];
  const messages = [];
  for (let i = 0; i < count; i++) {
    const long =
      i % 7 === 0
        ? ' Additional detail about shipping schedules, warehouse locations on Market Street, and confirmation that account documentation was reviewed by counsel before filing.'
        : '';
    messages.push({
      id: `m-${seed}-${i}`,
      seq: i + 1,
      sender: senders[i % senders.length],
      timestamp: `2024-03-${String((i % 28) + 1).padStart(2, '0')} ${String(9 + (i % 8)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
      body: `Message ${i + 1}: discussion of exhibit handoff and source retention.${long}`,
      selected: true,
      redactions: i % 11 === 0 ? [{ phrase: 'Market Street' }] : [],
    });
  }
  return messages;
}

function makeProject({ exhibitCount, messagesPerExhibit, multipageRatio = 0.3 }) {
  const project = createEmptyProject({
    caseName: 'Benchmark Matter',
    court: 'Superior Court',
    caption: 'Civil Action — capacity benchmark',
  });
  const multipageCount = Math.round(exhibitCount * multipageRatio);
  for (let i = 0; i < exhibitCount; i++) {
    const isMulti = i < multipageCount;
    const msgCount = isMulti ? Math.max(messagesPerExhibit, CAPACITY.multipageMessageThreshold + 20) : messagesPerExhibit;
    project.exhibits.push({
      id: `ex-${i}`,
      label: `Exhibit ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? i : ''}`,
      sourceFiles: [
        {
          originalName: `export-${i}.txt`,
          byteSize: msgCount * 80,
          sha256: `${(i + 1).toString(16).padStart(2, '0')}`.repeat(32),
        },
      ],
      messages: makeMessages(msgCount, i),
      format: 'plain_text',
      warnings: [],
    });
  }
  return project;
}

async function timeExport(project, label) {
  const start = performance.now();
  const memBefore = process.memoryUsage().heapUsed;
  const result = await exportProjectPackage(project, {
    pro: true,
    zip: true,
    batchSize: CAPACITY.exportBatchSize,
  });
  const elapsedMs = performance.now() - start;
  const memAfter = process.memoryUsage().heapUsed;
  const totalPages = (result.summaries || []).reduce((n, s) => n + (s.pageCount || 0), 0);
  const totalMessages = project.exhibits.reduce((n, ex) => n + ex.messages.length, 0);
  const zipBytes = result.zip?.bytes?.byteLength || 0;
  return {
    label,
    exhibitCount: project.exhibits.length,
    totalMessages,
    totalPages,
    elapsedMs: Math.round(elapsedMs),
    exhibitsPerMinute: Number(((project.exhibits.length / elapsedMs) * 60000).toFixed(2)),
    messagesPerSecond: Number(((totalMessages / elapsedMs) * 1000).toFixed(2)),
    zipBytes,
    heapDeltaMb: Number(((memAfter - memBefore) / (1024 * 1024)).toFixed(2)),
    mode: result.mode,
  };
}

function svgBarChart(rows, { title, valueKey, unit }) {
  const width = 720;
  const height = 280;
  const pad = { t: 40, r: 24, b: 56, l: 56 };
  const max = Math.max(...rows.map((r) => r[valueKey]), 1);
  const barW = (width - pad.l - pad.r) / rows.length;
  const chartH = height - pad.t - pad.b;

  const bars = rows
    .map((r, i) => {
      const h = (r[valueKey] / max) * chartH;
      const x = pad.l + i * barW + 8;
      const y = pad.t + chartH - h;
      const label = `${r.exhibitCount}×`;
      return `
      <rect x="${x}" y="${y}" width="${barW - 16}" height="${h}" fill="#2563eb" rx="4"/>
      <text x="${x + (barW - 16) / 2}" y="${height - 28}" text-anchor="middle" font-size="11" fill="#64748b">${label}</text>
      <text x="${x + (barW - 16) / 2}" y="${y - 6}" text-anchor="middle" font-size="10" fill="#0f172a">${r[valueKey]}${unit || ''}</text>
    `;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <text x="${pad.l}" y="24" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#0f172a">${title}</text>
  <line x1="${pad.l}" y1="${pad.t + chartH}" x2="${width - pad.r}" y2="${pad.t + chartH}" stroke="#cbd5e1"/>
  ${bars}
  <text x="${width / 2}" y="${height - 8}" text-anchor="middle" font-size="11" fill="#64748b">Exhibits in package (includes multipage conversations)</text>
</svg>`;
}

const scenarios = [
  { exhibitCount: 1, messagesPerExhibit: 25, multipageRatio: 0, label: '1 short' },
  { exhibitCount: 5, messagesPerExhibit: 40, multipageRatio: 0.4, label: '5 mixed' },
  { exhibitCount: 10, messagesPerExhibit: 50, multipageRatio: 0.3, label: '10 mixed' },
  { exhibitCount: 25, messagesPerExhibit: 60, multipageRatio: 0.3, label: '25 mixed' },
  { exhibitCount: 50, messagesPerExhibit: 80, multipageRatio: 0.35, label: '50 multipage-heavy' },
  { exhibitCount: 75, messagesPerExhibit: 100, multipageRatio: 0.4, label: '75 stress' },
];

const outDir = join(root, 'docs/benchmarks');
mkdirSync(outDir, { recursive: true });
mkdirSync(join('/opt/cursor/artifacts/benchmarks'), { recursive: true });

console.log('Running ExhibitKit large-volume benchmarks…');
const results = [];
for (const scenario of scenarios) {
  const project = makeProject(scenario);
  process.stdout.write(`  ${scenario.label} (${scenario.exhibitCount} exhibits)… `);
  const row = await timeExport(project, scenario.label);
  results.push(row);
  console.log(`${row.elapsedMs} ms · ${row.exhibitsPerMinute} exh/min · ${row.totalPages} pages`);
}

const report = {
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    capacityGuidance: CAPACITY,
  },
  results,
  recommendations: {
    comfortableInteractive: `≤ ${CAPACITY.comfortableExhibits} exhibits`,
    recommendedMaxInteractive: `≤ ${CAPACITY.recommendedMaxExhibits} exhibits`,
    notes: [
      'Times are local PDF generation (Pro package with binder + ZIP), not network upload.',
      'Multipage exhibits use ≥40 messages and inflate page counts and binder merge time.',
      'For >75 exhibits, split into batches or export without a single combined binder.',
    ],
  },
};

writeFileSync(join(outDir, 'latest.json'), JSON.stringify(report, null, 2));
writeFileSync(
  join(outDir, 'exhibits-over-time.svg'),
  svgBarChart(results, { title: 'Export time by exhibit volume (ms)', valueKey: 'elapsedMs', unit: 'ms' })
);
writeFileSync(
  join(outDir, 'throughput.svg'),
  svgBarChart(results, {
    title: 'Throughput (exhibits per minute)',
    valueKey: 'exhibitsPerMinute',
    unit: '',
  })
);

writeFileSync(join('/opt/cursor/artifacts/benchmarks/latest.json'), JSON.stringify(report, null, 2));
writeFileSync(
  join('/opt/cursor/artifacts/benchmarks/exhibits-over-time.svg'),
  svgBarChart(results, { title: 'Export time by exhibit volume (ms)', valueKey: 'elapsedMs', unit: 'ms' })
);
writeFileSync(
  join('/opt/cursor/artifacts/benchmarks/throughput.svg'),
  svgBarChart(results, {
    title: 'Throughput (exhibits per minute)',
    valueKey: 'exhibitsPerMinute',
    unit: '',
  })
);

const md = `# ExhibitKit capacity benchmarks

Generated: ${report.generatedAt}

## Results

| Scenario | Exhibits | Messages | Pages | Time (ms) | Exhibits/min | Messages/s | ZIP (bytes) | Heap Δ (MB) |
|----------|---------:|---------:|------:|----------:|-------------:|-----------:|------------:|------------:|
${results
  .map(
    (r) =>
      `| ${r.label} | ${r.exhibitCount} | ${r.totalMessages} | ${r.totalPages} | ${r.elapsedMs} | ${r.exhibitsPerMinute} | ${r.messagesPerSecond} | ${r.zipBytes} | ${r.heapDeltaMb} |`
  )
  .join('\n')}

## Charts

![Export time by volume](./exhibits-over-time.svg)

![Throughput](./throughput.svg)

## Guidance

- Comfortable interactive: **≤ ${CAPACITY.comfortableExhibits} exhibits**
- Recommended max interactive package: **≤ ${CAPACITY.recommendedMaxExhibits} exhibits**
- Multipage threshold: **≥ ${CAPACITY.multipageMessageThreshold} messages**
- Export batch size: **${CAPACITY.exportBatchSize}**

${report.recommendations.notes.map((n) => `- ${n}`).join('\n')}
`;

writeFileSync(join(outDir, 'README.md'), md);
writeFileSync(join('/opt/cursor/artifacts/benchmarks/README.md'), md);
console.log('\\nWrote docs/benchmarks/ and /opt/cursor/artifacts/benchmarks/');
