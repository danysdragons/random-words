import { normalizePos } from "./data";
import type { Filters, WordEntry } from "./types";

interface DatamuseWord {
  word: string;
  score?: number;
  tags?: string[];
}

const CACHE_KEY = "random-words:datamuse-cache:v1";
const MAX_CACHE_ITEMS = 80;

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
    isPhrase: word.includes(" "),
  };
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
