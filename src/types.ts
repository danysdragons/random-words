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
  noContractions: boolean;
  noHyphenated: boolean;
  theme: string;
  semanticMode: SemanticMode;
  includePhrases: boolean;
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
  isPhrase: boolean;
}

export interface GeneratedSet {
  id: string;
  words: WordEntry[];
  theme: string;
  createdAt: string;
}

export interface BuildMeta {
  source: string;
  generatedAt: string;
  records: number;
  sourceEntries: number;
}
