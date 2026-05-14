import safetyMetadata from "../generated/safety-metadata.json";

export const OFFENSIVE_WORDS = new Set(safetyMetadata.offensiveWords);
export const ACRONYM_WORDS = new Set(safetyMetadata.acronymWords);

export function isOffensiveWord(word: string) {
  return OFFENSIVE_WORDS.has(normalizedSafetyWord(word));
}

export function isAcronymLike(word: string) {
  return ACRONYM_WORDS.has(normalizedSafetyWord(word));
}

function normalizedSafetyWord(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}
