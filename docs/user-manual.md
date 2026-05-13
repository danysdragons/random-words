# Random Words User Manual

Random Words is a browser-based generator for creating sets of English words and optional phrases. It is designed for writers, game masters, puzzle makers, naming work, brainstorming, worldbuilding, and any workflow where you need controlled randomness rather than a single unfiltered word list.

The app runs as a static site. The main word database is loaded in your browser from a prebuilt SQLite artifact, while optional theme expansion uses Datamuse lookups that are cached locally.

## Quick Start

1. Open the app.
2. Adjust the criteria in the left panel.
3. Optionally enter a theme or choose a preset in the right panel.
4. Click **Generate**.
5. Copy, save, export, or share the generated results.

For most uses, the default settings are a good starting point: common/useful words, no offensive words, no proper nouns, no acronyms or initialisms, no contractions, no hyphenated words, and a balanced quality mode.

## Main Screen

The generator screen has three main areas:

- **Criteria panel:** controls word count, length, parts of speech, dialect, text filters, and exclusion rules.
- **Generated word sets:** shows generated sets, actions, pool size, seed mode, quality mode, and export controls.
- **Theme & Semantics panel:** controls optional theme-based generation using presets or free text.

The top navigation also includes **Saved Sets**, **Collections**, and **About Data**.

## Generating Words

Click **Generate** to create new word sets from the current criteria. By default, each click uses fresh randomness, so repeated clicks produce new results without requiring you to change a seed manually.

Click **Shuffle** to generate again with a fresh random seed. This is useful when you like your criteria but want a different mix immediately.

Click **Clear** to remove the currently visible generated sets. This does not remove saved sets or collections.

## Criteria

### Word Count Per Set

Controls how many words appear in each generated set.

### Number Of Sets

Controls how many separate sets are generated at once.

For example, 3 sets with 12 words each produces 36 visible words.

### Word Length

Controls the allowed word length in letters. Filters apply to normalized word forms. Punctuation such as apostrophes and hyphens is not counted as a letter.

### Common / Useful Words

When enabled, generation uses the common-word subset by default. This keeps output practical and familiar.

### Include Rare Words

When enabled, the generator expands the pool to include rarer and more obscure words. This can produce more unusual results, but it may also introduce specialized, archaic, or less useful words.

### Quality Mode

Quality mode controls how strongly the generator favors words with better quality scores.

- **Balanced:** the default. It favors useful words while preserving randomness.
- **Common first:** strongly favors higher-quality/common words. Use this when you want cleaner, more familiar output.
- **More surprising:** reduces the strength of quality weighting. Use this when you want more unusual results without fully enabling rare-word behavior.

Quality mode changes selection weighting. It does not change the filtered pool size.

### Parts Of Speech

Use the part-of-speech chips to include or exclude categories:

- Noun
- Verb
- Adjective
- Adverb
- Pronoun
- Preposition
- Conjunction
- Interjection
- Other

Click **Select all** to restore all part-of-speech categories.

The app uses curated overrides for common function words and a heuristic classifier for the rest of the word database. Because English words can have multiple roles, the displayed part of speech should be treated as a practical generation label, not a full dictionary analysis.

### Dialect / Variety

Choose the English variety used for the word pool:

- American English
- British English
- Canadian English
- Australian English

Dialect filtering is based on source wordlist coverage.

### Text Filters

Use text filters to constrain word shape:

- **Starts with:** only include words beginning with the entered text.
- **Ends with:** only include words ending with the entered text.
- **Contains:** require every entered letter to appear somewhere in the word.
- **Excludes:** reject words containing any entered letter.

Text filters are case-insensitive and apply to normalized word forms.

### Unique Words Only

When enabled, the generator avoids repeating the same word across visible sets. It also reduces obvious same-family clusters, such as plural or inflected variants, so generated sets are less likely to contain near-duplicates.

### Exclude Offensive Words

When enabled, the generator removes entries flagged by the app's curated offensive-word hints.

This is a practical safeguard, not a complete moderation system.

### No Proper Nouns

When enabled, the generator removes entries flagged as likely proper nouns, including many country names, places, demonyms, and similar terms.

### No Acronyms / Initialisms

When enabled, the generator removes entries flagged as acronyms or initialisms, such as `api`, `usa`, `pdf`, and similar forms.

This setting is enabled by default.

### No Contractions

When enabled, words containing apostrophes are excluded.

### No Hyphenated Words

When enabled, words containing hyphens are excluded.

## Theme And Semantic Controls

Themes are optional. If no theme is entered, the generator uses the local word database only.

When a theme is present, the app requests related words from Datamuse and blends those results with the local database according to the selected semantic settings.

### Theme / Idea

Enter a free-text theme such as:

- `sunken city`
- `cozy village`
- `space colony`
- `stormy weather`

The theme field can also be filled by clicking a preset.

### Semantic Mode

Semantic mode controls how the theme is interpreted.

- **Strict category:** stays closest to the theme. If semantic results are available, the general pool is minimized.
- **Broad theme:** blends related theme words with the general pool. This is the default semantic mode.
- **Related concepts:** emphasizes connected concepts more strongly.
- **Mood / tone:** looks for words associated with a mood or tone rather than category membership.
- **Evocative:** favors atmosphere, imagery, and associative words that suggest the theme without needing to name it directly.
- **Concrete objects:** favors tangible nouns, places, props, materials, and physical things related to the theme.
- **Actions & motion:** favors verbs and dynamic words connected to movement, change, and activity around the theme.
- **Sensory:** emphasizes texture, sound, color, scent, taste, temperature, and physical feeling.

### Include Phrases

When enabled, theme results may include multi-word phrases from Datamuse.

Phrases are gated by this toggle because they behave differently from single words and may not fit every use case.

### Preset Themes

Preset themes provide quick starting points. Selecting a preset fills the theme field and highlights the selected preset.

Available presets include:

- Haunted House
- Desert Ruins
- Arctic Expedition
- Clockwork City
- Cyberpunk Alley
- Forgotten Library
- Royal Court
- Underworld Journey
- Garden Sanctuary
- Secret Laboratory
- Alien Ecosystem
- Dream Carnival

### Advanced Semantic Options

Open **Advanced semantic options** to tune theme behavior.

### Theme Expansion Size

Controls how many Datamuse candidates are requested before local filters are applied.

Higher values can find more possibilities, but they may also make themed generation feel broader.

### Theme Strength

Controls how heavily semantic matches are weighted compared with the general pool.

Higher values make the output more theme-driven.

### Fallback To General Pool

When enabled, the generator can fall back to the local word database if semantic matches are too narrow.

Disable this when you want strict theme-only behavior and are willing to accept smaller output sets.

## Reproducible Seed Mode

By default, the seed is hidden and each click of **Generate** creates fresh results.

Turn on **Reproducible seed mode** when you want deterministic generation. In this mode:

- The seed field becomes visible.
- The same seed plus the same criteria should produce the same word order.
- Click the seed refresh button to generate a new seed manually.

This mode is intended for power users, testing, reproducible prompts, and shareable workflows.

## Generated Sets

Each generated set appears as a card with numbered word tiles.

Word tiles show:

- The word.
- A short part-of-speech badge.
- A definition tooltip when a definition is available.

Definitions are loaded from Datamuse and cached locally in your browser. Hover or focus a word tile to view the tooltip.

Turn on **Settings -> Show word details** to show additional data-quality metadata on each tile:

- Base form for inflected words.
- POS source, such as curated override, morphology, suffix rule, default fallback, or Datamuse.
- POS confidence.
- Alternate POS hints when a word is known to work in more than one category.

### Set Actions

Each set has several actions:

- **Copy:** copies that set's words as comma-separated text.
- **Save:** saves that set to local storage.
- **Regenerate:** regenerates only that set using the current criteria.

### Save All

Click **Save all** to save every currently visible set.

## Sharing Criteria

Click **Copy link** to create a shareable URL for the current criteria.

The link stores generator criteria in the URL. It does not store the generated word results themselves.

When clipboard access is available, the app copies the criteria link and shows a confirmation notice. If the browser blocks clipboard access, the app still places the criteria link in the address bar and tells you to copy it from there.

Shared links include settings such as:

- Word count and set count
- Word length
- Common/rare behavior
- Quality mode
- Parts of speech
- Dialect
- Text filters
- Exclusion toggles
- Theme and semantic settings
- Seed mode and seed

Opening a shared link loads those criteria into the generator and shows a short confirmation notice summarizing the imported set count, words per set, theme, semantic mode, and quality mode when applicable.

If a shared link is incomplete or malformed, the app leaves the existing/default criteria in place and shows a warning instead of silently applying partial data.

## Exporting Results

Choose an export format and click **Export**.

The export button is enabled after at least one word set has been generated. Downloaded result filenames include the export date and, when a theme is active, a short theme slug.

Supported formats:

- **JSON**
- **CSV**
- **Text**

Exports include both the generated sets and criteria metadata, including export timestamp, theme, semantic mode, quality mode, seed mode, and seed.

### JSON Export

JSON export is best for reusing generated data in another tool or script.

It includes:

- `exportedAt`
- `criteria`
- `sets`

### CSV Export

CSV export is best for spreadsheets.

Rows include metadata such as set number, word position, part of speech, frequency band, quality score, source, theme, semantic mode, quality mode, seed mode, and seed.

### Text Export

Text export is best for notes, documents, prompts, and quick sharing.

It includes a short criteria summary followed by each generated set.

## Diagnostics

The **Diagnostics** view explains the currently generated output. It shows summary counts, active generation rules, quality gates, and row-level metadata for each generated word.

Use the diagnostics search box and row filter buttons to narrow the visible rows.

Click **Export diagnostics** to download the currently visible diagnostics rows. Diagnostics export supports JSON, CSV, and text formats. The export includes the active diagnostics row filter, search query, criteria metadata, semantic summary counts, and row-level word metadata such as POS source, confidence, frequency band, quality score, source, and semantic strength.

## Saved Sets

The **Saved Sets** view shows sets saved in the current browser.

For each saved set, you can:

- Restore it to the generator screen.
- Copy its words.
- Delete it.
- Assign it to a collection.

Saved sets are stored locally in your browser. They are not uploaded or synced.

## Collections

The **Collections** view lets you organize saved sets.

You can:

- Create a collection.
- Rename a collection.
- Delete a collection.
- See how many saved sets are assigned to each collection.

Deleting a collection does not delete the saved sets inside it. Those sets become unfiled.

## History

The **Generation history** panel records recent generated outputs in the current browser session storage.

Click a history item to restore its criteria and generated sets.

Click **Clear** to remove generation history.

## Settings

Open **Settings** from the top bar.

### Display Settings

Use **UI theme** to choose how the interface is styled.

Available UI themes:

- **System:** follows your operating system or browser light/dark preference.
- **Light:** the default light interface.
- **Dark:** a low-glare dark interface.
- **High Contrast:** stronger borders, brighter focus states, and high contrast surfaces.
- **Ink:** a minimal black-and-white interface.
- **Forest:** a calm green-accented interface.
- **Ocean:** a blue/teal interface.
- **Sunrise:** a warm amber/coral interface.
- **Solar Light:** a light Solarized-inspired palette.
- **Solar Dark:** a dark Solarized-inspired palette.

The selected UI theme is saved locally in the browser. When **System** is selected, the app updates automatically if your system light/dark preference changes.

Enable **Show word details** when you want generated word tiles to show metadata such as base form, POS source, confidence, and semantic source.

### Data Actions

Available actions:

- **Reset generator defaults:** restores default criteria.
- **Clear semantic cache:** removes cached Datamuse semantic and definition data.
- **Clear saved workspace data:** removes saved sets, collections, history, and currently generated sets.

These actions affect local browser data only.

## About Data

The **About Data** view summarizes the word database and runtime data behavior.

The primary word database is built from SCOWL/ESDB and normalized into a SQLite artifact. The app uses this database locally in the browser through `sql.js`.

Semantic expansion and definitions use Datamuse at runtime. These lookups are cached in browser local storage.

## Local Storage And Privacy

The app stores several kinds of data locally in your browser:

- Current filters
- Current generated sets
- Saved sets
- Collections
- Generation history
- Display settings, including UI theme and word detail display preference
- Datamuse semantic cache
- Definition cache

This data remains on your device unless you clear it through the app settings or browser storage controls.

Theme lookups and definition lookups are sent to Datamuse when those features are used.

## Troubleshooting

### The Filtered Pool Size Is Very Small

Relax one or more criteria:

- Increase the allowed word length range.
- Select more parts of speech.
- Turn on **Include rare words**.
- Remove starts-with, ends-with, contains, or excludes filters.
- Enable fallback to the general pool for themed generation.

### Generated Sets Are Smaller Than Requested

The active filters may not leave enough eligible words. Loosen the filters or reduce the word count per set.

### Theme Results Feel Too Broad

Try:

- Switching to **Strict category**.
- Reducing **Theme expansion size**.
- Increasing **Theme strength**.
- Disabling **Fallback to general pool**.

### Theme Results Feel Too Narrow

Try:

- Switching to **Broad theme**.
- Increasing **Theme expansion size**.
- Enabling **Fallback to general pool**.
- Turning on **Include rare words**.

### Results Are Too Ordinary

Try:

- Switching quality mode to **More surprising**.
- Turning on **Include rare words**.
- Using a stronger or more specific theme.

### Results Are Too Obscure

Try:

- Switching quality mode to **Common first**.
- Turning off **Include rare words**.
- Keeping **Common / useful words** enabled.
- Using fewer restrictive text filters.

### A Share Link Does Not Restore Results

Share links restore criteria, not generated words. Click **Generate** after opening the link to create results with those criteria.

For deterministic results, turn on **Reproducible seed mode** before copying the link.

### Clipboard Copy Fails

Some browsers block clipboard access unless the page has permission or the action is triggered directly by a click. If copying a share link fails, the app still places the link in the address bar.

## Suggested Workflows

### Brainstorming Names

1. Keep common/useful words enabled.
2. Choose nouns and adjectives.
3. Enter a theme.
4. Use **Broad theme**.
5. Generate several sets.
6. Save promising sets into a collection.

### Puzzle Or Game Word Lists

1. Set a strict length range.
2. Use starts-with, ends-with, contains, or excludes filters.
3. Keep acronyms, proper nouns, contractions, and hyphenated words excluded.
4. Use **Common first** if the list should be approachable.

### Weird Prompt Inspiration

1. Turn on **Include rare words**.
2. Use **More surprising** quality mode.
3. Enter an evocative theme.
4. Try **Mood / tone** or **Related concepts**.
5. Include phrases if multi-word prompts are useful.

### Reproducible Prompt Packs

1. Turn on **Reproducible seed mode**.
2. Choose criteria and a seed.
3. Generate sets.
4. Export as JSON or CSV.
5. Use **Copy link** to preserve the criteria for later.
