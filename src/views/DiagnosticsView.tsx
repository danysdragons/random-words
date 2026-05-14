import { Download, Info, Search } from "lucide-react";
import { useState } from "react";
import { DIALECT_LABELS, MODE_LABELS, QUALITY_LABELS } from "../constants";
import type {
  DiagnosticExportContext,
  DiagnosticRow,
  DiagnosticRowFilter,
  ExportFormat,
  Filters,
  GeneratedSet,
} from "../types";
import { estimateSyllables } from "../services/filterEvaluator";
import { posLabel, posShort, posSourceLabel, semanticStrengthLabel } from "../utils/appUi";

export function DiagnosticsView({
  sets,
  filters,
  basePoolSize,
  semanticStats,
  warnings,
  exportDiagnostics,
}: {
  sets: GeneratedSet[];
  filters: Filters;
  basePoolSize: number;
  semanticStats: {
    total: number;
    localMatches: number;
    datamuseOnly: number;
    generatedSemanticWords: number;
  };
  warnings: string[];
  exportDiagnostics: (rows: DiagnosticRow[], format: ExportFormat, context: DiagnosticExportContext) => void;
}) {
  const [query, setQuery] = useState("");
  const [rowFilter, setRowFilter] = useState<DiagnosticRowFilter>("all");
  const [diagnosticExportFormat, setDiagnosticExportFormat] = useState<ExportFormat>("csv");
  const generatedEntries = sets.flatMap((set, setIndex) =>
    set.words.map((entry, wordIndex) => ({ entry, setIndex, wordIndex })),
  );
  const lowConfidenceCount = generatedEntries.filter(({ entry }) => entry.posConfidence < 70).length;
  const datamuseOnlyCount = generatedEntries.filter(({ entry }) => entry.source === "datamuse").length;
  const semanticOutputCount = generatedEntries.filter(({ entry }) => entry.semanticScore).length;
  const lemmaVariantCount = generatedEntries.filter(({ entry }) => entryLemma(entry) !== entry.word).length;
  const averageSyllables =
    generatedEntries.length > 0
      ? generatedEntries.reduce((total, { entry }) => total + entrySyllables(entry), 0) / generatedEntries.length
      : 0;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = generatedEntries.filter(({ entry }) => {
    if (rowFilter === "low-confidence" && entry.posConfidence >= 70) return false;
    if (rowFilter === "semantic" && !entry.semanticScore) return false;
    if (rowFilter === "datamuse-only" && entry.source !== "datamuse") return false;
    if (rowFilter === "fallback" && entry.semanticScore) return false;
    if (!normalizedQuery) return true;
    return [
      entry.word,
      entry.baseForm,
      entryLemma(entry),
      entryFamilyKey(entry),
      String(entrySyllables(entry)),
      entry.pos,
      entry.alternatePos.join(" "),
      entry.frequencyBand,
      entry.source,
      entry.posSource,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return (
    <section className="main-panel library-panel diagnostics-panel">
      <div className="section-head">
        <div>
          <h1>Diagnostics</h1>
          <p>Runtime explanation for the current generated output.</p>
        </div>
      </div>

      <div className="diagnostic-summary">
        <MetricCard label="Filtered pool" value={basePoolSize.toLocaleString()} detail={filters.includeRare ? "rare included" : "common only"} />
        <MetricCard label="Generated words" value={generatedEntries.length.toLocaleString()} detail={`${sets.length} sets visible`} />
        <MetricCard label="Semantic pool" value={semanticStats.total.toLocaleString()} detail={`${semanticStats.localMatches.toLocaleString()} local matches`} />
        <MetricCard label="Themed output" value={semanticOutputCount.toLocaleString()} detail={`${semanticStats.datamuseOnly.toLocaleString()} Datamuse-only candidates`} />
        <MetricCard label="Low POS confidence" value={lowConfidenceCount.toLocaleString()} detail="< 70% confidence" />
        <MetricCard label="Datamuse-only output" value={datamuseOnlyCount.toLocaleString()} detail="not in local SQLite" />
        <MetricCard label="Lemma variants" value={lemmaVariantCount.toLocaleString()} detail="word differs from lemma" />
        <MetricCard label="Avg syllables" value={averageSyllables.toFixed(1)} detail="stored per word" />
      </div>

      {warnings.length > 0 && (
        <div className="diagnostic-warning-panel" role="status" aria-label="Diagnostics warnings">
          <h2>Warnings</h2>
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      <div className="diagnostic-rules">
        <article>
          <h2>Active generation rules</h2>
          <p>
            {filters.theme.trim() ? `Theme "${filters.theme.trim()}" · ${MODE_LABELS[filters.semanticMode]}` : "No theme"}
            {" · "}
            {QUALITY_LABELS[filters.qualityMode]}
            {" · "}
            {filters.useSeededGeneration ? `Seed ${filters.seed}` : "Fresh seed each click"}
          </p>
          <p>
            Length {filters.minLength}-{filters.maxLength} · POS{" "}
            {filters.selectedPos.length ? filters.selectedPos.map(posLabel).join(", ") : "any"} ·{" "}
            {DIALECT_LABELS[filters.dialect]}
          </p>
        </article>
        <article>
          <h2>Quality gates</h2>
          <p>
            {[
              filters.excludeOffensive && "offensive words excluded",
              filters.noProperNouns && "proper nouns excluded",
              filters.noAcronyms && "acronyms excluded",
              filters.noContractions && "contractions excluded",
              filters.noHyphenated && "hyphenated words excluded",
              filters.uniqueWords && "unique roots preferred",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </article>
      </div>

      {generatedEntries.length === 0 ? (
        <div className="empty-state">
          <Info size={24} />
          <h2>No generated words to inspect</h2>
          <p>Generate a set, then return here to inspect word metadata and filter behavior.</p>
        </div>
      ) : (
        <>
          <div className="diagnostic-controls">
            <label className="diagnostic-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter rows by word, POS, source, or band"
                aria-label="Filter diagnostics rows"
              />
            </label>
            <div className="diagnostic-filter-group" aria-label="Diagnostics row filter">
              <button className={rowFilter === "all" ? "active" : ""} aria-pressed={rowFilter === "all"} onClick={() => setRowFilter("all")}>
                All rows
              </button>
              <button className={rowFilter === "low-confidence" ? "active" : ""} aria-pressed={rowFilter === "low-confidence"} onClick={() => setRowFilter("low-confidence")}>
                Low POS
              </button>
              <button className={rowFilter === "semantic" ? "active" : ""} aria-pressed={rowFilter === "semantic"} onClick={() => setRowFilter("semantic")}>
                Semantic
              </button>
              <button className={rowFilter === "datamuse-only" ? "active" : ""} aria-pressed={rowFilter === "datamuse-only"} onClick={() => setRowFilter("datamuse-only")}>
                Datamuse-only
              </button>
              <button className={rowFilter === "fallback" ? "active" : ""} aria-pressed={rowFilter === "fallback"} onClick={() => setRowFilter("fallback")}>
                Fallback
              </button>
            </div>
            <span className="diagnostic-count" aria-live="polite">
              {filteredEntries.length.toLocaleString()} of {generatedEntries.length.toLocaleString()} rows
            </span>
            <label className="export-control diagnostic-export">
              <select
                value={diagnosticExportFormat}
                onChange={(event) => setDiagnosticExportFormat(event.target.value as ExportFormat)}
                aria-label="Diagnostics export format"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="txt">Text</option>
              </select>
              <button
                onClick={() => exportDiagnostics(filteredEntries, diagnosticExportFormat, { rowFilter, query })}
                disabled={filteredEntries.length === 0}
              >
                <Download size={18} />
                Export diagnostics
              </button>
            </label>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="empty-state compact-empty">
              <Search size={24} />
              <h2>No diagnostics rows match</h2>
              <p>Clear the search or switch back to All rows.</p>
            </div>
          ) : (
            <div className="diagnostic-table-wrap">
              <table className="diagnostic-table">
                <caption className="sr-only">Generated word diagnostics</caption>
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>Word</th>
                    <th>Lemma</th>
                    <th>Syllables</th>
                    <th>POS</th>
                    <th>POS Basis</th>
                    <th>Quality</th>
                    <th>Semantic</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(({ entry, setIndex, wordIndex }) => (
                    <tr key={`${setIndex}-${wordIndex}-${entry.word}`}>
                      <td>{setIndex + 1}.{wordIndex + 1}</td>
                      <td>
                        <strong>{entry.word}</strong>
                        {entry.baseForm !== entry.word && <span>base {entry.baseForm}</span>}
                      </td>
                      <td>
                        <strong>{entryLemma(entry)}</strong>
                        <span>family {entryFamilyKey(entry)}</span>
                      </td>
                      <td>{entrySyllables(entry)}</td>
                      <td>
                        <small className={`pos pos-${entry.pos}`}>{posShort(entry.pos)}</small>
                        {(entry.alternatePos?.length ?? 0) > 0 && <span>also {entry.alternatePos.map(posShort).join("/")}</span>}
                      </td>
                      <td>
                        <strong>{posSourceLabel(entry.posSource)}</strong>
                        <span>{entry.posConfidence}% confidence</span>
                      </td>
                      <td>
                        <strong>{entry.qualityScore}</strong>
                        <span>{entry.frequencyBand}</span>
                      </td>
                      <td>
                        {entry.semanticScore ? (
                          <>
                            <strong>{semanticStrengthLabel(entry.semanticScore)}</strong>
                            <span>{entry.semanticSource === "local" ? "local metadata" : "Datamuse metadata"}</span>
                          </>
                        ) : (
                          <span>general fallback</span>
                        )}
                      </td>
                      <td>{entry.source === "scowl" ? "SQLite" : "Datamuse"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function entryLemma(entry: { lemma?: string; baseForm: string; word: string }) {
  return entry.lemma || entry.baseForm || entry.word;
}

function entryFamilyKey(entry: { familyKey?: string; lemma?: string; baseForm: string; word: string }) {
  return entry.familyKey || entryLemma(entry).toLowerCase().replace(/[^a-z]/g, "");
}

function entrySyllables(entry: { syllables?: number; word: string }) {
  return entry.syllables ?? estimateSyllables(entry.word);
}
