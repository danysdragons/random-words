import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "../src/constants";
import { estimateSyllables, evaluateWordEntry, passesEntryFilters } from "../src/services/filterEvaluator";
import { isAcronymLike, isOffensiveWord } from "../src/services/safetyMetadata";
import type { WordEntry } from "../src/types";

function entry(overrides: Partial<WordEntry> = {}): WordEntry {
  const word = overrides.word ?? "harbor";
  return {
    id: 1,
    word,
    length: word.replace(/[^a-z]/gi, "").length,
    pos: "noun",
    alternatePos: [],
    baseForm: word,
    posSource: "override",
    posConfidence: 100,
    commonness: "common",
    source: "scowl",
    score: 100,
    qualityScore: 100,
    frequencyBand: "core",
    isPhrase: false,
    ...overrides,
  };
}

describe("filterEvaluator", () => {
  it("accepts selected alternate POS values", () => {
    const filters = { ...DEFAULT_FILTERS, selectedPos: ["noun"] as const };
    expect(passesEntryFilters(entry({ word: "painting", pos: "verb", alternatePos: ["noun"] }), filters)).toBe(true);
  });

  it("reports rejection reasons for shared text and safety filters", () => {
    expect(evaluateWordEntry(entry({ word: "lagoon" }), { ...DEFAULT_FILTERS, startsWith: "ha" })).toEqual({
      ok: false,
      reason: "starts-with",
    });
    expect(evaluateWordEntry(entry({ word: "pdf" }), DEFAULT_FILTERS)).toEqual({ ok: false, reason: "acronym" });
    expect(evaluateWordEntry(entry({ word: "damn" }), DEFAULT_FILTERS)).toEqual({ ok: false, reason: "offensive" });
    expect(evaluateWordEntry(entry({ word: "two-word", isPhrase: true }), DEFAULT_FILTERS)).toEqual({
      ok: false,
      reason: "phrase-disabled",
    });
  });

  it("applies semantic mode POS restrictions only when requested", () => {
    const filters = { ...DEFAULT_FILTERS, semanticMode: "actions" as const };
    const noun = entry({ word: "anchor", pos: "noun" });

    expect(passesEntryFilters(noun, filters)).toBe(true);
    expect(evaluateWordEntry(noun, filters, { semanticModeRestrictions: true })).toEqual({
      ok: false,
      reason: "semantic-mode-pos",
    });
  });

  it("keeps pattern and syllable behavior centralized", () => {
    expect(passesEntryFilters(entry({ word: "candle" }), { ...DEFAULT_FILTERS, wordPattern: "c*e" })).toBe(true);
    expect(evaluateWordEntry(entry({ word: "candle" }), { ...DEFAULT_FILTERS, wordPattern: "d*e" })).toEqual({
      ok: false,
      reason: "pattern",
    });
    expect(estimateSyllables("harbor")).toBe(2);
  });
});

describe("safety metadata", () => {
  it("uses generated runtime lists for acronyms and offensive words", () => {
    expect(isAcronymLike("PDF")).toBe(true);
    expect(isAcronymLike("p.d.f.")).toBe(true);
    expect(isOffensiveWord("damn")).toBe(true);
    expect(isOffensiveWord("harbor")).toBe(false);
  });
});
