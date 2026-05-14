import { Bookmark, Copy, Info, RefreshCw, Search, Star } from "lucide-react";
import { useState } from "react";
import {
  DIALECT_LABELS,
  DUPLICATE_LABELS,
  MODE_LABELS,
  POS_OPTIONS,
  QUALITY_LABELS,
} from "../constants";
import { THEME_PRESET_GROUPS, type ThemePreset } from "../themePresets";
import type {
  Dialect,
  DuplicateMode,
  Filters,
  GeneratedSet,
  HistoryEntry,
  PartOfSpeech,
  QualityMode,
  SemanticMode,
  WordEntry,
} from "../types";
import {
  definitionFallback,
  normalizeTheme,
  posLabel,
  posShort,
  posSourceLabel,
  semanticStrengthLabel,
} from "../utils/appUi";
import { NumberControl, TextFilter, Toggle } from "./controls";

export function CriteriaPanel({
  filters,
  updateFilter,
  reset,
}: {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  reset: () => void;
}) {
  return (
    <aside className="criteria panel">
      <div className="panel-title">
        <h2>Criteria</h2>
        <button className="link" onClick={reset}>
          Reset
        </button>
      </div>

      <NumberControl
        label="Word count per set"
        value={filters.wordsPerSet}
        min={1}
        max={40}
        onChange={(value) => updateFilter("wordsPerSet", value)}
      />

      <NumberControl
        label="Number of sets"
        value={filters.setCount}
        min={1}
        max={8}
        onChange={(value) => updateFilter("setCount", value)}
      />

      <div className="field">
        <label>Word length (letters)</label>
        <div className="range-pair">
          <input
            type="number"
            min={1}
            max={30}
            aria-label="Minimum word length"
            value={filters.minLength}
            onChange={(event) => updateFilter("minLength", Number(event.target.value))}
          />
          <input
            type="range"
            min={1}
            max={30}
            aria-label="Maximum word length"
            value={filters.maxLength}
            onChange={(event) => updateFilter("maxLength", Number(event.target.value))}
          />
          <input
            type="number"
            min={1}
            max={30}
            aria-label="Maximum word length"
            value={filters.maxLength}
            onChange={(event) => updateFilter("maxLength", Number(event.target.value))}
          />
        </div>
      </div>

      <Toggle
        label="Common / useful words"
        checked={!filters.includeRare}
        onChange={(checked) => updateFilter("includeRare", !checked)}
      />
      <Toggle
        label="Include rare words"
        checked={filters.includeRare}
        onChange={(checked) => updateFilter("includeRare", checked)}
      />

      <div className="field">
        <label>Quality mode</label>
        <div className="segmented" role="group" aria-label="Quality mode">
          {(Object.keys(QUALITY_LABELS) as QualityMode[]).map((mode) => (
            <button
              key={mode}
              className={filters.qualityMode === mode ? "active" : ""}
              aria-pressed={filters.qualityMode === mode}
              onClick={() => updateFilter("qualityMode", mode)}
            >
              {QUALITY_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <div className="field-title">
          <label>Parts of speech</label>
          <button className="link" onClick={() => updateFilter("selectedPos", POS_OPTIONS)}>
            Select all
          </button>
        </div>
        <div className="chips-grid">
          {POS_OPTIONS.map((pos) => (
            <button
              key={pos}
              className={filters.selectedPos.includes(pos) ? "chip selected" : "chip"}
              aria-pressed={filters.selectedPos.includes(pos)}
              onClick={() => {
                const next = filters.selectedPos.includes(pos)
                  ? filters.selectedPos.filter((item) => item !== pos)
                  : [...filters.selectedPos, pos];
                updateFilter("selectedPos", next);
              }}
            >
              {posLabel(pos)}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Dialect / variety</label>
        <select
          aria-label="Dialect / variety"
          value={filters.dialect}
          onChange={(event) => updateFilter("dialect", event.target.value as Dialect)}
        >
          {Object.entries(DIALECT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <TextFilter label="Starts with" value={filters.startsWith} onChange={(value) => updateFilter("startsWith", value)} placeholder="e.g. dr" />
      <TextFilter label="Ends with" value={filters.endsWith} onChange={(value) => updateFilter("endsWith", value)} placeholder="e.g. ing" />
      <TextFilter label="Contains (all letters)" value={filters.contains} onChange={(value) => updateFilter("contains", value)} placeholder="e.g. st" />
      <TextFilter label="Excludes (any letters)" value={filters.excludes} onChange={(value) => updateFilter("excludes", value)} placeholder="e.g. qxz" />

      <TextFilter
        label="Word pattern"
        value={filters.wordPattern}
        onChange={(value) => updateFilter("wordPattern", value)}
        placeholder="e.g. c*v?rn"
      />

      <div className="field compact">
        <label>Syllables (approx.)</label>
        <div className="range-pair syllable-pair">
          <input
            type="number"
            min={1}
            max={8}
            aria-label="Minimum syllables"
            value={filters.minSyllables}
            onChange={(event) => updateFilter("minSyllables", Number(event.target.value))}
          />
          <input
            type="range"
            min={1}
            max={8}
            aria-label="Maximum syllables"
            value={filters.maxSyllables}
            onChange={(event) => updateFilter("maxSyllables", Number(event.target.value))}
          />
          <input
            type="number"
            min={1}
            max={8}
            aria-label="Maximum syllables"
            value={filters.maxSyllables}
            onChange={(event) => updateFilter("maxSyllables", Number(event.target.value))}
          />
        </div>
      </div>

      <div className="field">
        <label>Duplicate control</label>
        <div className="segmented duplicate-segmented" role="group" aria-label="Duplicate control">
          {(Object.keys(DUPLICATE_LABELS) as DuplicateMode[]).map((mode) => (
            <button
              key={mode}
              className={filters.duplicateMode === mode ? "active" : ""}
              aria-pressed={filters.duplicateMode === mode}
              onClick={() => {
                updateFilter("duplicateMode", mode);
                updateFilter("uniqueWords", mode !== "allow");
              }}
            >
              {DUPLICATE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <Toggle label="Exclude offensive words" checked={filters.excludeOffensive} onChange={(checked) => updateFilter("excludeOffensive", checked)} />
      <Toggle label="No proper nouns" checked={filters.noProperNouns} onChange={(checked) => updateFilter("noProperNouns", checked)} />
      <Toggle label="No acronyms / initialisms" checked={filters.noAcronyms} onChange={(checked) => updateFilter("noAcronyms", checked)} />
      <Toggle label="No contractions" checked={filters.noContractions} onChange={(checked) => updateFilter("noContractions", checked)} />
      <Toggle label="No hyphenated words" checked={filters.noHyphenated} onChange={(checked) => updateFilter("noHyphenated", checked)} />
    </aside>
  );
}

export function ThemePanel({
  filters,
  updateFilter,
}: {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const selectedPreset = THEME_PRESET_GROUPS.flatMap((group) => group.presets).find(
    (preset) => normalizeTheme(filters.theme) === normalizeTheme(preset.theme),
  );

  function applyPreset(preset: ThemePreset) {
    updateFilter("theme", preset.theme);
    updateFilter("semanticMode", preset.mode);
    if (preset.phrases !== undefined) updateFilter("includePhrases", preset.phrases);
  }

  return (
    <section className="panel theme-panel">
      <h2>Theme & Semantics</h2>
      <div className="field">
        <label>Theme / idea</label>
        <div className="search-input">
          <Search size={16} />
          <input
            aria-label="Theme / idea"
            value={filters.theme}
            onChange={(event) => updateFilter("theme", event.target.value)}
            placeholder="e.g. sunken city, cozy village"
          />
        </div>
      </div>
      <div className="field">
        <label>
          Semantic mode <Info size={14} />
        </label>
        <div className="segmented" role="group" aria-label="Semantic mode">
          {(Object.keys(MODE_LABELS) as SemanticMode[]).map((mode) => (
            <button
              key={mode}
              className={filters.semanticMode === mode ? "active" : ""}
              aria-pressed={filters.semanticMode === mode}
              onClick={() => updateFilter("semanticMode", mode)}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>
      <Toggle
        label="Include phrases"
        checked={filters.includePhrases}
        onChange={(checked) => updateFilter("includePhrases", checked)}
      />
      <div className="field">
        <div className="field-title">
          <label>Preset themes</label>
          <span className="preset-status">
            {selectedPreset ? `${selectedPreset.label} · ${MODE_LABELS[selectedPreset.mode]}` : "Free entry"}
          </span>
        </div>
        <div className="preset-groups">
          {THEME_PRESET_GROUPS.map((group) => (
            <section className="preset-group" key={group.name}>
              <h3>{group.name}</h3>
              <div className="preset-grid">
                {group.presets.map((preset) => {
                  const selected = normalizeTheme(filters.theme) === normalizeTheme(preset.theme);
                  return (
                    <button
                      key={preset.theme}
                      className={selected ? "selected" : ""}
                      aria-pressed={selected}
                      onClick={() => applyPreset(preset)}
                    >
                      <span className="preset-name">
                        {selected && <Star size={14} />}
                        {preset.label}
                      </span>
                      <span className="preset-intent">{preset.intent}</span>
                      <span className="preset-mode">{MODE_LABELS[preset.mode]}{preset.phrases ? " · phrases" : ""}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
      <button className="advanced" aria-expanded={advancedOpen} aria-controls="advanced-semantic-options" onClick={() => setAdvancedOpen((current) => !current)}>
        Advanced semantic options
      </button>
      {advancedOpen && (
        <div className="advanced-panel" id="advanced-semantic-options">
          <div className="field compact">
            <label>Theme expansion size</label>
            <input
              type="range"
              min={100}
              max={1000}
              step={100}
              aria-label="Theme expansion size"
              value={filters.semanticLimit}
              onChange={(event) => updateFilter("semanticLimit", Number(event.target.value))}
            />
            <small>{filters.semanticLimit} Datamuse candidates</small>
          </div>
          <div className="field compact">
            <label>Theme strength</label>
            <input
              type="range"
              min={1}
              max={5}
              aria-label="Theme strength"
              value={filters.semanticWeight}
              onChange={(event) => updateFilter("semanticWeight", Number(event.target.value))}
            />
            <small>{filters.semanticWeight}x semantic weighting</small>
          </div>
          <Toggle
            label="Fallback to general pool"
            checked={filters.fallbackToGeneral}
            onChange={(checked) => updateFilter("fallbackToGeneral", checked)}
          />
        </div>
      )}
    </section>
  );
}

export function WordSetCard({
  set,
  index,
  definitions,
  showDetails,
  onCopy,
  onSave,
  onRegenerate,
}: {
  set: GeneratedSet;
  index: number;
  definitions: Record<string, string>;
  showDetails: boolean;
  onCopy: (words: WordEntry[]) => void;
  onSave: () => void;
  onRegenerate: () => void;
}) {
  return (
    <article className="set-card">
      <header>
        <div className="set-title">
          <span>{index + 1}</span>
          <h2>Set {index + 1}</h2>
        </div>
        <div className="set-actions">
          <button onClick={() => onCopy(set.words)}>
            <Copy size={16} />
            Copy
          </button>
          <button onClick={onSave}>
            <Bookmark size={16} />
            Save
          </button>
          <button onClick={onRegenerate}>
            <RefreshCw size={16} />
            Regenerate
          </button>
        </div>
      </header>
      <div className="word-grid">
        {set.words.map((entry, wordIndex) => {
          const definition = definitions[entry.word];
          return (
            <div
              className="word-tile"
              key={`${entry.word}-${wordIndex}`}
              tabIndex={0}
              title={definition || definitionFallback(entry)}
            >
              <span className="word-number">{wordIndex + 1}</span>
              <strong>{entry.word}</strong>
              <small className={`pos pos-${entry.pos}`}>{posShort(entry.pos)}</small>
              {showDetails && (
                <span className="word-details">
                  {entry.baseForm !== entry.word && `base ${entry.baseForm} · `}
                  {(entry.alternatePos?.length ?? 0) > 0 && `also ${entry.alternatePos.map(posShort).join("/")} · `}
                  {entry.semanticScore && `semantic ${semanticStrengthLabel(entry.semanticScore)} · `}
                  {posSourceLabel(entry.posSource)} · {entry.posConfidence}%
                </span>
              )}
              <span className="definition-tooltip" role="tooltip">
                <strong>{definition ? "Definition" : "No definition"}</strong>
                {definition || definitionFallback(entry)}
                <span className="tooltip-meta">
                  {entry.frequencyBand} · {entry.source === "scowl" ? "SQLite word database" : "Datamuse result"} ·{" "}
                  {entry.baseForm !== entry.word ? `Base ${entry.baseForm} · ` : ""}
                  {(entry.alternatePos?.length ?? 0) > 0 ? `Also ${entry.alternatePos.map(posShort).join("/")} · ` : ""}
                  {entry.semanticScore ? `Semantic ${semanticStrengthLabel(entry.semanticScore)} · ` : ""}
                  POS {posSourceLabel(entry.posSource).toLowerCase()} · {entry.posConfidence}% confidence
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function HistoryPanel({
  history,
  restore,
  clear,
}: {
  history: HistoryEntry[];
  restore: (entry: HistoryEntry) => void;
  clear: () => void;
}) {
  return (
    <section className="panel history-panel">
      <div className="panel-title">
        <h2>Generation history</h2>
        <button className="link" onClick={clear} disabled={history.length === 0}>
          Clear
        </button>
      </div>
      {history.length === 0 ? (
        <p className="muted">Generated sets will appear here.</p>
      ) : (
        history.map((entry) => (
          <button key={entry.id} className="history-item" onClick={() => restore(entry)}>
            <strong>{entry.filters.theme || "random"}</strong>
            <span>
              {entry.sets.length} sets · {entry.sets.reduce((total, set) => total + set.words.length, 0)} words
            </span>
          </button>
        ))
      )}
    </section>
  );
}
