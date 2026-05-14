import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FILTERS } from "../src/constants";
import { fetchDefinitions, fetchSemanticWords } from "../src/datamuse";
import type { WordEntry } from "../src/types";

const CACHE_KEY = "random-words:datamuse-cache:v5";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

function cachedEntry(word: string): WordEntry {
  return {
    id: -1,
    word,
    length: word.length,
    pos: "noun",
    alternatePos: [],
    baseForm: word,
    lemma: word,
    familyKey: word,
    syllables: 2,
    posSource: "datamuse",
    posConfidence: 85,
    commonness: "common",
    source: "datamuse",
    score: 10000,
    qualityScore: 82,
    semanticScore: 10000,
    semanticSource: "datamuse",
    frequencyBand: "semantic",
    isPhrase: false,
  };
}

describe("fetchSemanticWords", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: new MemoryStorage(),
    });
    vi.restoreAllMocks();
  });

  it("returns and caches live Datamuse results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ word: "harbor", score: 60000, tags: ["n"] }],
      }),
    );

    const result = await fetchSemanticWords({ ...DEFAULT_FILTERS, theme: "ocean" });

    expect(result.source).toBe("live");
    expect(result.warning).toBeUndefined();
    expect(result.words.map((entry) => entry.word)).toEqual(["harbor"]);
    expect(JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}")).toHaveProperty("ocean|broad|words|600");
  });

  it("falls back to cached semantic entries when Datamuse is unavailable", async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        "ocean|broad|words|200": [cachedEntry("lagoon")],
      }),
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await fetchSemanticWords({ ...DEFAULT_FILTERS, theme: "ocean", semanticLimit: 600 });

    expect(result.source).toBe("stale-cache");
    expect(result.warning).toContain("cached theme matches");
    expect(result.words.map((entry) => entry.word)).toEqual(["lagoon"]);
  });

  it("returns local-only fallback metadata when no semantic cache is available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await fetchSemanticWords({ ...DEFAULT_FILTERS, theme: "ocean" });

    expect(result).toEqual({
      words: [],
      source: "fallback",
      warning: "Datamuse is unavailable, so this generation used the local word database only.",
    });
  });
});

describe("fetchDefinitions", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: new MemoryStorage(),
    });
    vi.restoreAllMocks();
  });

  it("falls back from inflected words to lemma definitions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ word: "hugged", defs: [] }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ word: "hug", defHeadword: "hug", defs: ["n\tA close embrace."] }],
      });
    vi.stubGlobal("fetch", fetchMock);

    const definitions = await fetchDefinitions([
      {
        ...cachedEntry("hugged"),
        pos: "verb",
        baseForm: "hug",
        lemma: "hug",
        familyKey: "hug",
        posSource: "morphology",
      },
    ]);

    expect(definitions.hugged).toBe("hug: A close embrace.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses an alternate POS definition instead of showing no definition", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ word: "bright", defs: ["n\tA vivid color.", "v\tTo shine."] }],
      }),
    );

    const definitions = await fetchDefinitions([{ ...cachedEntry("bright"), pos: "adjective" }]);

    expect(definitions.bright).toBe("A vivid color.");
  });
});
