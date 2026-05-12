import { normalizePos } from "./data";
import type { Filters, WordEntry } from "./types";

interface DatamuseWord {
  word: string;
  score?: number;
  tags?: string[];
  defs?: string[];
  defHeadword?: string;
}

const CACHE_KEY = "random-words:datamuse-cache:v2";
const DEFINITION_CACHE_KEY = "random-words:definition-cache:v2";
const MAX_CACHE_ITEMS = 80;
const MAX_DEFINITION_CACHE_ITEMS = 600;

const OFFENSIVE_WORDS = new Set([
  "damn",
  "hell",
  "crap",
]);

const ACRONYM_WORDS = new Set([
  "aa",
  "ab",
  "abc",
  "ad",
  "adj",
  "adv",
  "afr",
  "ai",
  "api",
  "atm",
  "bc",
  "bbl",
  "bpm",
  "bps",
  "cd",
  "cds",
  "ceo",
  "chg",
  "chm",
  "cia",
  "cir",
  "cpu",
  "css",
  "dna",
  "dns",
  "dvd",
  "ems",
  "eta",
  "eu",
  "faq",
  "fbi",
  "ftp",
  "gdp",
  "gps",
  "gui",
  "html",
  "http",
  "https",
  "id",
  "ip",
  "iq",
  "irs",
  "isbn",
  "isp",
  "jpeg",
  "jpg",
  "lcd",
  "led",
  "llc",
  "mp3",
  "nasa",
  "nato",
  "nfl",
  "nhl",
  "pdf",
  "pin",
  "ram",
  "rna",
  "rom",
  "rpm",
  "sms",
  "sos",
  "sql",
  "tv",
  "uk",
  "un",
  "uri",
  "url",
  "usb",
  "usa",
  "vat",
  "vip",
  "vpn",
  "vr",
  "www",
  "xml",
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

  if (filters.semanticMode === "mood" || filters.semanticMode === "evocative") {
    params.set("rel_trg", theme);
    if (filters.semanticMode === "evocative") params.set("topics", theme);
  } else {
    params.set("ml", semanticQuery(filters));
    const topics = semanticTopics(filters);
    if (topics) params.set("topics", topics);
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

export async function fetchDefinitions(entries: WordEntry[]): Promise<Record<string, string>> {
  const uniqueEntries = dedupeDefinitionEntries(entries);
  if (!uniqueEntries.length) return {};

  const cache = readDefinitionCache();
  const missing = uniqueEntries.filter((entry) => cache[definitionCacheKey(entry)] === undefined);
  const resolved: Record<string, string> = {};

  for (const requested of missing.slice(0, 80)) {
    const word = requested.word.trim().toLowerCase();
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
      cache[definitionCacheKey(requested)] = formatDefinition(entry, requested);
    } catch {
      cache[definitionCacheKey(requested)] = "";
    }
  }

  trimDefinitionCache(cache);
  localStorage.setItem(DEFINITION_CACHE_KEY, JSON.stringify(cache));

  for (const entry of uniqueEntries) {
    const definition = cache[definitionCacheKey(entry)];
    if (definition) resolved[entry.word] = definition;
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
    baseForm: word,
    posSource: "datamuse",
    posConfidence: posTag ? 85 : 35,
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
  if (filters.semanticMode === "concrete" && entry.pos !== "noun") return false;
  if (filters.semanticMode === "actions" && entry.pos !== "verb") return false;
  if (filters.startsWith && !entry.word.startsWith(filters.startsWith.toLowerCase())) return false;
  if (filters.endsWith && !entry.word.endsWith(filters.endsWith.toLowerCase())) return false;
  if (filters.noContractions && entry.word.includes("'")) return false;
  if (filters.noHyphenated && entry.word.includes("-")) return false;
  if (filters.noAcronyms && isAcronymLike(entry.word)) return false;
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

function semanticQuery(filters: Filters) {
  const theme = filters.theme.trim();
  if (filters.semanticMode === "concrete") return `${theme} object thing place material`;
  if (filters.semanticMode === "actions") return `${theme} action motion move`;
  if (filters.semanticMode === "sensory") return `${theme} texture sound color scent taste temperature`;
  return theme;
}

function semanticTopics(filters: Filters) {
  const theme = filters.theme.trim();
  if (filters.semanticMode === "strict") return "";
  if (filters.semanticMode === "concrete") return `${theme},object,place,material`;
  if (filters.semanticMode === "actions") return `${theme},action,motion`;
  if (filters.semanticMode === "sensory") return `${theme},texture,sound,color,scent,taste`;
  return theme;
}

function isAcronymLike(word: string) {
  return ACRONYM_WORDS.has(word.toLowerCase().replace(/[^a-z0-9]/g, ""));
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

function dedupeDefinitionEntries(entries: WordEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const word = entry.word.trim().toLowerCase();
    if (!word) return false;
    const key = definitionCacheKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function definitionCacheKey(entry: WordEntry | string) {
  if (typeof entry === "string") return `${entry}|other|${entry}`;
  return `${entry.word}|${entry.pos}|${entry.baseForm || entry.word}`;
}

function formatDefinition(entry: DatamuseWord | undefined, requested: WordEntry) {
  const definition = selectDefinition(entry, requested);
  if (!definition) return "";
  const [, text = definition] = definition.split("\t");
  const headword = entry?.defHeadword && entry.defHeadword !== requested.word ? `${entry.defHeadword}: ` : "";
  return `${headword}${text}`;
}

function selectDefinition(entry: DatamuseWord | undefined, requested: WordEntry) {
  if (!entry?.defs?.length) return "";
  const targetTag = definitionPosTag(requested.pos);
  const matching = targetTag ? entry.defs.find((definition) => definition.startsWith(`${targetTag}\t`)) : "";
  if (matching) return matching;
  if (requested.posSource === "morphology") return "";
  return entry.defs[0] ?? "";
}

function definitionPosTag(pos: WordEntry["pos"]) {
  if (pos === "noun") return "n";
  if (pos === "verb") return "v";
  if (pos === "adjective") return "adj";
  if (pos === "adverb") return "adv";
  return "";
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
