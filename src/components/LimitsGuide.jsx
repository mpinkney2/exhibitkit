import { useEffect, useState } from 'react';
import {
  BENCHMARK_PLACEHOLDER,
  BATES_MODE_GUIDE,
  CODED_FILE_SIZE_LIMIT,
  CODED_PAGE_LIMIT,
  DEFAULT_BATES_MODE,
  FILENAME_PATTERN_GUIDE,
  FREE_MAX_FILES_PER_BATCH,
  PREPARED_BATCH_ZIP_NAME,
  PUBLISHED_PACK_STATS,
} from '../config/limitsFacts';
import { fetchTestPackIndex, formatByteSize } from '../utils/testPackClient';
import './LimitsGuide.css';

const BENCHMARK_ROWS = [
  'Starter pack',
  'Standard pack',
  'Large pack',
  'Single-file ramp',
  'Largest file size measured',
  'Largest page count measured',
];

export default function LimitsGuide({ onBack }) {
  const [packIndex, setPackIndex] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchTestPackIndex()
      .then((index) => {
        if (!cancelled) setPackIndex(index);
      })
      .catch(() => {
        if (!cancelled) setPackIndex(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const measuredById = new Map((packIndex?.packs || []).map((pack) => [pack.id, pack]));

  return (
    <main className="limits-guide">
      <header className="limits-guide-header">
        <button type="button" className="limits-back" onClick={onBack}>Back</button>
        <div>
          <p className="limits-kicker">ExhibitKit</p>
          <h1>Limits and sizes</h1>
        </div>
      </header>

      <p className="limits-lead">
        Figures on this page come from the rename code. File-size and timing measurements are still open, so those cells stay marked {BENCHMARK_PLACEHOLDER}.
      </p>

      <section>
        <h2>Batch size</h2>
        <table>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Files per batch</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Free</td>
              <td>{FREE_MAX_FILES_PER_BATCH}</td>
            </tr>
            <tr>
              <td>Case Pass, Pro, or an active Firm record</td>
              <td>No file-count cap</td>
            </tr>
          </tbody>
        </table>
        <p className="limits-note">
          The free cap is per batch, not a one-time allowance.
          {CODED_FILE_SIZE_LIMIT == null && CODED_PAGE_LIMIT == null
            ? ' The rename path does not code a maximum PDF size or a maximum page count.'
            : ` Coded size limit: ${CODED_FILE_SIZE_LIMIT ?? 'none'}. Coded page limit: ${CODED_PAGE_LIMIT ?? 'none'}.`}
        </p>
      </section>

      <section>
        <h2>What each batch can do</h2>
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Free</th>
              <th>Case Pass or Pro</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Parse, preview, and edit names</td>
              <td>Yes, up to {FREE_MAX_FILES_PER_BATCH} files</td>
              <td>Yes, no file-count cap</td>
            </tr>
            <tr>
              <td>CSV export</td>
              <td>Yes</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>In-place folder rename</td>
              <td>No</td>
              <td>Yes, in a Chromium browser</td>
            </tr>
            <tr>
              <td>One prepared ZIP</td>
              <td>No</td>
              <td>Yes. The file is named {PREPARED_BATCH_ZIP_NAME}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Browsers</h2>
        <table>
          <thead>
            <tr>
              <th>Browser</th>
              <th>How files are prepared</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Chromium (Chrome, Edge), when folder access is available</td>
              <td>Select Local Folder renames PDFs in that folder. The control is shown only when the browser exposes showDirectoryPicker.</td>
            </tr>
            <tr>
              <td>Other browsers, including iPhone Safari</td>
              <td>Select PDF Files, then download one ZIP named {PREPARED_BATCH_ZIP_NAME}. Folder rename is not offered.</td>
            </tr>
          </tbody>
        </table>
        <p className="limits-note">
          On iPhone: download a test pack, save it to Files or iCloud Drive, unzip it, then tap Select PDF Files.
        </p>
      </section>

      <section>
        <h2>Recognized file names</h2>
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Example</th>
              <th>What the code does</th>
            </tr>
          </thead>
          <tbody>
            {FILENAME_PATTERN_GUIDE.map((pattern) => (
              <tr key={pattern.id}>
                <td>{pattern.label}</td>
                <td><code>{pattern.examples.join(', ')}</code></td>
                <td>{pattern.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Bates-style names</h2>
        <p>
          When a Bates-style file is in the batch, Review shows a Bates badge and a saved choice. The default is {DEFAULT_BATES_MODE === 'sequential' ? 'sequential exhibit numbers' : 'the Bates number as the exhibit ID'}. Sequential keeps the prefix and short number your preset already uses, including OnCue, TrialDirector, and Patent DOD, and puts the Bates number in the description. Using the Bates number as the exhibit ID replaces that prefix and number, so it is opt-in. An edit you type for one file overrides the choice for that file.
        </p>
        <ul>
          {BATES_MODE_GUIDE.map((mode) => (
            <li key={mode.id}>
              {mode.label}
              {mode.isDefault ? ' (default)' : ''}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Test packs</h2>
        <p>
          Packs are fictional PDFs for {packIndex?.caseCaption || 'SMITH v. ACME CORP., No. 26-CV-01001 (N.D. Ill.)'}. They are marked SAMPLE and are not a real case. Zip size is the built file. Page counts are the pages the generator writes.
        </p>
        <table>
          <thead>
            <tr>
              <th>Pack</th>
              <th>Files</th>
              <th>Pages</th>
              <th>Free cap</th>
              <th>Zip size</th>
            </tr>
          </thead>
          <tbody>
            {PUBLISHED_PACK_STATS.map((pack) => {
              const measured = measuredById.get(pack.id);
              return (
                <tr key={pack.id}>
                  <td>{pack.label}</td>
                  <td>{pack.fileCount}</td>
                  <td>{pack.totalPages} ({pack.minPages}–{pack.maxPages} per file)</td>
                  <td>{pack.fitsFreeCap ? `Fits ${FREE_MAX_FILES_PER_BATCH} files` : `Over the ${FREE_MAX_FILES_PER_BATCH}-file Free cap`}</td>
                  <td>{measured ? formatByteSize(measured.zipBytes) : 'Available after the pack is built'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Performance</h2>
        <table>
          <thead>
            <tr>
              <th>Measurement</th>
              <th>Desktop Chrome</th>
              <th>iPhone Safari</th>
            </tr>
          </thead>
          <tbody>
            {BENCHMARK_ROWS.map((row) => (
              <tr key={row}>
                <td>{row}</td>
                <td>{BENCHMARK_PLACEHOLDER}</td>
                <td>{BENCHMARK_PLACEHOLDER}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="limits-note">
          The measurement plan is in docs/benchmark-plan.md. This table will stay on {BENCHMARK_PLACEHOLDER} until those runs are recorded.
        </p>
      </section>
    </main>
  );
}
