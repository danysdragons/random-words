import { DEFAULT_FILTERS, MODE_LABELS, POS_OPTIONS, QUALITY_LABELS } from "../constants";
import type { Dialect, DuplicateMode, Filters, PartOfSpeech, QualityMode, SemanticMode } from "../types";
import { booleanValue, boundedNumber, isPlainObject, stringValue } from "./valueUtils";

export type SharedCriteriaResult =
  | { status: "none" }
  | { status: "invalid" }
  | { status: "loaded"; filters: Filters; summary: string };

export function createShareUrl(currentHref: string, filters: Filters) {
  const url = new URL(currentHref);
  url.hash = "";
  url.searchParams.set("criteria", encodeSharePayload(filters));
  return url.href;
}

export function readSharedCriteriaFromUrl(currentHref: string): SharedCriteriaResult {
  const encoded = new URL(currentHref).searchParams.get("criteria");
  if (!encoded) return { status: "none" };
  try {
    const payload = JSON.parse(decodeSharePayload(encoded)) as unknown;
    const filters = normalizeSharedFilters(payload);
    if (!filters) return { status: "invalid" };
    return { status: "loaded", filters, summary: summarizeSharedCriteria(filters) };
  } catch {
    return { status: "invalid" };
  }
}

export function encodeSharePayload(filters: Filters) {
  const json = JSON.stringify(exportCriteria(filters));
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeSharePayload(encoded: string) {
  const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function normalizeSharedFilters(payload: unknown): Filters | null {
  if (!isPlainObject(payload)) return null;
  return {
    ...DEFAULT_FILTERS,
    wordsPerSet: boundedNumber(payload.wordsPerSet, DEFAULT_FILTERS.wordsPerSet, 1, 40),
    setCount: boundedNumber(payload.setCount, DEFAULT_FILTERS.setCount, 1, 8),
    minLength: boundedNumber(payload.minLength, DEFAULT_FILTERS.minLength, 1, 30),
    maxLength: boundedNumber(payload.maxLength, DEFAULT_FILTERS.maxLength, 1, 30),
    includeRare: booleanValue(payload.includeRare, DEFAULT_FILTERS.includeRare),
    qualityMode: qualityModeValue(payload.qualityMode),
    selectedPos: posList(payload.selectedPos),
    dialect: dialectValue(payload.dialect),
    startsWith: stringValue(payload.startsWith),
    endsWith: stringValue(payload.endsWith),
    contains: stringValue(payload.contains),
    excludes: stringValue(payload.excludes),
    wordPattern: stringValue(payload.wordPattern),
    minSyllables: boundedNumber(payload.minSyllables, DEFAULT_FILTERS.minSyllables, 1, 8),
    maxSyllables: boundedNumber(payload.maxSyllables, DEFAULT_FILTERS.maxSyllables, 1, 8),
    uniqueWords: booleanValue(payload.uniqueWords, DEFAULT_FILTERS.uniqueWords),
    duplicateMode: duplicateModeValue(payload.duplicateMode, booleanValue(payload.uniqueWords, DEFAULT_FILTERS.uniqueWords)),
    excludeOffensive: booleanValue(payload.excludeOffensive, DEFAULT_FILTERS.excludeOffensive),
    noProperNouns: booleanValue(payload.noProperNouns, DEFAULT_FILTERS.noProperNouns),
    noAcronyms: booleanValue(payload.noAcronyms, DEFAULT_FILTERS.noAcronyms),
    noContractions: booleanValue(payload.noContractions, DEFAULT_FILTERS.noContractions),
    noHyphenated: booleanValue(payload.noHyphenated, DEFAULT_FILTERS.noHyphenated),
    theme: stringValue(payload.theme),
    semanticMode: semanticModeValue(payload.semanticMode),
    includePhrases: booleanValue(payload.includePhrases, DEFAULT_FILTERS.includePhrases),
    semanticLimit: boundedNumber(payload.semanticLimit, DEFAULT_FILTERS.semanticLimit, 100, 1000),
    semanticWeight: boundedNumber(payload.semanticWeight, DEFAULT_FILTERS.semanticWeight, 1, 5),
    fallbackToGeneral: booleanValue(payload.fallbackToGeneral, DEFAULT_FILTERS.fallbackToGeneral),
    useSeededGeneration: booleanValue(payload.useSeededGeneration, DEFAULT_FILTERS.useSeededGeneration),
    seed: stringValue(payload.seed) || DEFAULT_FILTERS.seed,
  };
}

export function summarizeSharedCriteria(filters: Filters) {
  const parts = [
    `${filters.setCount} set${filters.setCount === 1 ? "" : "s"}`,
    `${filters.wordsPerSet} word${filters.wordsPerSet === 1 ? "" : "s"} each`,
  ];
  if (filters.theme.trim()) parts.push(`theme "${filters.theme.trim()}"`);
  if (filters.semanticMode !== DEFAULT_FILTERS.semanticMode) parts.push(MODE_LABELS[filters.semanticMode]);
  if (filters.qualityMode !== DEFAULT_FILTERS.qualityMode) parts.push(QUALITY_LABELS[filters.qualityMode]);
  return parts.join(", ");
}

export function exportCriteria(filters: Filters): Filters {
  return {
    ...filters,
    selectedPos: filters.selectedPos.filter((pos) => POS_OPTIONS.includes(pos)),
  };
}

function posList(value: unknown): PartOfSpeech[] {
  if (!Array.isArray(value)) return DEFAULT_FILTERS.selectedPos;
  const selected = value.filter((item): item is PartOfSpeech => POS_OPTIONS.includes(item as PartOfSpeech));
  return selected.length ? selected : DEFAULT_FILTERS.selectedPos;
}

function dialectValue(value: unknown): Dialect {
  return value === "us" || value === "gb" || value === "ca" || value === "au" ? value : DEFAULT_FILTERS.dialect;
}

function semanticModeValue(value: unknown): SemanticMode {
  return value === "strict" ||
    value === "broad" ||
    value === "related" ||
    value === "mood" ||
    value === "evocative" ||
    value === "concrete" ||
    value === "actions" ||
    value === "sensory"
    ? value
    : DEFAULT_FILTERS.semanticMode;
}

function qualityModeValue(value: unknown): QualityMode {
  return value === "balanced" || value === "common" || value === "surprising"
    ? value
    : DEFAULT_FILTERS.qualityMode;
}

function duplicateModeValue(value: unknown, uniqueWords: boolean): DuplicateMode {
  if (value === "allow" || value === "word" || value === "family") return value;
  return uniqueWords ? DEFAULT_FILTERS.duplicateMode : "allow";
}
