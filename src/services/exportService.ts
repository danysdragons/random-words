import { DUPLICATE_LABELS, QUALITY_LABELS } from "../constants";
import type { DiagnosticExportContext, DiagnosticRow, ExportFormat, Filters, GeneratedSet, PartOfSpeech, WordEntry } from "../types";
import { exportCriteria } from "./shareLink";

export function serializeSets(sets: GeneratedSet[], format: ExportFormat, filters: Filters) {
  const exportedAt = new Date().toISOString();
  const criteria = exportCriteria(filters);
  if (format === "json") return JSON.stringify({ exportedAt, criteria, sets }, null, 2);
  if (format === "csv") {
    return [
      "exported_at,set,position,word,part_of_speech,alternate_pos,frequency_band,quality_score,source,semantic_score,semantic_source,pinned,manual,set_theme,criteria_theme,semantic_mode,quality_mode,seed_mode,seed",
      ...sets.flatMap((set, setIndex) =>
        set.words.map((entry, wordIndex) =>
          [
            exportedAt,
            setIndex + 1,
            wordIndex + 1,
            entry.word,
            entry.pos,
            entry.alternatePos?.join("|") ?? "",
            entry.frequencyBand,
            entry.qualityScore,
            entry.source,
            entry.semanticScore ?? "",
            entry.semanticSource ?? "",
            entry.pinned ? "yes" : "no",
            entry.manual ? "yes" : "no",
            set.theme,
            criteria.theme,
            criteria.semanticMode,
            criteria.qualityMode,
            criteria.useSeededGeneration ? "seeded" : "fresh",
            criteria.seed,
          ]
            .map(csvEscape)
            .join(","),
        ),
      ),
    ].join("\n");
  }
  const criteriaLines = [
    `Exported: ${exportedAt}`,
    `Theme: ${criteria.theme || "random"}`,
    `Semantic mode: ${criteria.semanticMode}`,
    `Quality mode: ${QUALITY_LABELS[criteria.qualityMode]}`,
    `Seed mode: ${criteria.useSeededGeneration ? "seeded" : "fresh each click"}`,
    `Seed: ${criteria.seed}`,
    `Length: ${criteria.minLength}-${criteria.maxLength}`,
    `Syllables: ${criteria.minSyllables}-${criteria.maxSyllables}`,
    `Pattern: ${criteria.wordPattern || "none"}`,
    `Duplicate control: ${DUPLICATE_LABELS[criteria.duplicateMode]}`,
    `Parts of speech: ${criteria.selectedPos.join(", ") || "any"}`,
    `Dialect: ${criteria.dialect}`,
  ].join("\n");
  return `${criteriaLines}\n\n${sets
    .map((set, index) => `Set ${index + 1}\n${set.words.map((entry) => `${entry.word}${entry.pinned ? " [pinned]" : ""}${entry.manual ? " [manual]" : ""}`).join(", ")}`)
    .join("\n\n")}`;
}

export function serializeDiagnostics(
  rows: DiagnosticRow[],
  format: ExportFormat,
  filters: Filters,
  semanticStats: {
    total: number;
    localMatches: number;
    datamuseOnly: number;
    generatedSemanticWords: number;
  },
  context: DiagnosticExportContext,
) {
  const exportedAt = new Date().toISOString();
  const criteria = exportCriteria(filters);
  const diagnostics = rows.map(({ entry, setIndex, wordIndex }) => diagnosticRowToRecord(entry, setIndex, wordIndex));

  if (format === "json") {
    return JSON.stringify(
      {
        exportedAt,
        criteria,
        diagnosticsContext: {
          rowFilter: context.rowFilter,
          query: context.query.trim(),
          rowCount: rows.length,
        },
        semanticStats,
        rows: diagnostics,
      },
      null,
      2,
    );
  }

  if (format === "csv") {
    return [
      "exported_at,row_filter,query,set,position,word,base_form,part_of_speech,alternate_pos,pos_source,pos_confidence,frequency_band,quality_score,source,semantic_score,semantic_strength,semantic_source,pinned,manual",
      ...diagnostics.map((row) =>
        [
          exportedAt,
          context.rowFilter,
          context.query.trim(),
          row.set,
          row.position,
          row.word,
          row.baseForm,
          row.partOfSpeech,
          row.alternatePos.join("|"),
          row.posSource,
          row.posConfidence,
          row.frequencyBand,
          row.qualityScore,
          row.source,
          row.semanticScore ?? "",
          row.semanticStrength,
          row.semanticSource ?? "",
          row.pinned ? "yes" : "no",
          row.manual ? "yes" : "no",
        ]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n");
  }

  const header = [
    `Exported: ${exportedAt}`,
    `Rows: ${rows.length}`,
    `Filter: ${context.rowFilter}`,
    `Search: ${context.query.trim() || "none"}`,
    `Theme: ${criteria.theme || "random"}`,
    `Semantic mode: ${criteria.semanticMode}`,
    `Quality mode: ${QUALITY_LABELS[criteria.qualityMode]}`,
    `Semantic pool: ${semanticStats.total} candidates, ${semanticStats.localMatches} local matches, ${semanticStats.datamuseOnly} Datamuse-only`,
  ].join("\n");

  return `${header}\n\n${diagnostics
    .map(
      (row) =>
        `${row.set}.${row.position} ${row.word} [${posShort(row.partOfSpeech)}] ` +
        `${row.posSource}, ${row.posConfidence}% confidence, ${row.frequencyBand}, quality ${row.qualityScore}, ` +
        `${row.semanticStrength || "general fallback"}, ${row.source}`,
    )
    .join("\n")}`;
}

export function exportFileName(baseName: string, format: ExportFormat, filters: Filters) {
  const theme = filters.theme.trim() ? `-${slugify(filters.theme)}` : "";
  return `${baseName}${theme}-${new Date().toISOString().slice(0, 10)}.${format}`;
}

export function exportMime(format: ExportFormat) {
  if (format === "json") return "application/json";
  if (format === "csv") return "text/csv";
  return "text/plain";
}

function diagnosticRowToRecord(entry: WordEntry, setIndex: number, wordIndex: number) {
  return {
    set: setIndex + 1,
    position: wordIndex + 1,
    word: entry.word,
    baseForm: entry.baseForm,
    partOfSpeech: entry.pos,
    alternatePos: entry.alternatePos,
    posSource: entry.posSource,
    posConfidence: entry.posConfidence,
    frequencyBand: entry.frequencyBand,
    qualityScore: entry.qualityScore,
    source: entry.source === "scowl" ? "SQLite" : "Datamuse",
    semanticScore: entry.semanticScore,
    semanticStrength: entry.semanticScore ? semanticStrengthLabel(entry.semanticScore) : "general fallback",
    semanticSource: entry.semanticSource,
    pinned: Boolean(entry.pinned),
    manual: Boolean(entry.manual),
  };
}

function csvEscape(value: unknown) {
  return `"${String(value).replaceAll("\"", "\"\"")}"`;
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

function semanticStrengthLabel(score: number) {
  if (score >= 50000) return "strong semantic match";
  if (score >= 15000) return "moderate semantic match";
  return "weak semantic match";
}

function posShort(pos: PartOfSpeech) {
  if (pos === "noun") return "N";
  if (pos === "verb") return "V";
  if (pos === "adjective") return "Adj";
  if (pos === "adverb") return "Adv";
  return pos.slice(0, 3);
}
