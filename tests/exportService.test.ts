import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "../src/constants";
import { serializeDiagnostics, serializeSets } from "../src/services/exportService";
import type { DiagnosticRow, GeneratedSet, WordEntry } from "../src/types";

const word: WordEntry = {
  id: 1,
  word: "harbor",
  length: 6,
  pos: "noun",
  alternatePos: ["verb"],
  baseForm: "harbor",
  lemma: "harbor",
  familyKey: "harbor",
  syllables: 2,
  posSource: "override",
  posConfidence: 100,
  commonness: "common",
  source: "scowl",
  score: 100,
  qualityScore: 100,
  semanticScore: 60000,
  semanticSource: "local",
  frequencyBand: "core",
  isPhrase: false,
  pinned: true,
  manual: true,
};

const set: GeneratedSet = {
  id: "set-1",
  words: [word],
  theme: "ocean",
  createdAt: "2026-05-14T12:00:00.000Z",
};

describe("exportService", () => {
  it("serializes generated sets as JSON, CSV, and text", () => {
    const filters = { ...DEFAULT_FILTERS, theme: "ocean", semanticMode: "strict" as const, seed: "123" };

    expect(JSON.parse(serializeSets([set], "json", filters))).toMatchObject({
      criteria: { theme: "ocean", semanticMode: "strict", seed: "123" },
      sets: [{ id: "set-1" }],
    });

    const csv = serializeSets([set], "csv", filters);
    expect(csv).toContain("exported_at,set,position,word");
    expect(csv).toContain('"harbor"');
    expect(csv).toContain('"yes","yes"');
    expect(csv).toContain('"strict"');

    const text = serializeSets([set], "txt", filters);
    expect(text).toContain("Theme: ocean");
    expect(text).toContain("Set 1\nharbor [pinned] [manual]");
  });

  it("serializes diagnostics with context and semantic metadata", () => {
    const rows: DiagnosticRow[] = [{ entry: word, setIndex: 0, wordIndex: 0 }];
    const stats = { total: 3, localMatches: 1, datamuseOnly: 2, generatedSemanticWords: 1 };
    const context = { rowFilter: "semantic" as const, query: "har" };

    const payload = JSON.parse(serializeDiagnostics(rows, "json", DEFAULT_FILTERS, stats, context));
    expect(payload).toMatchObject({
      diagnosticsContext: { rowFilter: "semantic", query: "har", rowCount: 1 },
      semanticStats: stats,
      rows: [{ word: "harbor", semanticStrength: "strong semantic match" }],
    });

    const csv = serializeDiagnostics(rows, "csv", DEFAULT_FILTERS, stats, context);
    expect(csv).toContain("exported_at,row_filter,query,set,position,word");
    expect(csv).toContain('"semantic"');
    expect(csv).toContain('"strong semantic match"');
  });
});
