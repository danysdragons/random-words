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
  const shuffled = shuffle(pool.filter((word) => clientSafe(word, filters)), random);

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
  if (filters.semanticMode === "strict") return semanticPool.length ? semanticPool : basePool;
  if (filters.semanticMode === "related") return [...semanticPool, ...semanticPool, ...basePool];
  if (filters.semanticMode === "mood") return [...semanticPool, ...basePool];
  return [...semanticPool, ...semanticPool, ...basePool, ...basePool];
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

function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
