import { describe, expect, it } from "vitest";
import { mergeById, parseSavedWorkspace, serializeSavedWorkspace } from "../src/services/importService";
import type { Collection, SavedSet, WordEntry } from "../src/types";

const entry: WordEntry = {
  id: 1,
  word: "Lagoon",
  length: 99,
  pos: "noun",
  alternatePos: ["verb"],
  baseForm: "",
  lemma: "",
  familyKey: "",
  syllables: 2,
  posSource: "override",
  posConfidence: 100,
  commonness: "common",
  source: "scowl",
  score: 80,
  qualityScore: 90,
  frequencyBand: "core",
  isPhrase: false,
  pinned: true,
  manual: true,
};

const collection: Collection = {
  id: "collection-1",
  name: "Worldbuilding",
  createdAt: "2026-05-14T12:00:00.000Z",
};

const savedSet: SavedSet = {
  id: "saved-1",
  name: "Ocean Set",
  set: {
    id: "set-1",
    words: [entry],
    theme: "ocean",
    createdAt: "2026-05-14T12:00:00.000Z",
  },
  savedAt: "2026-05-14T12:01:00.000Z",
  collectionId: "collection-1",
};

describe("importService", () => {
  it("serializes and parses saved workspaces", () => {
    const parsed = parseSavedWorkspace(serializeSavedWorkspace([savedSet], [collection]));

    expect(parsed.collections).toEqual([collection]);
    expect(parsed.savedSets[0]).toMatchObject({
      id: "saved-1",
      name: "Ocean Set",
      set: {
        theme: "ocean",
        words: [
          {
            word: "lagoon",
            length: 99,
            baseForm: "lagoon",
            lemma: "lagoon",
            familyKey: "lagoon",
            syllables: 2,
            alternatePos: ["verb"],
            pinned: true,
            manual: true,
          },
        ],
      },
    });
  });

  it("rejects malformed or empty workspaces", () => {
    expect(() => parseSavedWorkspace("{}")).toThrow("saved sets or collections");
    expect(() => parseSavedWorkspace("[]")).toThrow("valid Random Words library");
  });

  it("merges imported records without duplicating existing ids", () => {
    expect(mergeById([{ id: "a", value: 1 }], [{ id: "a", value: 2 }, { id: "b", value: 3 }])).toEqual([
      { id: "a", value: 1 },
      { id: "b", value: 3 },
    ]);
  });
});
