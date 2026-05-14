import { POS_OPTIONS } from "../constants";
import type { Collection, GeneratedSet, PartOfSpeech, SavedSet, WordEntry } from "../types";
import { estimateSyllables } from "./filterEvaluator";
import {
  arrayValue,
  boundedNumber,
  createId,
  isPlainObject,
  optionalNumber,
  parseDateString,
  stringValue,
} from "./valueUtils";

export function serializeSavedWorkspace(savedSets: SavedSet[], collections: Collection[]) {
  return JSON.stringify(
    {
      app: "random-words",
      version: 1,
      exportedAt: new Date().toISOString(),
      collections,
      savedSets,
    },
    null,
    2,
  );
}

export function parseSavedWorkspace(text: string) {
  const payload = JSON.parse(text) as unknown;
  if (!isPlainObject(payload)) throw new Error("Import file is not a valid Random Words library.");
  const collections = arrayValue(payload.collections)
    .map(normalizeImportedCollection)
    .filter((collection): collection is Collection => Boolean(collection));
  const savedSets = arrayValue(payload.savedSets)
    .map(normalizeImportedSavedSet)
    .filter((saved): saved is SavedSet => Boolean(saved));
  if (!collections.length && !savedSets.length) {
    throw new Error("Import file did not contain saved sets or collections.");
  }
  return { collections, savedSets };
}

export function mergeById<T extends { id: string }>(current: T[], imported: T[]) {
  const existing = new Set(current.map((item) => item.id));
  return [...current, ...imported.filter((item) => !existing.has(item.id))];
}

function normalizeImportedCollection(value: unknown): Collection | null {
  if (!isPlainObject(value)) return null;
  const id = stringValue(value.id).trim() || createId("collection");
  const name = stringValue(value.name).trim();
  if (!name) return null;
  return {
    id,
    name,
    createdAt: parseDateString(value.createdAt) ?? new Date().toISOString(),
  };
}

function normalizeImportedSavedSet(value: unknown): SavedSet | null {
  if (!isPlainObject(value)) return null;
  const set = normalizeImportedGeneratedSet(value.set);
  if (!set) return null;
  return {
    id: stringValue(value.id).trim() || createId("saved"),
    name: stringValue(value.name).trim() || `${set.theme || "Imported"} Set`,
    set,
    savedAt: parseDateString(value.savedAt) ?? new Date().toISOString(),
    collectionId: stringValue(value.collectionId).trim() || null,
  };
}

function normalizeImportedGeneratedSet(value: unknown): GeneratedSet | null {
  if (!isPlainObject(value)) return null;
  const words = arrayValue(value.words)
    .map(normalizeImportedWordEntry)
    .filter((entry): entry is WordEntry => Boolean(entry));
  if (!words.length) return null;
  return {
    id: stringValue(value.id).trim() || createId("set"),
    words,
    theme: stringValue(value.theme),
    createdAt: parseDateString(value.createdAt) ?? new Date().toISOString(),
  };
}

function normalizeImportedWordEntry(value: unknown): WordEntry | null {
  if (!isPlainObject(value)) return null;
  const word = stringValue(value.word).trim().toLowerCase();
  if (!word) return null;
  const pos = POS_OPTIONS.includes(value.pos as PartOfSpeech) ? (value.pos as PartOfSpeech) : "other";
  return {
    id: boundedNumber(value.id, -Date.now(), Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
    word,
    length: boundedNumber(value.length, word.replace(/[^a-z]/g, "").length, 0, 100),
    pos,
    alternatePos: importedPosList(value.alternatePos),
    baseForm: stringValue(value.baseForm).trim() || word,
    lemma: stringValue(value.lemma).trim() || stringValue(value.baseForm).trim() || word,
    familyKey: stringValue(value.familyKey).trim() || familyKeyValue(stringValue(value.lemma).trim() || stringValue(value.baseForm).trim() || word),
    syllables: boundedNumber(value.syllables, estimateSyllables(word), 1, 24),
    posSource: posSourceValue(value.posSource),
    posConfidence: boundedNumber(value.posConfidence, 30, 0, 100),
    commonness: value.commonness === "rare" ? "rare" : "common",
    source: value.source === "datamuse" ? "datamuse" : "scowl",
    score: boundedNumber(value.score, 0, 0, Number.MAX_SAFE_INTEGER),
    qualityScore: boundedNumber(value.qualityScore, 1, 0, 100),
    semanticScore: optionalNumber(value.semanticScore),
    semanticSource: value.semanticSource === "datamuse" ? "datamuse" : value.semanticSource === "local" ? "local" : undefined,
    frequencyBand: stringValue(value.frequencyBand).trim() || "imported",
    isPhrase: Boolean(value.isPhrase),
    pinned: Boolean(value.pinned),
    manual: Boolean(value.manual),
  };
}

function familyKeyValue(word: string) {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.length < 5) return normalized;
  if (normalized.endsWith("ing") && normalized.length > 6) return normalized.slice(0, -3);
  if (normalized.endsWith("ed") && normalized.length > 5) return normalized.slice(0, -2);
  if (normalized.endsWith("es") && normalized.length > 5) return normalized.slice(0, -2);
  if (normalized.endsWith("s") && normalized.length > 5) return normalized.slice(0, -1);
  return normalized;
}

function importedPosList(value: unknown): PartOfSpeech[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PartOfSpeech => POS_OPTIONS.includes(item as PartOfSpeech));
}

function posSourceValue(value: unknown): WordEntry["posSource"] {
  if (value === "override" || value === "morphology" || value === "suffix" || value === "default" || value === "datamuse") {
    return value;
  }
  return "default";
}
