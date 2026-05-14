import { isOffensiveWord } from "./services/safetyMetadata";
import type { Filters, GeneratedSet, WordEntry } from "./types";

export function generateSets(
  basePool: WordEntry[],
  semanticPool: WordEntry[],
  filters: Filters,
  options: { preservedSets?: GeneratedSet[] } = {},
): GeneratedSet[] {
  const seed = numericSeed(filters.seed || String(Date.now()));
  const random = mulberry32(seed);
  const semanticWords = mergeSemantic(basePool, semanticPool);
  const pool = selectPool(basePool, semanticWords, filters);
  const shuffled = weightedShuffle(pool.filter((word) => clientSafe(word, filters)), random, filters);

  const sets: GeneratedSet[] = [];
  const globalUsed = new Set<string>();
  const globalRoots = new Set<string>();
  let cursor = 0;

  for (let setIndex = 0; setIndex < filters.setCount; setIndex += 1) {
    const words = preservedWords(options.preservedSets?.[setIndex], filters.wordsPerSet);
    const localUsed = new Set<string>();
    const localRoots = new Set<string>();

    for (const pinned of words) {
      if (!pinned) continue;
      const root = familyKey(pinned);
      localUsed.add(pinned.word);
      localRoots.add(root);
      globalUsed.add(pinned.word);
      globalRoots.add(root);
    }

    let slot = nextEmptySlot(words);
    while (slot !== -1 && cursor < shuffled.length) {
      const candidate = shuffled[cursor];
      cursor += 1;
      const root = familyKey(candidate);
      if (localUsed.has(candidate.word)) continue;
      if (filters.duplicateMode === "word" && globalUsed.has(candidate.word)) {
        continue;
      }
      if (filters.duplicateMode === "family" && (globalUsed.has(candidate.word) || localRoots.has(root) || globalRoots.has(root))) {
        continue;
      }
      if (!filters.duplicateMode && filters.uniqueWords && (globalUsed.has(candidate.word) || localRoots.has(root) || globalRoots.has(root))) {
        continue;
      }
      words[slot] = candidate;
      localUsed.add(candidate.word);
      localRoots.add(root);
      globalUsed.add(candidate.word);
      globalRoots.add(root);
      slot = nextEmptySlot(words);
    }
    sets.push({
      id: `${seed}-${setIndex}-${Date.now()}`,
      words: words.filter((word): word is WordEntry => Boolean(word)),
      theme: filters.theme.trim(),
      createdAt: new Date().toISOString(),
    });
  }

  return sets;
}

function preservedWords(set: GeneratedSet | undefined, size: number) {
  const words: Array<WordEntry | null> = Array.from({ length: size }, () => null);
  if (!set) return words;
  set.words.slice(0, size).forEach((entry, index) => {
    if (entry.pinned) words[index] = entry;
  });
  return words;
}

function nextEmptySlot(words: Array<WordEntry | null>) {
  return words.findIndex((word) => !word);
}

function selectPool(basePool: WordEntry[], semanticPool: WordEntry[], filters: Filters) {
  if (!filters.theme.trim()) return basePool;
  const semanticCopies = Math.max(1, filters.semanticWeight);
  const weightedSemantic = Array.from({ length: semanticCopies }, () => semanticPool).flat();
  const fallback = filters.fallbackToGeneral ? limitThemedFallback(basePool, semanticPool, filters) : [];
  if (filters.semanticMode === "strict") return semanticPool.length ? semanticPool : fallback;
  if (filters.semanticMode === "related") return [...weightedSemantic, ...weightedSemantic, ...fallback];
  if (filters.semanticMode === "mood" || filters.semanticMode === "evocative") return [...weightedSemantic, ...fallback];
  if (filters.semanticMode === "concrete" || filters.semanticMode === "actions" || filters.semanticMode === "sensory") {
    return [...weightedSemantic, ...weightedSemantic, ...fallback];
  }
  return [...weightedSemantic, ...fallback, ...fallback];
}

function limitThemedFallback(basePool: WordEntry[], semanticPool: WordEntry[], filters: Filters) {
  if (!semanticPool.length) return basePool;
  const requestedWords = filters.wordsPerSet * filters.setCount;
  const fallbackLimit = Math.max(requestedWords * 2, semanticPool.length * 8);
  return basePool.slice(0, fallbackLimit);
}

function mergeSemantic(basePool: WordEntry[], semanticPool: WordEntry[]) {
  if (!semanticPool.length) return [];
  const baseByWord = new Map(basePool.map((entry) => [entry.word, entry]));
  return semanticPool.map((entry) => {
    const localEntry = baseByWord.get(entry.word);
    const semanticScore = entry.semanticScore ?? entry.score;
    if (!localEntry) {
      return {
        ...entry,
        semanticScore,
        semanticSource: "datamuse" as const,
      };
    }
    return {
      ...localEntry,
      qualityScore: Math.max(
        localEntry.qualityScore,
        Math.round(localEntry.qualityScore * 0.7 + entry.qualityScore * 0.3),
      ),
      semanticScore,
      semanticSource: "local" as const,
    };
  });
}

function clientSafe(entry: WordEntry, filters: Filters) {
  if (filters.excludeOffensive && isOffensiveWord(entry.word)) return false;
  return true;
}

export function numericSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedShuffle(items: WordEntry[], random: () => number, filters: Filters) {
  return items
    .map((item) => {
      const weight = qualityWeight(item, filters);
      return {
        item,
        rank: Math.log(Math.max(Number.EPSILON, random())) / weight,
      };
    })
    .sort((a, b) => b.rank - a.rank)
    .map(({ item }) => item);
}

function qualityWeight(item: WordEntry, filters: Filters) {
  const rawWeight = Math.max(1, item.qualityScore || item.score || 1);
  const semanticBoost =
    filters.theme.trim() && item.semanticScore
      ? 1 + Math.min(0.75, Math.log10(item.semanticScore + 1) / 10)
      : 1;
  if (filters.qualityMode === "common") {
    return (filters.includeRare ? rawWeight * 1.35 : rawWeight * rawWeight) * semanticBoost;
  }
  if (filters.qualityMode === "surprising") {
    return (filters.includeRare ? Math.max(1, Math.sqrt(rawWeight)) : Math.max(1, rawWeight ** 0.7)) * semanticBoost;
  }
  return (filters.includeRare ? Math.sqrt(rawWeight) * 10 : rawWeight) * semanticBoost;
}

function familyKey(entry: WordEntry) {
  if (entry.familyKey) return entry.familyKey;
  if (entry.lemma) return entry.lemma.toLowerCase().replace(/[^a-z]/g, "");
  const normalized = entry.word.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.length < 5) return normalized;
  if (normalized.endsWith("ing") && normalized.length > 6) return normalized.slice(0, -3);
  if (normalized.endsWith("ed") && normalized.length > 5) return normalized.slice(0, -2);
  if (normalized.endsWith("es") && normalized.length > 5) return normalized.slice(0, -2);
  if (normalized.endsWith("s") && normalized.length > 5) return normalized.slice(0, -1);
  return normalized;
}
