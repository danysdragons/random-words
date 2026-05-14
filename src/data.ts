import initSqlJs, { Database } from "sql.js";
import { gunzipSync } from "fflate";
import { matchesAdvancedWordFilters, normalizedText, uniqueLetters } from "./services/filterEvaluator";
import type { BuildMeta, Dialect, Filters, PartOfSpeech, WordEntry } from "./types";

export interface WordDatabase {
  db: Database;
  meta: BuildMeta | null;
}

const DIALECT_COLUMNS: Record<Dialect, string> = {
  us: "dialect_us",
  gb: "dialect_gb",
  ca: "dialect_ca",
  au: "dialect_au",
};

export async function loadWordDatabase(): Promise<WordDatabase> {
  const SQL = await initSqlJs({
    locateFile: (file) => {
      if (file.endsWith(".wasm")) return `${import.meta.env.BASE_URL}sql-wasm.wasm`;
      return `${import.meta.env.BASE_URL}${file}`;
    },
  });
  const [dbBytes, metaResponse] = await Promise.all([
    fetchDatabaseBytes(),
    fetch(`${import.meta.env.BASE_URL}data/build-meta.json`).catch(() => null),
  ]);

  const meta = metaResponse?.ok ? ((await metaResponse.json()) as BuildMeta) : null;
  return { db: new SQL.Database(dbBytes), meta };
}

async function fetchDatabaseBytes() {
  const compressedResponse = await fetch(`${import.meta.env.BASE_URL}data/words.sqlite.gz`).catch(() => null);
  if (compressedResponse?.ok) {
    const compressedBytes = new Uint8Array(await compressedResponse.arrayBuffer());
    if (isSqliteDatabase(compressedBytes)) return compressedBytes;
    try {
      return gunzipSync(compressedBytes);
    } catch {
      return fetchRawDatabaseBytes();
    }
  }

  return fetchRawDatabaseBytes();
}

async function fetchRawDatabaseBytes() {
  const dbResponse = await fetch(`${import.meta.env.BASE_URL}data/words.sqlite`);
  if (!dbResponse.ok) {
    throw new Error(`Unable to load words.sqlite (${dbResponse.status})`);
  }
  return new Uint8Array(await dbResponse.arrayBuffer());
}

function isSqliteDatabase(bytes: Uint8Array) {
  const sqliteHeader = "SQLite format 3";
  if (bytes.length < sqliteHeader.length) return false;
  return sqliteHeader.split("").every((character, index) => bytes[index] === character.charCodeAt(0));
}

export function queryWords(db: Database, filters: Filters): WordEntry[] {
  const selectedPos = selectedPartOfSpeech(filters.selectedPos);
  const where: string[] = [
    "length BETWEEN ? AND ?",
    "is_phrase = 0",
    `${DIALECT_COLUMNS[filters.dialect]} = 1`,
  ];
  const params: Array<string | number> = [filters.minLength, filters.maxLength];

  if (!filters.includeRare) where.push("commonness = 'common'");
  if (selectedPos.length > 0 && selectedPos.length < 9) {
    const primaryPlaceholders = selectedPos.map(() => "?").join(", ");
    const alternateClauses = selectedPos.map(() => "alternate_pos LIKE ?").join(" OR ");
    where.push(`(pos IN (${primaryPlaceholders}) OR ${alternateClauses})`);
    params.push(...selectedPos);
    params.push(...selectedPos.map((pos) => `%|${pos}|%`));
  }
  const startsWith = normalizedText(filters.startsWith);
  const endsWith = normalizedText(filters.endsWith);
  if (startsWith) {
    where.push("normalized LIKE ?");
    params.push(`${startsWith}%`);
  }
  if (endsWith) {
    where.push("normalized LIKE ?");
    params.push(`%${endsWith}`);
  }
  for (const letter of uniqueLetters(filters.contains)) {
    where.push("normalized LIKE ?");
    params.push(`%${letter}%`);
  }
  for (const letter of uniqueLetters(filters.excludes)) {
    where.push("normalized NOT LIKE ?");
    params.push(`%${letter}%`);
  }
  if (filters.noContractions) where.push("has_apostrophe = 0");
  if (filters.noHyphenated) where.push("has_hyphen = 0");
  if (filters.noProperNouns) where.push("proper_noun_hint = 0");
  if (filters.noAcronyms) where.push("acronym_hint = 0");
  if (filters.excludeOffensive) where.push("offensive_hint = 0");

  const result = db.exec(
    `
      SELECT id, word, length, pos, commonness, quality_score, frequency_band, base_form, pos_source, pos_confidence, alternate_pos
      FROM words
      WHERE ${where.join(" AND ")}
      ORDER BY quality_score DESC, word
    `,
    params,
  );

  if (!result[0]) return [];
  return result[0].values
    .map((row) => ({
      id: Number(row[0]),
      word: String(row[1]),
      length: Number(row[2]),
      pos: normalizePos(String(row[3])),
      baseForm: String(row[7]),
      posSource: normalizePosSource(String(row[8])),
      posConfidence: Number(row[9]),
      alternatePos: decodeAlternatePos(String(row[10])),
      commonness: row[4] === "rare" ? "rare" as const : "common" as const,
      source: "scowl" as const,
      score: Number(row[5]),
      qualityScore: Number(row[5]),
      frequencyBand: String(row[6]),
      isPhrase: false,
    }))
    .filter((entry) => matchesAdvancedWordFilters(entry.word, filters));
}

export function localPoolCriteriaKey(filters: Filters) {
  return JSON.stringify({
    minLength: filters.minLength,
    maxLength: filters.maxLength,
    includeRare: filters.includeRare,
    selectedPos: selectedPartOfSpeech(filters.selectedPos).sort(),
    dialect: filters.dialect,
    startsWith: normalizedText(filters.startsWith),
    endsWith: normalizedText(filters.endsWith),
    contains: uniqueLetters(filters.contains).sort().join(""),
    excludes: uniqueLetters(filters.excludes).sort().join(""),
    wordPattern: normalizedText(filters.wordPattern),
    minSyllables: filters.minSyllables,
    maxSyllables: filters.maxSyllables,
    excludeOffensive: filters.excludeOffensive,
    noProperNouns: filters.noProperNouns,
    noAcronyms: filters.noAcronyms,
    noContractions: filters.noContractions,
    noHyphenated: filters.noHyphenated,
  });
}

function decodeAlternatePos(value: string): PartOfSpeech[] {
  return value
    .split("|")
    .filter(Boolean)
    .map(normalizePos)
    .filter((pos) => pos !== "other");
}

function selectedPartOfSpeech(value: unknown): PartOfSpeech[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizePos(String(item))).filter((pos) => pos !== "other");
}

function normalizePosSource(value: string): WordEntry["posSource"] {
  if (value === "override" || value === "morphology" || value === "suffix" || value === "default" || value === "datamuse") {
    return value;
  }
  return "default";
}

export function normalizePos(value: string): PartOfSpeech {
  const normalized = value.toLowerCase();
  if (
    normalized === "noun" ||
    normalized === "verb" ||
    normalized === "adjective" ||
    normalized === "adverb" ||
    normalized === "pronoun" ||
    normalized === "preposition" ||
    normalized === "conjunction" ||
    normalized === "interjection"
  ) {
    return normalized;
  }
  if (normalized === "adj") return "adjective";
  if (normalized === "adv") return "adverb";
  if (normalized === "v") return "verb";
  if (normalized === "n") return "noun";
  return "other";
}
