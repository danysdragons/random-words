import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "../src/constants";
import { generateSets } from "../src/generator";
import type { GeneratedSet, WordEntry } from "../src/types";

function entry(word: string, qualityScore = 50): WordEntry {
  return {
    id: word.charCodeAt(0),
    word,
    length: word.length,
    pos: "noun",
    alternatePos: [],
    baseForm: word,
    posSource: "override",
    posConfidence: 100,
    commonness: "common",
    source: "scowl",
    score: qualityScore,
    qualityScore,
    frequencyBand: "core",
    isPhrase: false,
  };
}

describe("generateSets", () => {
  it("is deterministic for a fixed seed", () => {
    const filters = { ...DEFAULT_FILTERS, setCount: 2, wordsPerSet: 3, seed: "fixed" };
    const pool = ["harbor", "reef", "tide", "current", "lagoon", "anchor", "brine", "shore"].map(entry);

    const first = generateSets(pool, [], filters).map((set) => set.words.map((word) => word.word));
    const second = generateSets(pool, [], filters).map((set) => set.words.map((word) => word.word));

    expect(second).toEqual(first);
  });

  it("preserves pinned words in their positions while regenerating empty slots", () => {
    const filters = { ...DEFAULT_FILTERS, setCount: 1, wordsPerSet: 4, seed: "pins" };
    const pool = ["harbor", "reef", "tide", "current", "lagoon", "anchor"].map(entry);
    const preserved: GeneratedSet = {
      id: "set-1",
      theme: "",
      createdAt: "2026-05-14T12:00:00.000Z",
      words: [entry("first"), { ...entry("locked"), pinned: true }, entry("third"), { ...entry("fixed"), pinned: true }],
    };

    const [set] = generateSets(pool, [], filters, { preservedSets: [preserved] });

    expect(set.words[1]).toMatchObject({ word: "locked", pinned: true });
    expect(set.words[3]).toMatchObject({ word: "fixed", pinned: true });
    expect(set.words).toHaveLength(4);
  });

  it("keeps manual pinned words even when they are not present in the source pool", () => {
    const filters = { ...DEFAULT_FILTERS, setCount: 1, wordsPerSet: 2, seed: "manual" };
    const preserved: GeneratedSet = {
      id: "set-1",
      theme: "",
      createdAt: "2026-05-14T12:00:00.000Z",
      words: [{ ...entry("customword"), pinned: true, manual: true }],
    };

    const [set] = generateSets([entry("harbor"), entry("reef")], [], filters, { preservedSets: [preserved] });

    expect(set.words[0]).toMatchObject({ word: "customword", pinned: true, manual: true });
  });
});
