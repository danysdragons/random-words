import initSqlJs from "sql.js";
import { unzipSync, strFromU8 } from "fflate";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";

const VERSION = "2026.02.25";
const SOURCE_BASE = `https://sourceforge.net/projects/wordlist/files/speller/${VERSION}`;
const RAW_DIR = resolve("data/raw/scowl");
const OUT_DB = resolve("public/data/words.sqlite");
const OUT_META = resolve("public/data/build-meta.json");
const QUALITY_DATA = JSON.parse(readFileSync(resolve("data/quality/word-quality.json"), "utf8"));

const DIALECTS = [
  { key: "us", label: "American English", code: "en_US" },
  { key: "gb", label: "British English", code: "en_GB" },
  { key: "ca", label: "Canadian English", code: "en_CA" },
  { key: "au", label: "Australian English", code: "en_AU" },
];

const SOURCE_PACKAGES = DIALECTS.flatMap((dialect) => [
  { ...dialect, tier: "common", fileStem: `wordlist-${dialect.code}-${VERSION}` },
  { ...dialect, tier: "large", fileStem: `wordlist-${dialect.code}-large-${VERSION}` },
]);

SOURCE_PACKAGES.splice(
  2,
  2,
  {
    key: "gb",
    label: "British English",
    code: "en_GB-ise",
    tier: "common",
    fileStem: `wordlist-en_GB-ise-${VERSION}`,
  },
  {
    key: "gb",
    label: "British English",
    code: "en_GB-ize",
    tier: "common",
    fileStem: `wordlist-en_GB-ize-${VERSION}`,
  },
  {
    key: "gb",
    label: "British English",
    code: "en_GB-large",
    tier: "large",
    fileStem: `wordlist-en_GB-large-${VERSION}`,
  },
);

const POS_PATTERNS = [
  { pos: "adverb", re: /ly$/ },
  { pos: "adjective", re: /(able|ible|al|ful|ic|ish|ive|less|ous|y)$/ },
  { pos: "verb", re: /(ate|en|fy|ise|ize)$/ },
  { pos: "noun", re: /(age|ance|ence|er|hood|ion|ism|ist|ity|ment|ness|or|ship)$/ },
];

const POS_OVERRIDES = new Map(
  Object.entries(QUALITY_DATA.posOverrides).map(([word, pos]) => [normalizeWord(word), pos]),
);
const PROPER_NOUN_HINTS = new Set(QUALITY_DATA.properNounHints.map(normalizeWord));
const OFFENSIVE_WORDS = new Set(QUALITY_DATA.offensiveWords.map(normalizeWord));
const ACRONYM_WORDS = new Set(QUALITY_DATA.acronymWords.map(normalizeWord));
const FREQUENCY_BANDS = {
  core: new Set(QUALITY_DATA.frequencyBands.core.map(normalizeWord)),
  familiar: new Set(QUALITY_DATA.frequencyBands.familiar.map(normalizeWord)),
  rarePenalty: new Set(QUALITY_DATA.frequencyBands.rarePenalty.map(normalizeWord)),
};

function sourceUrl(pkg) {
  const fileName = `${pkg.fileStem}.zip`;
  return `${SOURCE_BASE}/${fileName}/download`;
}

async function download(url, target) {
  if (existsSync(target)) return;
  console.log(`Downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  writeFileSync(target, bytes);
}

function normalizeWord(word) {
  return word
    .trim()
    .replaceAll("’", "'")
    .normalize("NFKC")
    .toLowerCase();
}

function cleanRawWord(word) {
  return word.trim().replaceAll("’", "'").normalize("NFKC");
}

function inferPos(word) {
  const override = POS_OVERRIDES.get(word);
  if (override) return override;
  for (const pattern of POS_PATTERNS) {
    if (pattern.re.test(word)) return pattern.pos;
  }
  return "noun";
}

function frequencyBand(word) {
  if (FREQUENCY_BANDS.core.has(word)) return "core";
  if (FREQUENCY_BANDS.familiar.has(word)) return "familiar";
  if (FREQUENCY_BANDS.rarePenalty.has(word)) return "niche";
  return "standard";
}

function qualityScore(record) {
  let score = record.common ? 60 : 25;
  const band = frequencyBand(record.word);
  if (band === "core") score += 35;
  if (band === "familiar") score += 22;
  if (band === "niche") score -= 25;
  if (record.length >= 4 && record.length <= 10) score += 8;
  if (record.length <= 2) score -= 18;
  if (record.hasApostrophe || record.hasHyphen || record.isPhrase) score -= 12;
  if (PROPER_NOUN_HINTS.has(record.word)) score -= 25;
  if (OFFENSIVE_WORDS.has(record.word)) score -= 40;
  if (record.acronymHint) score -= 24;
  if (record.pos === "noun" || record.pos === "verb" || record.pos === "adjective") score += 6;
  if (record.pos === "other") score -= 12;
  return Math.max(1, Math.min(100, score));
}

function acronymHint(rawWord, word) {
  const compactRaw = rawWord.replace(/[^A-Za-z]/g, "");
  const compactWord = word.replace(/[^a-z]/g, "");
  if (ACRONYM_WORDS.has(word)) return true;
  if (rawWord.includes(".") && compactWord.length >= 2 && compactWord.length <= 8) return true;
  if (
    compactRaw.length >= 2 &&
    compactRaw.length <= 8 &&
    compactRaw === compactRaw.toUpperCase() &&
    /[A-Z]/.test(compactRaw)
  ) {
    return true;
  }
  return false;
}

function readPackageWords(pkg) {
  const fileName = `${pkg.fileStem}.zip`;
  const zipPath = resolve(RAW_DIR, fileName);
  const archive = unzipSync(readFileSync(zipPath));
  const textFile = Object.keys(archive).find(
    (name) => name.endsWith(".txt") && !basename(name).startsWith("README"),
  );
  if (!textFile) throw new Error(`No wordlist .txt found in ${zipPath}`);
  return strFromU8(archive[textFile])
    .split(/\r?\n/)
    .map(cleanRawWord)
    .filter(Boolean);
}

function applyWord(recordMap, rawWord, pkg) {
  const word = normalizeWord(rawWord);
  if (!word) return;
  const containsLetter = /[a-z]/.test(word);
  if (!containsLetter) return;

  const existing =
    recordMap.get(word) ??
    {
      word,
      length: word.replace(/[^a-z]/g, "").length,
      hasApostrophe: word.includes("'"),
      hasHyphen: word.includes("-"),
      isPhrase: /\s/.test(word),
      pos: inferPos(word),
      common: false,
      acronymHint: acronymHint(rawWord, word),
      dialects: new Set(),
    };

  existing.dialects.add(pkg.key);
  if (pkg.tier === "common") existing.common = true;
  if (acronymHint(rawWord, word)) existing.acronymHint = true;
  recordMap.set(word, existing);
}

function createDatabase(records, sourceCount) {
  const acronymHintCount = records.filter((record) => record.acronymHint).length;
  const SQL = initSqlJs();
  return SQL.then((SQLModule) => {
    const db = new SQLModule.Database();
    db.run(`
      PRAGMA user_version = 1;

      CREATE TABLE metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE words (
        id INTEGER PRIMARY KEY,
        word TEXT NOT NULL UNIQUE,
        normalized TEXT NOT NULL,
        length INTEGER NOT NULL,
        commonness TEXT NOT NULL CHECK (commonness IN ('common', 'rare')),
        pos TEXT NOT NULL,
        is_phrase INTEGER NOT NULL,
        has_apostrophe INTEGER NOT NULL,
        has_hyphen INTEGER NOT NULL,
        proper_noun_hint INTEGER NOT NULL,
        offensive_hint INTEGER NOT NULL,
        acronym_hint INTEGER NOT NULL,
        frequency_band TEXT NOT NULL,
        quality_score INTEGER NOT NULL,
        dialect_us INTEGER NOT NULL,
        dialect_gb INTEGER NOT NULL,
        dialect_ca INTEGER NOT NULL,
        dialect_au INTEGER NOT NULL,
        source TEXT NOT NULL
      );

      CREATE INDEX idx_words_length ON words(length);
      CREATE INDEX idx_words_commonness ON words(commonness);
      CREATE INDEX idx_words_pos ON words(pos);
      CREATE INDEX idx_words_quality ON words(quality_score);
      CREATE INDEX idx_words_shape ON words(is_phrase, has_apostrophe, has_hyphen);
      CREATE INDEX idx_words_dialects ON words(dialect_us, dialect_gb, dialect_ca, dialect_au);
    `);

    const insert = db.prepare(`
      INSERT INTO words (
        word, normalized, length, commonness, pos, is_phrase, has_apostrophe,
        has_hyphen, proper_noun_hint, offensive_hint, acronym_hint, frequency_band, quality_score,
        dialect_us, dialect_gb, dialect_ca, dialect_au, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.run("BEGIN TRANSACTION");
    for (const record of records) {
      insert.run([
        record.word,
        record.word,
        record.length,
        record.common ? "common" : "rare",
        record.pos,
        record.isPhrase ? 1 : 0,
        record.hasApostrophe ? 1 : 0,
        record.hasHyphen ? 1 : 0,
        PROPER_NOUN_HINTS.has(record.word) ? 1 : 0,
        OFFENSIVE_WORDS.has(record.word) ? 1 : 0,
        record.acronymHint ? 1 : 0,
        frequencyBand(record.word),
        qualityScore(record),
        record.dialects.has("us") ? 1 : 0,
        record.dialects.has("gb") ? 1 : 0,
        record.dialects.has("ca") ? 1 : 0,
        record.dialects.has("au") ? 1 : 0,
        `SCOWL/ESDB ${VERSION}`,
      ]);
    }
    db.run("COMMIT");
    insert.free();

    const metadata = db.prepare("INSERT INTO metadata (key, value) VALUES (?, ?)");
    metadata.run(["source", `SCOWL/ESDB ${VERSION}`]);
    metadata.run(["generated_at", new Date().toISOString()]);
    metadata.run(["records", String(records.length)]);
    metadata.run(["source_entries", String(sourceCount)]);
    metadata.run(["pos_overrides", String(POS_OVERRIDES.size)]);
    metadata.run(["proper_noun_hints", String(PROPER_NOUN_HINTS.size)]);
    metadata.run(["offensive_hints", String(OFFENSIVE_WORDS.size)]);
    metadata.run(["acronym_hints", String(acronymHintCount)]);
    metadata.run(["frequency_core_words", String(FREQUENCY_BANDS.core.size)]);
    metadata.run(["frequency_familiar_words", String(FREQUENCY_BANDS.familiar.size)]);
    metadata.run(["frequency_niche_penalties", String(FREQUENCY_BANDS.rarePenalty.size)]);
    metadata.free();

    return db.export();
  });
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(dirname(OUT_DB), { recursive: true });

  for (const pkg of SOURCE_PACKAGES) {
    const fileName = `${pkg.fileStem}.zip`;
    await download(sourceUrl(pkg), resolve(RAW_DIR, fileName));
  }

  const records = new Map();
  let sourceCount = 0;
  for (const pkg of SOURCE_PACKAGES) {
    const words = readPackageWords(pkg);
    sourceCount += words.length;
    for (const word of words) applyWord(records, word, pkg);
  }

  const sortedRecords = [...records.values()].sort((a, b) => a.word.localeCompare(b.word));
  const acronymHintCount = sortedRecords.filter((record) => record.acronymHint).length;
  const dbBytes = await createDatabase(sortedRecords, sourceCount);
  writeFileSync(OUT_DB, Buffer.from(dbBytes));

  const meta = {
    source: `SCOWL/ESDB ${VERSION}`,
    generatedAt: new Date().toISOString(),
    records: sortedRecords.length,
    sourceEntries: sourceCount,
    quality: {
      posOverrides: POS_OVERRIDES.size,
      properNounHints: PROPER_NOUN_HINTS.size,
      offensiveHints: OFFENSIVE_WORDS.size,
      acronymHints: acronymHintCount,
      frequencyCoreWords: FREQUENCY_BANDS.core.size,
      frequencyFamiliarWords: FREQUENCY_BANDS.familiar.size,
      frequencyNichePenalties: FREQUENCY_BANDS.rarePenalty.size,
    },
    dialects: DIALECTS.map(({ key, label }) => ({ key, label })),
  };
  writeFileSync(OUT_META, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`Wrote ${OUT_DB} with ${sortedRecords.length.toLocaleString()} words.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
