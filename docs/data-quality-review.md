# Data Quality Review

This document tracks the current word-data quality work for Random Words. The source word lists do not provide reliable part-of-speech tags, so the app combines curated overrides, morphology, suffix rules, and a default noun fallback.

## Current POS Inference Layers

1. Curated overrides: explicit high-confidence labels in `data/quality/word-quality.json`.
2. Morphology: common `-ed` and `-ing` forms inferred from a plausible base form and sibling inflection.
3. Suffix rules: broad endings such as `-ly`, `-tion`, `-ous`, and `-ive`.
4. Default fallback: noun, used when no stronger evidence exists.

The generated SQLite database stores `base_form`, `pos_source`, and `pos_confidence` for each word so the app can audit and debug POS decisions.

## Review Results

After the current curated override pass:

- Explicit POS overrides: 332 entries.
- Morphology-derived POS tags: 17,879 entries.
- Alternate POS entries: 41 entries.
- Core words still using default noun fallback: 49 entries.
- Familiar words still using default noun fallback: 29 entries.
- Core/familiar words still using suffix inference: 29 entries.

The pass corrected high-impact visible errors such as:

- `ability`: adjective -> noun
- `family`: adverb -> noun
- `explore`: noun -> verb
- `discover`: noun -> verb
- `gentle`: noun -> adjective
- `golden`: verb -> adjective
- `hidden`: verb -> adjective
- `lively`: adverb -> adjective
- `solve`: noun -> verb
- `transform`: noun -> verb
- `wander`: noun -> verb
- `whisper`: noun -> verb

## Remaining Review Buckets

### Ambiguous Words

Some words are genuinely multi-role, but the v1 database stores one primary POS per word. Examples:

- `light`: adjective, noun, or verb
- `run`: verb or noun
- `set`: verb, noun, or adjective
- `painting`: verb form or noun
- `boring`, `interesting`, `tired`, `excited`: verb participles or adjectives

The current approach chooses a single useful primary POS and records the inference source. A curated `alternate_pos` field lets known ambiguous words match additional POS filters. A future normalized `word_pos` table can replace this if broader multi-role filtering becomes important.

### Default Noun Fallbacks

Default noun fallback is intentionally conservative, but the remaining core/familiar fallback list should be reviewed periodically. Many are correct nouns, but some may be better as verbs or adjectives depending on generation goals.

### Suffix-Inferred Common Words

Suffix inference catches many useful words, but it can misclassify common words whose endings are misleading. These are good candidates for future curated overrides.

## Audit Commands

Run the full data audit:

```bash
npm run audit:data
```

Generate the committed Markdown review report:

```bash
npm run report:data
```

Inspect selected POS metadata directly:

```bash
node --input-type=module -e "import initSqlJs from 'sql.js'; import { readFileSync } from 'node:fs'; const SQL=await initSqlJs(); const db=new SQL.Database(readFileSync('public/data/words.sqlite')); for (const w of ['ability','family','explore','gentle','lively','solve']) { const r=db.exec('select word,pos,pos_source,pos_confidence from words where word=?',[w]); console.log(r[0]?.values[0]?.join('\t') ?? w + ' missing'); }"
```

## Next Steps

1. Continue conservative overrides for high-frequency words seen in normal generation.
2. Expand `alternate_pos` for well-known multi-role words.
3. Consider a normalized POS table if curated alternates become too large to maintain by hand.
