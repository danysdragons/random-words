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

export type SemanticMode =
  | "strict"
  | "broad"
  | "related"
  | "mood"
  | "evocative"
  | "concrete"
  | "actions"
  | "sensory";

export type QualityMode = "balanced" | "common" | "surprising";

export type DuplicateMode = "allow" | "word" | "family";

export interface Filters {
  wordsPerSet: number;
  setCount: number;
  minLength: number;
  maxLength: number;
  includeRare: boolean;
  qualityMode: QualityMode;
  selectedPos: PartOfSpeech[];
  dialect: Dialect;
  startsWith: string;
  endsWith: string;
  contains: string;
  excludes: string;
  wordPattern: string;
  minSyllables: number;
  maxSyllables: number;
  uniqueWords: boolean;
  duplicateMode: DuplicateMode;
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
  alternatePos: PartOfSpeech[];
  baseForm: string;
  lemma: string;
  familyKey: string;
  syllables: number;
  posSource: "override" | "morphology" | "suffix" | "default" | "datamuse";
  posConfidence: number;
  commonness: "common" | "rare";
  source: "scowl" | "datamuse";
  score: number;
  qualityScore: number;
  semanticScore?: number;
  semanticSource?: "local" | "datamuse";
  frequencyBand: string;
  isPhrase: boolean;
  pinned?: boolean;
  manual?: boolean;
}

export interface GeneratedSet {
  id: string;
  words: WordEntry[];
  theme: string;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  sets: GeneratedSet[];
  filters: Filters;
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

export type AppView = "generator" | "saved" | "collections" | "diagnostics" | "about" | "manual";

export type DiagnosticRowFilter = "all" | "low-confidence" | "semantic" | "datamuse-only" | "fallback";

export interface DiagnosticRow {
  entry: WordEntry;
  setIndex: number;
  wordIndex: number;
}

export interface DiagnosticExportContext {
  rowFilter: DiagnosticRowFilter;
  query: string;
}

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
    posMorphology?: number;
    posLowConfidence?: number;
    posAlternates?: number;
    lemmaEntries?: number;
    familyKeys?: number;
    syllableEntries?: number;
    frequencyCoreWords?: number;
    frequencyFamiliarWords?: number;
    frequencyNichePenalties?: number;
  };
}
