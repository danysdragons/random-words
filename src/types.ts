export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "preposition"
  | "conjunction"
  | "interjection"
  | "other";

export type Dialect = "us" | "gb" | "ca" | "au";

export type SemanticMode = "strict" | "broad" | "related" | "mood";

export interface Filters {
  wordsPerSet: number;
  setCount: number;
  minLength: number;
  maxLength: number;
  includeRare: boolean;
  selectedPos: PartOfSpeech[];
  dialect: Dialect;
  startsWith: string;
  endsWith: string;
  contains: string;
  excludes: string;
  uniqueWords: boolean;
  excludeOffensive: boolean;
  noProperNouns: boolean;
  noAcronyms: boolean;
  noContractions: boolean;
  noHyphenated: boolean;
  theme: string;
  semanticMode: SemanticMode;
  includePhrases: boolean;
  semanticLimit: number;
  semanticWeight: number;
  fallbackToGeneral: boolean;
  useSeededGeneration: boolean;
  seed: string;
}

export interface WordEntry {
  id: number;
  word: string;
  length: number;
  pos: PartOfSpeech;
  commonness: "common" | "rare";
  source: "scowl" | "datamuse";
  score: number;
  qualityScore: number;
  frequencyBand: string;
  isPhrase: boolean;
}

export interface GeneratedSet {
  id: string;
  words: WordEntry[];
  theme: string;
  createdAt: string;
}

export interface SavedSet {
  id: string;
  name: string;
  set: GeneratedSet;
  savedAt: string;
  collectionId: string | null;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: string;
}

export type ExportFormat = "json" | "csv" | "txt";

export type AppView = "generator" | "saved" | "collections" | "about";

export interface BuildMeta {
  source: string;
  generatedAt: string;
  records: number;
  sourceEntries: number;
  quality?: {
    posOverrides: number;
    properNounHints: number;
    offensiveHints: number;
    acronymHints?: number;
    frequencyCoreWords?: number;
    frequencyFamiliarWords?: number;
    frequencyNichePenalties?: number;
  };
}
