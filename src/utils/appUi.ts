import type { Filters, GeneratedSet, PartOfSpeech, WordEntry } from "../types";

export function posLabel(pos: PartOfSpeech) {
  return pos.replace(/^\w/, (letter) => letter.toUpperCase());
}

export function posShort(pos: PartOfSpeech) {
  return {
    noun: "N",
    verb: "V",
    adjective: "Adj",
    adverb: "Adv",
    pronoun: "Pro",
    preposition: "Prep",
    conjunction: "Conj",
    interjection: "Int",
    other: "Other",
  }[pos];
}

export function posSourceLabel(source: WordEntry["posSource"]) {
  return {
    override: "Curated",
    morphology: "Morphology",
    suffix: "Suffix",
    default: "Default",
    datamuse: "Datamuse",
  }[source];
}

export function semanticStrengthLabel(score: number) {
  if (score >= 50000) return "very strong";
  if (score >= 10000) return "strong";
  if (score >= 2000) return "moderate";
  return "light";
}

export function definitionFallback(entry: WordEntry) {
  return `No definition is available for ${entry.word} as ${indefiniteArticle(posLabel(entry.pos))} ${posLabel(entry.pos).toLowerCase()}.`;
}

function indefiniteArticle(value: string) {
  return /^[aeiou]/i.test(value) ? "an" : "a";
}

export function getGenerationWarnings(
  filters: Filters,
  sets: GeneratedSet[],
  basePoolSize: number,
  semanticStats: {
    total: number;
    localMatches: number;
    datamuseOnly: number;
    generatedSemanticWords: number;
  },
) {
  const warnings: string[] = [];
  const requestedWords = filters.wordsPerSet * filters.setCount;
  const generatedWords = sets.reduce((total, set) => total + set.words.length, 0);

  if (basePoolSize > 0 && basePoolSize < requestedWords * 2) {
    warnings.push("The filtered local pool is very small for the requested output. Loosen filters or reduce set size for more variety.");
  }

  if (sets.length > 0 && generatedWords < requestedWords) {
    warnings.push("Generated output is smaller than requested because the active filters left too few eligible words.");
  }

  if (filters.theme.trim() && semanticStats.total === 0) {
    warnings.push("No semantic matches were available for the current theme and filters. Results may come entirely from the general pool.");
  } else if (filters.theme.trim() && generatedWords > 0 && semanticStats.generatedSemanticWords === 0) {
    warnings.push("The current themed output used general fallback words only. Increase theme expansion, enable phrases, or loosen filters.");
  } else if (filters.theme.trim() && generatedWords > 0 && semanticStats.generatedSemanticWords < Math.ceil(generatedWords * 0.25)) {
    warnings.push("Only a small share of the output came from semantic matches. Increase theme strength or use Strict category for more focused results.");
  }

  if (filters.theme.trim() && !filters.fallbackToGeneral && semanticStats.total < requestedWords) {
    warnings.push("Fallback to the general pool is off, and the semantic pool is smaller than the requested output.");
  }

  return warnings;
}

export function normalizeTheme(value: string) {
  return value.trim().toLowerCase().replaceAll("&", "and").replace(/\s+/g, " ");
}

export async function copyWords(words: WordEntry[], setToast: (message: string) => void) {
  const text = words.map((item) => item.word).join(", ");
  try {
    await navigator.clipboard?.writeText(text);
    setToast("Copied words to clipboard");
  } catch {
    setToast("Clipboard permission was denied");
  }
}

export function prepareGenerationFilters(filters: Filters): Filters {
  if (filters.useSeededGeneration) return filters;
  return {
    ...filters,
    seed: createRandomSeed(),
  };
}

export function createRandomSeed() {
  return String(Math.floor(100000000 + Math.random() * 900000000));
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
