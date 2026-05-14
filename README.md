# Random Words

A static random English word and phrase set generator backed by a generated SQLite artifact.

The app supports local criteria filtering, optional Datamuse-powered semantic themes, saved set libraries, diagnostics, import/export, shareable criteria links, reproducible seed mode, and selectable UI themes.

## Features

- Local word filtering by length, part of speech, dialect, text pattern, syllable estimate, duplicate behavior, and exclusion rules.
- Semantic generation with free-entry themes, curated presets, Datamuse expansion, phrase gating, semantic modes, and fallback controls.
- Generated set actions for copy, save, regenerate, export, and share-link creation.
- Saved sets, collections, generation history, and library import/export stored locally in the browser.
- Diagnostics for generated output, including POS basis, quality scores, semantic provenance, warnings, row filters, and diagnostics export.
- UI themes including system, light, dark, high contrast, ink, forest, ocean, sunrise, solar light, and solar dark.
- Static GitHub Pages deployment with browser-side SQLite through `sql.js`.

## Documentation

- [User manual](docs/user-manual.md)
- [Architecture and data flows](docs/architecture.md)
- [Data quality review](docs/data-quality-review.md)
- [Generated data quality report](docs/data-quality-report.md)

## Development

```bash
nvm use
npm install
npm run dev
```

The dev server preprocesses the pinned SCOWL/ESDB wordlists, writes local generated assets under `public/`, and serves the Vite app at `http://localhost:5173/`.

## Verification

```bash
npm run build
npm run audit:data
npm run report:data
npm run test:unit
CI=true npm run test:smoke
npm run test:smoke:preview
```

The build step writes both `public/data/words.sqlite` and `public/data/words.sqlite.gz`. The deployed app prefers the compressed artifact and falls back to the raw SQLite file when needed.
CI runs smoke tests against `vite preview` after building, so the deployed static artifact is exercised before upload.

## Deployment

The included GitHub Actions workflow builds the static app and deploys `dist/` to GitHub Pages. In repository settings, set Pages source to **GitHub Actions**.

The Vite base path is derived from `GITHUB_REPOSITORY` during Actions builds, so the same code works locally at `/` and on Pages under `/<repo-name>/`.

## Data

- Primary source: SCOWL/ESDB `2026.02.25`
- Source ZIPs are verified with pinned SHA-256 checksums during preprocessing.
- Runtime semantic expansion: Datamuse API, cached in browser local storage
- SQLite runtime: `sql.js`
- Generated artifacts: `words.sqlite`, `words.sqlite.gz`, `build-meta.json`, and `sql-wasm.wasm`
- Saved app data: browser local storage only
