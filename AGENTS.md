# AGENTS.md

## Cursor Cloud specific instructions

ExhibitKIT is a **local-first, client-side-only** React app built with Vite (React 19). There is no
backend, database, or server-side component — all PDF parsing, renaming, and licensing logic runs
entirely in the browser. Standard commands live in `package.json` (`dev`, `build`, `lint`, `preview`).

Non-obvious notes:

- Dependencies are refreshed automatically by the startup update script (`npm install`); you do not
  need to reinstall them manually.
- Dev server: `npm run dev` serves on `http://localhost:5173/` (Vite default). Use `-- --host` to
  expose it on the network if needed.
- `npm run lint` currently reports pre-existing lint errors in the source (unused imports, an effect
  `setState` warning, a useless escape). These are code issues that exist in the repo, not
  environment problems — lint itself works.
- Core functionality depends on browser **File System Access APIs** (`showDirectoryPicker`) for live
  in-place renaming. These require a Chromium-based browser and a user gesture, and are unavailable
  in headless/automated contexts. For testing without a real folder, use **Demo Mode → "Load Sample
  Exhibits (Demo)"**, which loads the mock dataset from `mock_exhibits/` and exercises the parsing,
  sequencing, and preview pipeline without touching the filesystem.
- Optional Stripe checkout link is configured via the `VITE_STRIPE_PAYMENT_LINK` env var (see
  `README.md`). It is not required to run or evaluate the app locally.
- The `python_scripts/` directory contains standalone helper scripts for generating mock files; they
  are not part of the web app runtime.
