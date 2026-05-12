import { normalizePos } from "./data";
import type { Filters, WordEntry } from "./types";

interface DatamuseWord {
  word: string;
  score?: number;
  tags?: string[];
  defs?: string[];
  defHeadword?: string;
}

const CACHE_KEY = "random-words:datamuse-cache:v1";
const DEFINITION_CACHE_KEY = "random-words:definition-cache:v1";
const MAX_CACHE_ITEMS = 80;
const MAX_DEFINITION_CACHE_ITEMS = 600;

const OFFENSIVE_WORDS = new Set([
  "damn",
  "hell",
  "crap",
]);

export async function fetchSemanticWords(filters: Filters): Promise<WordEntry[]> {
  const theme = filters.theme.trim();
  if (!theme) return [];

  const cache = readCache();
  const key = [
    theme.toLowerCase(),
    filters.semanticMode,
    filters.includePhrases ? "phrases" : "words",
    filters.semanticLimit,
  ].join("|");
  if (cache[key]) return cache[key];

  const params = new URLSearchParams();
  params.set("max", String(filters.semanticLimit));
  params.set("md", "p");

  if (filters.semanticMode === "mood") {
    params.set("rel_trg", theme);
  } else {
    params.set("ml", theme);
    if (filters.semanticMode === "broad" || filters.semanticMode === "related") {
      params.set("topics", theme);
    }
  }

  const response = await fetch(`https://api.datamuse.com/words?${params.toString()}`);
  if (!response.ok) throw new Error(`Datamuse request failed (${response.status})`);

  const payload = (await response.json()) as DatamuseWord[];
  const words = payload
    .map((item, index) => toEntry(item, index))
    .filter((entry): entry is WordEntry => Boolean(entry))
    .filter((entry) => passesClientFilters(entry, filters));

  cache[key] = dedupe(words);
  trimCache(cache);
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  return cache[key];
}

export async function fetchDefinitions(words: string[]): Promise<Record<string, string>> {
  const uniqueWords = [...new Set(words.map((word) => word.trim().toLowerCase()).filter(Boolean))];
  if (!uniqueWords.length) return {};

  const cache = readDefinitionCache();
  const missing = uniqueWords.filter((word) => cache[word] === undefined);
  const resolved: Record<string, string> = {};

  for (const word of missing.slice(0, 80)) {
    const params = new URLSearchParams({
      sp: word,
      qe: "sp",
      md: "d",
      max: "1",
    });
    try {
      const response = await fetch(`https://api.datamuse.com/words?${params.toString()}`);
      if (!response.ok) continue;
      const [entry] = (await response.json()) as DatamuseWord[];
      cache[word] = formatDefinition(entry);
    } catch {
      cache[word] = "";
    }
  }

  trimDefinitionCache(cache);
  localStorage.setItem(DEFINITION_CACHE_KEY, JSON.stringify(cache));

  for (const word of uniqueWords) {
    if (cache[word]) resolved[word] = cache[word];
  }
  return resolved;
}

function toEntry(item: DatamuseWord, index: number): WordEntry | null {
  const word = item.word.trim().toLowerCase();
  if (!word || /[^a-z' -]/.test(word)) return null;
  const posTag = item.tags?.find((tag) => ["n", "v", "adj", "adv"].includes(tag));
  const cleanLength = word.replace(/[^a-z]/g, "").length;
  return {
    id: -1 - index,
    word,
    length: cleanLength,
    pos: normalizePos(posTag ?? "other"),
    commonness: "common",
    source: "datamuse",
    score: item.score ?? 0,
    qualityScore: datamuseQuality(item.score ?? 0),
    frequencyBand: "semantic",
    isPhrase: word.includes(" "),
  };
}

function datamuseQuality(score: number) {
  if (score > 50000) return 95;
  if (score > 10000) return 82;
  if (score > 2000) return 70;
  return 55;
}

function passesClientFilters(entry: WordEntry, filters: Filters) {
  if (!filters.includePhrases && entry.isPhrase) return false;
  if (entry.length < filters.minLength || entry.length > filters.maxLength) return false;
  if (filters.selectedPos.length && !filters.selectedPos.includes(entry.pos)) return false;
  if (filters.startsWith && !entry.word.startsWith(filters.startsWith.toLowerCase())) return false;
  if (filters.endsWith && !entry.word.endsWith(filters.endsWith.toLowerCase())) return false;
  if (filters.noContractions && entry.word.includes("'")) return false;
  if (filters.noHyphenated && entry.word.includes("-")) return false;
  if (filters.excludeOffensive && OFFENSIVE_WORDS.has(entry.word)) return false;

  const normalized = entry.word.replace(/[^a-z]/g, "");
  for (const letter of filters.contains.toLowerCase().replace(/[^a-z]/g, "")) {
    if (!normalized.includes(letter)) return false;
  }
  for (const letter of filters.excludes.toLowerCase().replace(/[^a-z]/g, "")) {
    if (normalized.includes(letter)) return false;
  }
  return true;
}

function dedupe(words: WordEntry[]) {
  const seen = new Set<string>();
  return words.filter((entry) => {
    if (seen.has(entry.word)) return false;
    seen.add(entry.word);
    return true;
  });
}

function readCache(): Record<string, WordEntry[]> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, WordEntry[]>;
  } catch {
    return {};
  }
}

function trimCache(cache: Record<string, WordEntry[]>) {
  const keys = Object.keys(cache);
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_CACHE_ITEMS))) {
    delete cache[key];
  }
}

function formatDefinition(entry?: DatamuseWord) {
  const definition = entry?.defs?.[0];
  if (!definition) return "";
  const [, text = definition] = definition.split("\t");
  const headword = entry.defHeadword && entry.defHeadword !== entry.word ? `${entry.defHeadword}: ` : "";
  return `${headword}${text}`;
}

function readDefinitionCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(DEFINITION_CACHE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function trimDefinitionCache(cache: Record<string, string>) {
  const keys = Object.keys(cache);
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_DEFINITION_CACHE_ITEMS))) {
    delete cache[key];
  }
}
