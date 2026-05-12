import type { Filters, GeneratedSet, WordEntry } from "./types";

const OFFENSIVE_WORDS = new Set(["damn", "hell", "crap"]);

export function generateSets(
  basePool: WordEntry[],
  semanticPool: WordEntry[],
  filters: Filters,
): GeneratedSet[] {
  const seed = numericSeed(filters.seed || String(Date.now()));
  const random = mulberry32(seed);
  const semanticWords = mergeSemantic(basePool, semanticPool);
  const pool = selectPool(basePool, semanticWords, filters);
  const shuffled = weightedShuffle(pool.filter((word) => clientSafe(word, filters)), random, filters);

  const sets: GeneratedSet[] = [];
  const globalUsed = new Set<string>();
  let cursor = 0;

  for (let setIndex = 0; setIndex < filters.setCount; setIndex += 1) {
    const words: WordEntry[] = [];
    const localUsed = new Set<string>();
    while (words.length < filters.wordsPerSet && cursor < shuffled.length) {
      const candidate = shuffled[cursor];
      cursor += 1;
      if (localUsed.has(candidate.word)) continue;
      if (filters.uniqueWords && globalUsed.has(candidate.word)) continue;
      words.push(candidate);
      localUsed.add(candidate.word);
      globalUsed.add(candidate.word);
    }
    sets.push({
      id: `${seed}-${setIndex}-${Date.now()}`,
      words,
      theme: filters.theme.trim(),
      createdAt: new Date().toISOString(),
    });
  }

  return sets;
}

function selectPool(basePool: WordEntry[], semanticPool: WordEntry[], filters: Filters) {
  if (!filters.theme.trim()) return basePool;
  const semanticCopies = Math.max(1, filters.semanticWeight);
  const weightedSemantic = Array.from({ length: semanticCopies }, () => semanticPool).flat();
  const fallback = filters.fallbackToGeneral ? basePool : [];
  if (filters.semanticMode === "strict") return semanticPool.length ? semanticPool : fallback;
  if (filters.semanticMode === "related") return [...weightedSemantic, ...weightedSemantic, ...fallback];
  if (filters.semanticMode === "mood") return [...weightedSemantic, ...fallback];
  return [...weightedSemantic, ...fallback, ...fallback];
}

function mergeSemantic(basePool: WordEntry[], semanticPool: WordEntry[]) {
  if (!semanticPool.length) return [];
  const baseByWord = new Map(basePool.map((entry) => [entry.word, entry]));
  return semanticPool.map((entry) => baseByWord.get(entry.word) ?? entry);
}

function clientSafe(entry: WordEntry, filters: Filters) {
  if (filters.excludeOffensive && OFFENSIVE_WORDS.has(entry.word)) return false;
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
      const rawWeight = Math.max(1, item.qualityScore || item.score || 1);
      const weight = filters.includeRare ? Math.sqrt(rawWeight) * 10 : rawWeight;
      return {
        item,
        rank: Math.log(Math.max(Number.EPSILON, random())) / weight,
      };
    })
    .sort((a, b) => b.rank - a.rank)
    .map(({ item }) => item);
}
