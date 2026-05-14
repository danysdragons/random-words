import { Bookmark, Check, Copy, Info, Pencil, Pin, PinOff, Plus, RefreshCw, Search, Star, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";
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
import { USE_CASE_PRESETS, type UseCasePreset } from "../useCasePresets";
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
  applyFilters,
  reset,
}: {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  applyFilters: (patch: Partial<Filters>) => void;
  reset: () => void;
}) {
  function useCaseSelected(preset: UseCasePreset) {
    return Object.entries(preset.filters).every(([key, value]) => {
      const currentValue = filters[key as keyof Filters];
      return Array.isArray(value)
        ? Array.isArray(currentValue) && value.join("|") === currentValue.join("|")
        : currentValue === value;
    });
  }

  return (
    <aside className="criteria panel">
      <div className="panel-title">
        <h2>Criteria</h2>
        <button className="link" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="field">
        <label>Use-case presets</label>
        <div className="use-case-grid">
          {USE_CASE_PRESETS.map((preset) => {
            const selected = useCaseSelected(preset);
            return (
              <button
                key={preset.id}
                className={selected ? "selected" : ""}
                aria-pressed={selected}
                aria-label={`Apply use-case preset: ${preset.label}`}
                onClick={() => applyFilters(preset.filters)}
              >
                <span>
                  {selected && <Star size={13} />}
                  {preset.label}
                </span>
                <small>{preset.intent}</small>
              </button>
            );
          })}
        </div>
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
  showInlineDefinitions,
  onCopy,
  onSave,
  onRegenerate,
  onTogglePin,
  onEditWord,
  onRemoveWord,
  onAddWord,
}: {
  set: GeneratedSet;
  index: number;
  definitions: Record<string, string>;
  showDetails: boolean;
  showInlineDefinitions: boolean;
  onCopy: (words: WordEntry[]) => void;
  onSave: () => void;
  onRegenerate: () => void;
  onTogglePin: (wordIndex: number) => void;
  onEditWord: (wordIndex: number, word: string) => void;
  onRemoveWord: (wordIndex: number) => void;
  onAddWord: (word: string) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newWord, setNewWord] = useState("");

  function startEditing(wordIndex: number, word: string) {
    setEditingIndex(wordIndex);
    setEditValue(word);
  }

  function submitEdit(event: FormEvent, wordIndex: number) {
    event.preventDefault();
    onEditWord(wordIndex, editValue);
    setEditingIndex(null);
    setEditValue("");
  }

  function submitNewWord(event: FormEvent) {
    event.preventDefault();
    onAddWord(newWord);
    setNewWord("");
  }

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
          const isEditing = editingIndex === wordIndex;
          return (
            <div
              className={`word-tile${entry.pinned ? " pinned" : ""}${entry.manual ? " manual" : ""}`}
              key={`${entry.word}-${wordIndex}`}
              tabIndex={0}
              title={definition || definitionFallback(entry)}
            >
              <span className="word-number">{wordIndex + 1}</span>
              <div className="word-workspace-actions">
                <button
                  className="icon"
                  onClick={() => onTogglePin(wordIndex)}
                  aria-label={`${entry.pinned ? "Unpin" : "Pin"} ${entry.word}`}
                  title={entry.pinned ? "Unpin word" : "Pin word"}
                >
                  {entry.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                </button>
                <button
                  className="icon"
                  onClick={() => startEditing(wordIndex, entry.word)}
                  aria-label={`Edit ${entry.word}`}
                  title="Edit word"
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="icon"
                  onClick={() => onRemoveWord(wordIndex)}
                  aria-label={`Remove ${entry.word}`}
                  title="Remove word"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {isEditing ? (
                <form className="word-edit-form" onSubmit={(event) => submitEdit(event, wordIndex)}>
                  <input
                    aria-label={`Edited word ${wordIndex + 1}`}
                    autoFocus
                    value={editValue}
                    onChange={(event) => setEditValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setEditingIndex(null);
                        setEditValue("");
                      }
                    }}
                  />
                  <button className="icon" type="submit" aria-label="Save edited word">
                    <Check size={14} />
                  </button>
                  <button className="icon" type="button" aria-label="Cancel edit" onClick={() => setEditingIndex(null)}>
                    <X size={14} />
                  </button>
                </form>
              ) : (
                <strong>{entry.word}</strong>
              )}
              <small className={`pos pos-${entry.pos}`}>{posShort(entry.pos)}</small>
              {(entry.pinned || entry.manual) && (
                <span className="word-flags">
                  {entry.pinned && "Pinned"}
                  {entry.pinned && entry.manual && " · "}
                  {entry.manual && "Manual"}
                </span>
              )}
              {showDetails && (
                <span className="word-details">
                  {entry.baseForm !== entry.word && `base ${entry.baseForm} · `}
                  {(entry.alternatePos?.length ?? 0) > 0 && `also ${entry.alternatePos.map(posShort).join("/")} · `}
                  {entry.semanticScore && `semantic ${semanticStrengthLabel(entry.semanticScore)} · `}
                  {posSourceLabel(entry.posSource)} · {entry.posConfidence}%
                </span>
              )}
              {showInlineDefinitions && definition && <span className="inline-definition">{definition}</span>}
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
      <form className="add-word-form" onSubmit={submitNewWord}>
        <input
          aria-label={`Add word to Set ${index + 1}`}
          value={newWord}
          onChange={(event) => setNewWord(event.target.value)}
          placeholder="Add a word or phrase"
        />
        <button type="submit">
          <Plus size={16} />
          Add word
        </button>
      </form>
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
