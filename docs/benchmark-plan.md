# Exhibit rename benchmark plan

This plan measures the **exhibit rename** path: ingest, preview, and one prepared ZIP. It does not record results. Until a run is written down, the Limits and sizes page shows **Benchmarking in progress** for timings, maximum megabytes, and maximum pages.

Message-exhibit export timings in `docs/benchmarks/` are a different pipeline. Do not copy them into the rename limits table.

## Packs

Published packs are fictional SAMPLE PDFs for `SMITH v. ACME CORP., No. 26-CV-01001 (N.D. Ill.)`. Generate them with:

```bash
npm run test-packs
```

That writes `public/test-packs/starter.zip`, `standard.zip`, `large.zip`, and `index.json`. A production build writes the same files under `dist/test-packs/`. The app serves them at `/test-packs/<id>.zip`.

| Pack | Role |
| --- | --- |
| Starter | 5 files, 1–5 pages. Fits the Free batch cap. Use this on iPhone. |
| Standard | 15 files, mixed lengths, one 50-page file. Over the Free cap. |
| Large | 25 files, including one 100–200 page file. Over the Free cap. |

Optional packs are not published and are not part of `npm run build`:

```bash
node scripts/generate-test-packs.mjs --packs stress --out /tmp/exhibitkit-stress
node scripts/generate-test-packs.mjs --packs ramp --out /tmp/exhibitkit-ramp
```

`stress` is a heavier unpublished config. `ramp` is one PDF per step: 1, 5, 10, 25, 50, 100, and 200 pages.

## Devices

Run the same steps on:

1. Desktop Chrome (current stable), with the folder picker available.
2. iPhone Safari. Folder rename is not available. Use Select PDF Files, then the one ZIP named `exhibit_batch_prepared.zip`.

Use a Case Pass or Pro seat for Standard, Large, Stress, and any ramp file set over 5 PDFs. Free stops at 5 files per batch. Starter matches that cap. ZIP export itself requires Case Pass or Pro even for Starter, because the sample files are real PDFs.

## What to record

For each pack, and for each ramp file on its own:

- File count, total pages, and zip bytes from `manifest.json` or `index.json` (already known at generation; copy them, do not estimate).
- Time from choosing the files to the preview grid showing every row.
- Time from clicking the prepare/rename action to the ZIP download starting.
- Whether the tab stayed responsive, and any browser error text.
- On iPhone: whether the unzip-and-pick steps completed, and whether iOS refused the selection.

Leave the cell blank if a step was not run. Do not fill a cell with a guess.

Suggested table:

| Run | Device | Input | Ingest | ZIP | Notes |
| --- | --- | --- | --- | --- | --- |
|  | Desktop Chrome | Starter |  |  |  |
|  | Desktop Chrome | Standard |  |  |  |
|  | Desktop Chrome | Large |  |  |  |
|  | iPhone Safari | Starter |  |  |  |
|  | iPhone Safari | Standard |  |  |  |
|  | iPhone Safari | Large |  |  |  |
|  | Desktop Chrome | Ramp 1 page |  |  |  |
|  | Desktop Chrome | Ramp 5 pages |  |  |  |
|  | Desktop Chrome | Ramp 10 pages |  |  |  |
|  | Desktop Chrome | Ramp 25 pages |  |  |  |
|  | Desktop Chrome | Ramp 50 pages |  |  |  |
|  | Desktop Chrome | Ramp 100 pages |  |  |  |
|  | Desktop Chrome | Ramp 200 pages |  |  |  |
|  | iPhone Safari | Ramp, repeat the steps that the phone can select |  |  |  |

## Steps

1. Generate the pack. On iPhone, download it from the drop zone, save to Files or iCloud Drive, and unzip.
2. Open the app. Confirm the plan badge (Free, Case Pass, or Pro).
3. Desktop Chrome, in-place path: Select Local Folder on a copy of the unzipped PDFs. Record ingest time. Confirm a backup exists, then rename. Record prepare time. Confirm the proposed names landed on disk.
4. ZIP path (required on iPhone, also run once on desktop): Select PDF Files and choose every PDF in the pack. Record ingest time. Run the prepare action. Record time until `exhibit_batch_prepared.zip` starts downloading. Open the ZIP and confirm each input PDF is present under its proposed name.
5. For the ramp, ingest **one file at a time**, in page order, in a fresh batch. Stop at the first file that fails and record the error. Do not average it with a successful step.
6. Add the completed table to `docs/benchmarks/` as a new note. Only then replace **Benchmarking in progress** on the Limits and sizes page with those measured cells.

## Out of scope

- No maximum megabyte or page limit is coded on the rename path. A failed run is a data point, not a new limit, until someone changes the code.
- Do not publish the Stress or ramp zips in the app download list.
