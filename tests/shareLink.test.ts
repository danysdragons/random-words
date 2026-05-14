import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "../src/constants";
import {
  createShareUrl,
  decodeSharePayload,
  encodeSharePayload,
  normalizeSharedFilters,
  readSharedCriteriaFromUrl,
} from "../src/services/shareLink";

describe("shareLink service", () => {
  it("round-trips exported criteria through the URL payload", () => {
    const filters = {
      ...DEFAULT_FILTERS,
      wordsPerSet: 8,
      setCount: 2,
      theme: "clockwork city",
      semanticMode: "evocative" as const,
      qualityMode: "surprising" as const,
      selectedPos: ["noun", "adjective"],
    };

    const encoded = encodeSharePayload(filters);
    const decoded = JSON.parse(decodeSharePayload(encoded));
    const normalized = normalizeSharedFilters(decoded);

    expect(normalized).toMatchObject({
      wordsPerSet: 8,
      setCount: 2,
      theme: "clockwork city",
      semanticMode: "evocative",
      qualityMode: "surprising",
      selectedPos: ["noun", "adjective"],
    });
  });

  it("normalizes malformed shared fields back to safe defaults", () => {
    const normalized = normalizeSharedFilters({
      wordsPerSet: 999,
      setCount: -4,
      selectedPos: ["not-a-pos"],
      semanticMode: "not-a-mode",
      qualityMode: "not-quality",
      duplicateMode: "bad",
      uniqueWords: false,
    });

    expect(normalized).toMatchObject({
      wordsPerSet: 40,
      setCount: 1,
      selectedPos: DEFAULT_FILTERS.selectedPos,
      semanticMode: DEFAULT_FILTERS.semanticMode,
      qualityMode: DEFAULT_FILTERS.qualityMode,
      duplicateMode: "allow",
    });
  });

  it("reads shared criteria from a URL and reports invalid payloads", () => {
    const url = createShareUrl("https://example.com/random-words/?old=1#section", {
      ...DEFAULT_FILTERS,
      theme: "ocean",
    });

    expect(url).toContain("old=1");
    expect(url).not.toContain("#section");
    expect(readSharedCriteriaFromUrl(url)).toMatchObject({
      status: "loaded",
      filters: { theme: "ocean" },
    });
    expect(readSharedCriteriaFromUrl("https://example.com/?criteria=not-valid")).toEqual({ status: "invalid" });
    expect(readSharedCriteriaFromUrl("https://example.com/")).toEqual({ status: "none" });
  });
});
