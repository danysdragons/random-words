import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const QUALITY_DATA = JSON.parse(readFileSync(resolve("data/quality/word-quality.json"), "utf8"));
const OUT_FILE = resolve("src/generated/safety-metadata.json");

function normalizeWord(word) {
  return String(word)
    .trim()
    .replaceAll("’", "'")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizedList(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(normalizeWord).filter(Boolean))].sort();
}

const payload = {
  source: "data/quality/word-quality.json",
  offensiveWords: normalizedList(QUALITY_DATA.offensiveWords),
  acronymWords: normalizedList(QUALITY_DATA.acronymWords),
};

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${OUT_FILE}.`);
