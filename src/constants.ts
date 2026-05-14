import type { Dialect, DuplicateMode, Filters, PartOfSpeech, QualityMode, SemanticMode } from "./types";

export const POS_OPTIONS: PartOfSpeech[] = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "other",
];

export const DEFAULT_FILTERS: Filters = {
  wordsPerSet: 12,
  setCount: 3,
  minLength: 2,
  maxLength: 12,
  includeRare: false,
  qualityMode: "balanced",
  selectedPos: ["noun", "verb", "adjective"],
  dialect: "us",
  startsWith: "",
  endsWith: "",
  contains: "",
  excludes: "",
  wordPattern: "",
  minSyllables: 1,
  maxSyllables: 8,
  uniqueWords: true,
  duplicateMode: "family",
  excludeOffensive: true,
  noProperNouns: true,
  noAcronyms: true,
  noContractions: true,
  noHyphenated: true,
  theme: "",
  semanticMode: "broad",
  includePhrases: false,
  semanticLimit: 600,
  semanticWeight: 2,
  fallbackToGeneral: true,
  useSeededGeneration: false,
  seed: "728391",
};

export const APP_VERSION = "1.0.0";

export type UiTheme =
  | "system"
  | "light"
  | "dark"
  | "high-contrast"
  | "ink"
  | "forest"
  | "ocean"
  | "sunrise"
  | "solar-light"
  | "solar-dark";

export type ResolvedUiTheme = Exclude<UiTheme, "system">;

export interface DisplaySettings {
  showWordDetails: boolean;
  uiTheme: UiTheme;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  showWordDetails: false,
  uiTheme: "system",
};

export const UI_THEME_LABELS: Record<UiTheme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
  "high-contrast": "High Contrast",
  ink: "Ink",
  forest: "Forest",
  ocean: "Ocean",
  sunrise: "Sunrise",
  "solar-light": "Solar Light",
  "solar-dark": "Solar Dark",
};

export const DIALECT_LABELS: Record<Dialect, string> = {
  us: "American English",
  gb: "British English",
  ca: "Canadian English",
  au: "Australian English",
};

export const MODE_LABELS: Record<SemanticMode, string> = {
  strict: "Strict category",
  broad: "Broad theme",
  related: "Related concepts",
  mood: "Mood / tone",
  evocative: "Evocative",
  concrete: "Concrete objects",
  actions: "Actions & motion",
  sensory: "Sensory",
};

export const QUALITY_LABELS: Record<QualityMode, string> = {
  balanced: "Balanced",
  common: "Common first",
  surprising: "More surprising",
};

export const DUPLICATE_LABELS: Record<DuplicateMode, string> = {
  allow: "Allow repeats",
  word: "Unique words",
  family: "Unique families",
};

export function uiThemeValue(value: unknown): UiTheme {
  return typeof value === "string" && value in UI_THEME_LABELS ? (value as UiTheme) : DEFAULT_DISPLAY_SETTINGS.uiTheme;
}

export function resolveUiTheme(theme: UiTheme, systemPrefersDark: boolean): ResolvedUiTheme {
  if (theme === "system") return systemPrefersDark ? "dark" : "light";
  return theme;
}
