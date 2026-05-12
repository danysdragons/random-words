# Random Words

A static random English word and phrase set generator backed by a generated SQLite artifact.

## Development

```bash
nvm use
npm install
npm run dev
```

The build step downloads pinned SCOWL/ESDB wordlists and writes `public/data/words.sqlite`.

```bash
npm run build
```

## Deployment

The included GitHub Actions workflow builds the static app and deploys `dist/` to GitHub Pages. In repository settings, set Pages source to **GitHub Actions**.

## Data

- Primary source: SCOWL/ESDB `2026.02.25`
- Runtime semantic expansion: Datamuse API, cached in browser local storage
- SQLite runtime: `sql.js`
