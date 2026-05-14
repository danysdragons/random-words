import { POS_OPTIONS } from "../constants";
import type { Filters, PartOfSpeech, WordEntry } from "../types";
import { isAcronymLike, isOffensiveWord } from "./safetyMetadata";

export type FilterRejectReason =
  | "phrase-disabled"
  | "length"
  | "part-of-speech"
  | "semantic-mode-pos"
  | "starts-with"
  | "ends-with"
  | "contains"
  | "excludes"
  | "contraction"
  | "hyphenated"
  | "acronym"
  | "offensive"
  | "pattern"
  | "syllables";

export interface FilterEvaluationOptions {
  semanticModeRestrictions?: boolean;
}

export interface FilterEvaluation {
  ok: boolean;
  reason?: FilterRejectReason;
}

export function evaluateWordEntry(
  entry: WordEntry,
  filters: Filters,
  options: FilterEvaluationOptions = {},
): FilterEvaluation {
  if (!filters.includePhrases && entry.isPhrase) return reject("phrase-disabled");
  if (entry.length < filters.minLength || entry.length > filters.maxLength) return reject("length");
  if (!matchesSelectedPartOfSpeech(entry, filters.selectedPos)) return reject("part-of-speech");
  if (options.semanticModeRestrictions && !matchesSemanticModePartOfSpeech(entry, filters)) {
    return reject("semantic-mode-pos");
  }

  const word = entry.word.toLowerCase();
  const startsWith = normalizedText(filters.startsWith);
  const endsWith = normalizedText(filters.endsWith);
  if (startsWith && !word.startsWith(startsWith)) return reject("starts-with");
  if (endsWith && !word.endsWith(endsWith)) return reject("ends-with");

  const normalizedWord = normalizedLetters(word);
  for (const letter of uniqueLetters(filters.contains)) {
    if (!normalizedWord.includes(letter)) return reject("contains");
  }
  for (const letter of uniqueLetters(filters.excludes)) {
    if (normalizedWord.includes(letter)) return reject("excludes");
  }

  if (filters.noContractions && entry.word.includes("'")) return reject("contraction");
  if (filters.noHyphenated && entry.word.includes("-")) return reject("hyphenated");
  if (filters.noAcronyms && isAcronymLike(entry.word)) return reject("acronym");
  if (filters.excludeOffensive && isOffensiveWord(entry.word)) return reject("offensive");
  if (!matchesWordPattern(entry.word, filters.wordPattern)) return reject("pattern");
  if (!matchesSyllableRange(entry.word, filters)) return reject("syllables");

  return { ok: true };
}

export function passesEntryFilters(entry: WordEntry, filters: Filters, options?: FilterEvaluationOptions) {
  return evaluateWordEntry(entry, filters, options).ok;
}

export function matchesAdvancedWordFilters(word: string, filters: Filters) {
  return matchesWordPattern(word, filters.wordPattern) && matchesSyllableRange(word, filters);
}

export function estimateSyllables(word: string) {
  const normalized = normalizedLetters(word);
  if (!normalized) return 1;
  const groups = normalized.match(/[aeiouy]+/g)?.length ?? 1;
  const silentE = normalized.length > 3 && normalized.endsWith("e") && !/[aeiouy]le$/.test(normalized) ? 1 : 0;
  return Math.max(1, groups - silentE);
}

export function uniqueLetters(value: unknown) {
  if (typeof value !== "string") return [];
  return [...new Set(value.toLowerCase().replace(/[^a-z]/g, "").split(""))];
}

export function normalizedText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function matchesSelectedPartOfSpeech(entry: WordEntry, selectedPos: PartOfSpeech[]) {
  if (!selectedPos.length || selectedPos.length >= POS_OPTIONS.length) return true;
  return selectedPos.includes(entry.pos) || entry.alternatePos.some((pos) => selectedPos.includes(pos));
}

function matchesSemanticModePartOfSpeech(entry: WordEntry, filters: Filters) {
  if (filters.semanticMode === "concrete") return entry.pos === "noun";
  if (filters.semanticMode === "actions") return entry.pos === "verb";
  return true;
}

function matchesWordPattern(word: string, pattern: unknown) {
  const cleanPattern = normalizedText(pattern);
  if (!cleanPattern) return true;
  const normalized = word.toLowerCase();
  const escaped = cleanPattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*").replaceAll("?", ".");
  try {
    return new RegExp(`^${escaped}$`).test(normalized);
  } catch {
    return true;
  }
}

function matchesSyllableRange(word: string, filters: Filters) {
  const syllables = estimateSyllables(word);
  const minSyllables = Math.min(filters.minSyllables, filters.maxSyllables);
  const maxSyllables = Math.max(filters.minSyllables, filters.maxSyllables);
  return syllables >= minSyllables && syllables <= maxSyllables;
}

function normalizedLetters(word: string) {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

function reject(reason: FilterRejectReason): FilterEvaluation {
  return { ok: false, reason };
}
