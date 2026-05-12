import initSqlJs, { Database } from "sql.js";
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
  const [dbResponse, metaResponse] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}data/words.sqlite`),
    fetch(`${import.meta.env.BASE_URL}data/build-meta.json`).catch(() => null),
  ]);

  if (!dbResponse.ok) {
    throw new Error(`Unable to load words.sqlite (${dbResponse.status})`);
  }

  const dbBytes = new Uint8Array(await dbResponse.arrayBuffer());
  const meta = metaResponse?.ok ? ((await metaResponse.json()) as BuildMeta) : null;
  return { db: new SQL.Database(dbBytes), meta };
}

export function queryWords(db: Database, filters: Filters): WordEntry[] {
  const where: string[] = [
    "length BETWEEN ? AND ?",
    "is_phrase = 0",
    `${DIALECT_COLUMNS[filters.dialect]} = 1`,
  ];
  const params: Array<string | number> = [filters.minLength, filters.maxLength];

  if (!filters.includeRare) where.push("commonness = 'common'");
  if (filters.selectedPos.length > 0 && filters.selectedPos.length < 9) {
    where.push(`pos IN (${filters.selectedPos.map(() => "?").join(", ")})`);
    params.push(...filters.selectedPos);
  }
  if (filters.startsWith.trim()) {
    where.push("normalized LIKE ?");
    params.push(`${filters.startsWith.trim().toLowerCase()}%`);
  }
  if (filters.endsWith.trim()) {
    where.push("normalized LIKE ?");
    params.push(`%${filters.endsWith.trim().toLowerCase()}`);
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
  if (filters.excludeOffensive) where.push("offensive_hint = 0");

  const result = db.exec(
    `
      SELECT id, word, length, pos, commonness, quality_score, frequency_band
      FROM words
      WHERE ${where.join(" AND ")}
      ORDER BY quality_score DESC, word
    `,
    params,
  );

  if (!result[0]) return [];
  return result[0].values.map((row) => ({
    id: Number(row[0]),
    word: String(row[1]),
    length: Number(row[2]),
    pos: normalizePos(String(row[3])),
    commonness: row[4] === "rare" ? "rare" : "common",
    source: "scowl",
    score: Number(row[5]),
    qualityScore: Number(row[5]),
    frequencyBand: String(row[6]),
    isPhrase: false,
  }));
}

function uniqueLetters(value: string) {
  return [...new Set(value.toLowerCase().replace(/[^a-z]/g, "").split(""))];
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
