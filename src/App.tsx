import {
  Bookmark,
  Copy,
  Database,
  Download,
  FileText,
  Folder,
  HelpCircle,
  Info,
  Link,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Shuffle,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { loadWordDatabase, queryWords, type WordDatabase } from "./data";
import { fetchDefinitions, fetchSemanticWords } from "./datamuse";
import { generateSets } from "./generator";
import type {
  AppView,
  Collection,
  Dialect,
  ExportFormat,
  Filters,
  GeneratedSet,
  PartOfSpeech,
  QualityMode,
  SavedSet,
  SemanticMode,
  WordEntry,
} from "./types";

const POS_OPTIONS: PartOfSpeech[] = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "other",
];

const THEME_PRESETS = [
  "Haunted House",
  "Desert Ruins",
  "Arctic Expedition",
  "Clockwork City",
  "Cyberpunk Alley",
  "Forgotten Library",
  "Royal Court",
  "Underworld Journey",
  "Garden Sanctuary",
  "Secret Laboratory",
  "Alien Ecosystem",
  "Dream Carnival",
];

const DEFAULT_FILTERS: Filters = {
  wordsPerSet: 12,
  setCount: 3,
  minLength: 2,
  maxLength: 12,
  includeRare: false,
  qualityMode: "balanced",
  selectedPos: ["noun", "verb", "adjective"],
  dialect: "us",
  startsWith: "",
  endsWith: "",
  contains: "",
  excludes: "",
  uniqueWords: true,
  excludeOffensive: true,
  noProperNouns: true,
  noAcronyms: true,
  noContractions: true,
  noHyphenated: true,
  theme: "",
  semanticMode: "broad",
  includePhrases: false,
  semanticLimit: 600,
  semanticWeight: 2,
  fallbackToGeneral: true,
  useSeededGeneration: false,
  seed: "728391",
};

const DIALECT_LABELS: Record<Dialect, string> = {
  us: "American English",
  gb: "British English",
  ca: "Canadian English",
  au: "Australian English",
};

const MODE_LABELS: Record<SemanticMode, string> = {
  strict: "Strict category",
  broad: "Broad theme",
  related: "Related concepts",
  mood: "Mood / tone",
  evocative: "Evocative",
  concrete: "Concrete objects",
  actions: "Actions & motion",
  sensory: "Sensory",
};

const QUALITY_LABELS: Record<QualityMode, string> = {
  balanced: "Balanced",
  common: "Common first",
  surprising: "More surprising",
};

interface HistoryEntry {
  id: string;
  sets: GeneratedSet[];
  filters: Filters;
  createdAt: string;
}

function App() {
  const [view, setView] = usePersistentState<AppView>("random-words:view:v1", "generator");
  const [wordDb, setWordDb] = useState<WordDatabase | null>(null);
  const [filters, setFilters] = usePersistentState<Filters>("random-words:filters:v1", DEFAULT_FILTERS);
  const [basePool, setBasePool] = useState<WordEntry[]>([]);
  const [semanticPool, setSemanticPool] = useState<WordEntry[]>([]);
  const [sets, setSets] = usePersistentState<GeneratedSet[]>("random-words:current-sets:v1", []);
  const [history, setHistory] = usePersistentState<HistoryEntry[]>("random-words:history:v1", []);
  const [savedSets, setSavedSets] = usePersistentState<SavedSet[]>("random-words:saved:v1", []);
  const [collections, setCollections] = usePersistentState<Collection[]>("random-words:collections:v1", []);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const [collectionName, setCollectionName] = useState("");
  const [activeDialog, setActiveDialog] = useState<"help" | "settings" | null>(null);
  const [definitions, setDefinitions] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("Loading word database...");
  const [toast, setToast] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const sharedFilters = readSharedFiltersFromUrl();
    if (!sharedFilters) return;
    setFilters(sharedFilters);
    setView("generator");
    setToast("Loaded shared criteria");
  }, [setFilters, setView]);

  useEffect(() => {
    loadWordDatabase()
      .then((loaded) => {
        setWordDb(loaded);
        setStatus("");
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : "Unable to load word database.");
      });
  }, []);

  useEffect(() => {
    if (!wordDb) return;
    setBasePool(queryWords(wordDb.db, filters));
  }, [wordDb, filters]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const visibleWords = sets.flatMap((set) => set.words.map((entry) => entry.word));
    if (!visibleWords.length) {
      setDefinitions({});
      return;
    }
    let active = true;
    fetchDefinitions(visibleWords).then((nextDefinitions) => {
      if (active) setDefinitions(nextDefinitions);
    });
    return () => {
      active = false;
    };
  }, [sets]);

  async function handleGenerate(requestedFilters = filters) {
    if (!wordDb) return;
    const nextFilters = prepareGenerationFilters(requestedFilters);
    if (nextFilters.seed !== filters.seed || nextFilters.useSeededGeneration !== filters.useSeededGeneration) {
      setFilters(nextFilters);
    }
    setIsGenerating(true);
    setStatus("");
    try {
      const semanticWords = await fetchSemanticWords(nextFilters);
      const generated = generateSets(queryWords(wordDb.db, nextFilters), semanticWords, nextFilters);
      setSemanticPool(semanticWords);
      setSets(generated);
      setHistory((current) =>
        [
          {
            id: createId("history"),
            sets: generated,
            filters: nextFilters,
            createdAt: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 20),
      );
      setView("generator");
      if (generated.some((set) => set.words.length < nextFilters.wordsPerSet)) {
        setStatus("Some sets were smaller than requested because the active filters narrowed the pool.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRegenerateSet(targetIndex: number) {
    if (!wordDb) return;
    const nextFilters = {
      ...filters,
      setCount: 1,
      seed: filters.useSeededGeneration
        ? `${filters.seed}-${targetIndex + 1}`
        : createRandomSeed(),
    };
    setIsGenerating(true);
    try {
      const semanticWords = await fetchSemanticWords(nextFilters);
      const [replacement] = generateSets(queryWords(wordDb.db, nextFilters), semanticWords, nextFilters);
      if (!replacement) return;
      setSemanticPool(semanticWords);
      setSets((current) => current.map((set, index) => (index === targetIndex ? replacement : set)));
      setToast(`Regenerated Set ${targetIndex + 1}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Regeneration failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function randomizeSeed() {
    updateFilter("seed", createRandomSeed());
  }

  function handleShuffle() {
    const nextFilters = {
      ...filters,
      seed: createRandomSeed(),
    };
    setFilters(nextFilters);
    void handleGenerate(nextFilters);
  }

  function exportCurrentSets(format = exportFormat) {
    const blob = new Blob([serializeSets(sets, format, filters)], {
      type: exportMime(format),
    });
    downloadBlob(blob, `random-word-sets.${format}`);
  }

  async function copyShareLink() {
    const href = createShareUrl(filters);
    window.history.replaceState(null, "", href);
    try {
      await navigator.clipboard?.writeText(href);
      setToast("Copied share link");
    } catch {
      setToast("Share link added to the address bar");
    }
  }

  function saveSet(set: GeneratedSet, index: number) {
    const saved: SavedSet = {
      id: createId("saved"),
      name: `${set.theme || "Random"} Set ${index + 1}`,
      set,
      savedAt: new Date().toISOString(),
      collectionId: collections[0]?.id ?? null,
    };
    setSavedSets((current) => [saved, ...current]);
    setToast(`Saved ${saved.name}`);
  }

  function saveAllSets() {
    sets.forEach((set, index) => saveSet(set, index));
  }

  function removeSavedSet(id: string) {
    setSavedSets((current) => current.filter((set) => set.id !== id));
  }

  function updateSavedCollection(savedId: string, collectionId: string) {
    setSavedSets((current) =>
      current.map((saved) =>
        saved.id === savedId ? { ...saved, collectionId: collectionId || null } : saved,
      ),
    );
  }

  function createCollection() {
    const name = collectionName.trim();
    if (!name) return;
    setCollections((current) => [
      {
        id: createId("collection"),
        name,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setCollectionName("");
  }

  function removeCollection(id: string) {
    setCollections((current) => current.filter((collection) => collection.id !== id));
    setSavedSets((current) =>
      current.map((saved) => (saved.collectionId === id ? { ...saved, collectionId: null } : saved)),
    );
  }

  function renameCollection(id: string, name: string) {
    const nextName = name.trim();
    if (!nextName) return;
    setCollections((current) =>
      current.map((collection) =>
        collection.id === id ? { ...collection, name: nextName } : collection,
      ),
    );
  }

  function clearDatamuseCache() {
    localStorage.removeItem("random-words:datamuse-cache:v1");
    localStorage.removeItem("random-words:definition-cache:v1");
    setDefinitions({});
    setToast("Cleared semantic and definition cache");
  }

  function clearWorkspaceData() {
    setSets([]);
    setHistory([]);
    setSavedSets([]);
    setCollections([]);
    setSemanticPool([]);
    setToast("Cleared saved sets, collections, and history");
  }

  function restoreHistory(entry: HistoryEntry) {
    setFilters(entry.filters);
    setSets(entry.sets);
    setView("generator");
  }

  const generatedWordCount = useMemo(
    () => sets.reduce((total, set) => total + set.words.length, 0),
    [sets],
  );

  const collectionCounts = useMemo(() => {
    const counts = new Map<string | null, number>();
    for (const saved of savedSets) {
      counts.set(saved.collectionId, (counts.get(saved.collectionId) ?? 0) + 1);
    }
    return counts;
  }, [savedSets]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">RW</div>
          <div>
            <strong>Random Words</strong>
            <span>Word & phrase sets for creators</span>
          </div>
        </div>
        <nav>
          <button className={view === "generator" ? "active" : ""} onClick={() => setView("generator")}>
            Generator
          </button>
          <button className={view === "saved" ? "active" : ""} onClick={() => setView("saved")}>
            Saved Sets
          </button>
          <button className={view === "collections" ? "active" : ""} onClick={() => setView("collections")}>
            Collections
          </button>
          <button className={view === "about" ? "active" : ""} onClick={() => setView("about")}>
            About Data
          </button>
        </nav>
        <div className="top-actions">
          <button onClick={() => setActiveDialog("help")} aria-label="Help">
            <HelpCircle size={18} />
          </button>
          <button onClick={() => setActiveDialog("settings")} aria-label="Settings">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {view === "generator" ? (
        <main className="workspace">
          <CriteriaPanel filters={filters} updateFilter={updateFilter} reset={() => setFilters(DEFAULT_FILTERS)} />

          <section className="main-panel">
            <div className="section-head">
              <div>
                <h1>Generated word sets</h1>
                <p>
                  {filters.setCount} sets · {filters.wordsPerSet} words each
                </p>
              </div>
              <button className="save-all" onClick={saveAllSets} disabled={sets.length === 0}>
                <Bookmark size={16} />
                Save all
              </button>
            </div>

            <div className="toolbar">
              <button className="primary" onClick={() => void handleGenerate()} disabled={isGenerating || !wordDb}>
                {isGenerating ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                Generate
              </button>
              <button onClick={handleShuffle} disabled={isGenerating || !wordDb}>
                <Shuffle size={18} />
                Shuffle
              </button>
              <button onClick={() => setSets([])}>
                <Trash2 size={18} />
                Clear
              </button>
              <button onClick={() => void copyShareLink()}>
                <Link size={18} />
                Copy link
              </button>
              <label className="export-control">
                <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="txt">Text</option>
                </select>
                <button onClick={() => exportCurrentSets()}>
                  <Download size={18} />
                  Export
                </button>
              </label>
            </div>

            <Toggle
              label="Reproducible seed mode"
              checked={filters.useSeededGeneration}
              onChange={(checked) => updateFilter("useSeededGeneration", checked)}
              variant="inline"
            />

            <div className="status-row">
              {filters.useSeededGeneration && (
                <label>
                  <span>Seed</span>
                  <input value={filters.seed} onChange={(event) => updateFilter("seed", event.target.value)} />
                  <button className="icon" onClick={randomizeSeed} aria-label="Generate seed">
                    <RotateCcw size={15} />
                  </button>
                </label>
              )}
              <div className="metric">
                Filtered pool size <strong>{basePool.length.toLocaleString()}</strong>
              </div>
              <div className="metric">
                Commonness <strong>{filters.includeRare ? "Expanded" : "Balanced"}</strong>
              </div>
              <div className="metric">
                Quality mode <strong>{QUALITY_LABELS[filters.qualityMode]}</strong>
              </div>
              <div className="metric">
                Randomness <strong>{filters.useSeededGeneration ? "Seeded" : "Fresh each click"}</strong>
              </div>
              {semanticPool.length > 0 && (
                <div className="metric">
                  Semantic matches <strong>{semanticPool.length.toLocaleString()}</strong>
                </div>
              )}
            </div>

            {(status || toast) && <div className="notice">{toast || status}</div>}

            <div className="sets">
              {sets.length === 0 ? (
                <div className="empty-state">
                  <Sparkles size={24} />
                  <h2>Ready to generate</h2>
                  <p>Choose criteria, add an optional theme, and generate reproducible sets.</p>
                </div>
              ) : (
                sets.map((set, index) => (
                  <WordSetCard
                    key={set.id}
                    set={set}
                    index={index}
                    definitions={definitions}
                    onCopy={(words) => void copyWords(words, setToast)}
                    onSave={() => saveSet(set, index)}
                    onRegenerate={() => void handleRegenerateSet(index)}
                  />
                ))
              )}
            </div>

            <footer id="about-data" className="data-footnote">
              <Database size={16} />
              <span>
                Source: {wordDb?.meta?.source ?? "SCOWL/ESDB"} ·{" "}
                {wordDb?.meta?.records.toLocaleString() ?? "0"} normalized entries · Datamuse themes cached locally
              </span>
            </footer>
          </section>

          <aside className="right-panel">
            <ThemePanel filters={filters} updateFilter={updateFilter} />
            <HistoryPanel
              history={history}
              restore={restoreHistory}
              clear={() => setHistory([])}
            />
          </aside>
        </main>
      ) : (
        <main className="library-workspace">
          {view === "saved" && (
            <SavedSetsView
              savedSets={savedSets}
              collections={collections}
              updateSavedCollection={updateSavedCollection}
              removeSavedSet={removeSavedSet}
              restore={(set) => {
                setSets([set]);
                setView("generator");
              }}
              copy={(words) => void copyWords(words, setToast)}
            />
          )}
          {view === "collections" && (
            <CollectionsView
              collections={collections}
              collectionCounts={collectionCounts}
              collectionName={collectionName}
              setCollectionName={setCollectionName}
              createCollection={createCollection}
              renameCollection={renameCollection}
              removeCollection={removeCollection}
              savedSets={savedSets}
            />
          )}
          {view === "about" && <AboutDataView wordDb={wordDb} />}
        </main>
      )}

      <div className="bottom-line">
        <span>All DB words are lowercase. Filters apply to normalized forms.</span>
        <span>{generatedWordCount} generated words visible</span>
      </div>
      {activeDialog === "help" && <HelpDialog close={() => setActiveDialog(null)} />}
      {activeDialog === "settings" && (
        <SettingsDialog
          close={() => setActiveDialog(null)}
          resetFilters={() => {
            setFilters(DEFAULT_FILTERS);
            setToast("Reset generator defaults");
          }}
          clearDatamuseCache={clearDatamuseCache}
          clearWorkspaceData={clearWorkspaceData}
        />
      )}
    </div>
  );
}

function CriteriaPanel({
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
            value={filters.minLength}
            onChange={(event) => updateFilter("minLength", Number(event.target.value))}
          />
          <input
            type="range"
            min={1}
            max={30}
            value={filters.maxLength}
            onChange={(event) => updateFilter("maxLength", Number(event.target.value))}
          />
          <input
            type="number"
            min={1}
            max={30}
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
        <div className="segmented">
          {(Object.keys(QUALITY_LABELS) as QualityMode[]).map((mode) => (
            <button
              key={mode}
              className={filters.qualityMode === mode ? "active" : ""}
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

      <Toggle label="Unique words only" checked={filters.uniqueWords} onChange={(checked) => updateFilter("uniqueWords", checked)} />
      <Toggle label="Exclude offensive words" checked={filters.excludeOffensive} onChange={(checked) => updateFilter("excludeOffensive", checked)} />
      <Toggle label="No proper nouns" checked={filters.noProperNouns} onChange={(checked) => updateFilter("noProperNouns", checked)} />
      <Toggle label="No acronyms / initialisms" checked={filters.noAcronyms} onChange={(checked) => updateFilter("noAcronyms", checked)} />
      <Toggle label="No contractions" checked={filters.noContractions} onChange={(checked) => updateFilter("noContractions", checked)} />
      <Toggle label="No hyphenated words" checked={filters.noHyphenated} onChange={(checked) => updateFilter("noHyphenated", checked)} />
    </aside>
  );
}

function ThemePanel({
  filters,
  updateFilter,
}: {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <section className="panel theme-panel">
      <h2>Theme & Semantics</h2>
      <div className="field">
        <label>Theme / idea</label>
        <div className="search-input">
          <Search size={16} />
          <input
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
        <div className="segmented">
          {(Object.keys(MODE_LABELS) as SemanticMode[]).map((mode) => (
            <button
              key={mode}
              className={filters.semanticMode === mode ? "active" : ""}
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
        <label>Preset themes</label>
        <div className="preset-grid">
          {THEME_PRESETS.map((preset) => {
            const selected = normalizeTheme(filters.theme) === normalizeTheme(preset);
            return (
              <button
                key={preset}
                className={selected ? "selected" : ""}
                aria-pressed={selected}
                onClick={() => updateFilter("theme", preset.toLowerCase())}
              >
                {selected && <Star size={14} />}
                {preset}
              </button>
            );
          })}
        </div>
      </div>
      <button className="advanced" onClick={() => setAdvancedOpen((current) => !current)}>
        Advanced semantic options
      </button>
      {advancedOpen && (
        <div className="advanced-panel">
          <div className="field compact">
            <label>Theme expansion size</label>
            <input
              type="range"
              min={100}
              max={1000}
              step={100}
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

function WordSetCard({
  set,
  index,
  definitions,
  onCopy,
  onSave,
  onRegenerate,
}: {
  set: GeneratedSet;
  index: number;
  definitions: Record<string, string>;
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
        {set.words.map((entry, wordIndex) => (
          <div
            className="word-tile"
            key={`${entry.word}-${wordIndex}`}
            tabIndex={0}
            title={definitions[entry.word] || `${entry.word} (${posShort(entry.pos)})`}
          >
            <span className="word-number">{wordIndex + 1}</span>
            <strong>{entry.word}</strong>
            <small className={`pos pos-${entry.pos}`}>{posShort(entry.pos)}</small>
            {definitions[entry.word] && (
              <span className="definition-tooltip" role="tooltip">
                <strong>{entry.frequencyBand}</strong>
                {definitions[entry.word]}
              </span>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

function HistoryPanel({
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

function SavedSetsView({
  savedSets,
  collections,
  updateSavedCollection,
  removeSavedSet,
  restore,
  copy,
}: {
  savedSets: SavedSet[];
  collections: Collection[];
  updateSavedCollection: (savedId: string, collectionId: string) => void;
  removeSavedSet: (id: string) => void;
  restore: (set: GeneratedSet) => void;
  copy: (words: WordEntry[]) => void;
}) {
  return (
    <section className="main-panel library-panel">
      <div className="section-head">
        <div>
          <h1>Saved sets</h1>
          <p>{savedSets.length} saved word sets</p>
        </div>
      </div>
      {savedSets.length === 0 ? (
        <div className="empty-state">
          <Bookmark size={24} />
          <h2>No saved sets yet</h2>
          <p>Save a generated set to keep it available here.</p>
        </div>
      ) : (
        <div className="saved-list">
          {savedSets.map((saved) => (
            <article className="saved-item" key={saved.id}>
              <header>
                <div>
                  <h2>{saved.name}</h2>
                  <p>{saved.set.words.length} words · {formatDate(saved.savedAt)}</p>
                </div>
                <div className="set-actions">
                  <button onClick={() => restore(saved.set)}>
                    <RefreshCw size={16} />
                    Restore
                  </button>
                  <button onClick={() => copy(saved.set.words)}>
                    <Copy size={16} />
                    Copy
                  </button>
                  <button onClick={() => removeSavedSet(saved.id)}>
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </header>
              <div className="word-strip">
                {saved.set.words.slice(0, 18).map((entry) => (
                  <span key={entry.word}>{entry.word}</span>
                ))}
              </div>
              <label className="collection-select">
                Collection
                <select
                  value={saved.collectionId ?? ""}
                  onChange={(event) => updateSavedCollection(saved.id, event.target.value)}
                >
                  <option value="">Unfiled</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function CollectionsView({
  collections,
  collectionCounts,
  collectionName,
  setCollectionName,
  createCollection,
  renameCollection,
  removeCollection,
  savedSets,
}: {
  collections: Collection[];
  collectionCounts: Map<string | null, number>;
  collectionName: string;
  setCollectionName: (value: string) => void;
  createCollection: () => void;
  renameCollection: (id: string, name: string) => void;
  removeCollection: (id: string) => void;
  savedSets: SavedSet[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  return (
    <section className="main-panel library-panel">
      <div className="section-head">
        <div>
          <h1>Collections</h1>
          <p>Organize saved word sets for projects and prompts.</p>
        </div>
      </div>
      <div className="collection-create">
        <input
          value={collectionName}
          onChange={(event) => setCollectionName(event.target.value)}
          placeholder="New collection name"
        />
        <button className="primary" onClick={createCollection}>
          <Plus size={18} />
          Create
        </button>
      </div>
      <div className="collection-grid">
        <article className="collection-card">
          <Folder size={22} />
          <h2>Unfiled</h2>
          <p>{collectionCounts.get(null) ?? 0} saved sets</p>
        </article>
        {collections.map((collection) => (
          <article className="collection-card" key={collection.id}>
            <Folder size={22} />
            {editingId === collection.id ? (
              <div className="rename-row">
                <input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  aria-label="Collection name"
                />
                <button
                  onClick={() => {
                    renameCollection(collection.id, editingName);
                    setEditingId(null);
                  }}
                >
                  Save
                </button>
              </div>
            ) : (
              <h2>{collection.name}</h2>
            )}
            <p>{collectionCounts.get(collection.id) ?? 0} saved sets</p>
            <small>{formatDate(collection.createdAt)}</small>
            <div className="card-actions">
              <button
                className="link"
                onClick={() => {
                  setEditingId(collection.id);
                  setEditingName(collection.name);
                }}
              >
                Rename
              </button>
              <button className="link danger" onClick={() => removeCollection(collection.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
      {savedSets.length > 0 && (
        <div className="collection-note">
          Assign saved sets to collections from the Saved Sets view.
        </div>
      )}
    </section>
  );
}

function AboutDataView({ wordDb }: { wordDb: WordDatabase | null }) {
  return (
    <section className="main-panel library-panel">
      <div className="section-head">
        <div>
          <h1>About data</h1>
          <p>Build sources and runtime data behavior.</p>
        </div>
      </div>
      <div className="about-grid">
        <article>
          <Database size={22} />
          <h2>Word database</h2>
          <p>Primary source: {wordDb?.meta?.source ?? "SCOWL/ESDB"}</p>
          <p>{wordDb?.meta?.records.toLocaleString() ?? "0"} normalized entries</p>
          {wordDb?.meta?.quality && (
            <p>
              {wordDb.meta.quality.posOverrides.toLocaleString()} POS overrides ·{" "}
              {wordDb.meta.quality.properNounHints.toLocaleString()} proper-noun hints ·{" "}
              {wordDb.meta.quality.offensiveHints.toLocaleString()} offensive-word hints ·{" "}
              {(wordDb.meta.quality.acronymHints ?? 0).toLocaleString()} acronym hints
            </p>
          )}
          {wordDb?.meta?.quality?.frequencyCoreWords && (
            <p>
              {wordDb.meta.quality.frequencyCoreWords.toLocaleString()} core words ·{" "}
              {wordDb.meta.quality.frequencyFamiliarWords?.toLocaleString()} familiar words ·{" "}
              {wordDb.meta.quality.frequencyNichePenalties?.toLocaleString()} niche penalties
            </p>
          )}
        </article>
        <article>
          <Search size={22} />
          <h2>Semantic expansion</h2>
          <p>Datamuse lookups run in the browser and are cached in local storage.</p>
        </article>
        <article>
          <FileText size={22} />
          <h2>Deployment</h2>
          <p>The app builds static assets for GitHub Pages through GitHub Actions.</p>
        </article>
      </div>
    </section>
  );
}

function HelpDialog({ close }: { close: () => void }) {
  return (
    <Modal title="Help" close={close}>
      <div className="dialog-section">
        <h3>Generating</h3>
        <p>Use Generate for fresh results. Turn on reproducible seed mode only when you want the same criteria and seed to produce the same sets again.</p>
      </div>
      <div className="dialog-section">
        <h3>Themes</h3>
        <p>Preset themes and free-entry themes use Datamuse to expand related words. Semantic modes tune whether results stay literal, associative, object-focused, action-focused, sensory, or mood-driven.</p>
      </div>
      <div className="dialog-section">
        <h3>Definitions</h3>
        <p>Hover or focus a generated word tile to see a short definition when one is available. Definitions are cached locally in this browser.</p>
      </div>
    </Modal>
  );
}

function SettingsDialog({
  close,
  resetFilters,
  clearDatamuseCache,
  clearWorkspaceData,
}: {
  close: () => void;
  resetFilters: () => void;
  clearDatamuseCache: () => void;
  clearWorkspaceData: () => void;
}) {
  return (
    <Modal title="Settings" close={close}>
      <div className="settings-actions">
        <button onClick={resetFilters}>Reset generator defaults</button>
        <button onClick={clearDatamuseCache}>Clear semantic cache</button>
        <button className="danger-button" onClick={clearWorkspaceData}>
          Clear saved workspace data
        </button>
      </div>
      <p className="muted">Settings and saved content are stored locally in this browser. Clearing workspace data removes saved sets, collections, history, and current generated sets.</p>
    </Modal>
  );
}

function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="number-control">
        <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <button onClick={() => onChange(Math.max(min, value - 1))}>-</button>
        <button onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );
}

function TextFilter({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field compact">
      <label>{label}</label>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  variant = "default",
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: "default" | "inline";
}) {
  return (
    <label className={variant === "inline" ? "toggle-row inline-toggle" : "toggle-row"}>
      <span>{label}</span>
      <button className={checked ? "toggle on" : "toggle"} type="button" onClick={() => onChange(!checked)}>
        <span />
      </button>
    </label>
  );
}

function posLabel(pos: PartOfSpeech) {
  return pos.replace(/^\w/, (letter) => letter.toUpperCase());
}

function posShort(pos: PartOfSpeech) {
  return {
    noun: "N",
    verb: "V",
    adjective: "Adj",
    adverb: "Adv",
    pronoun: "Pro",
    preposition: "Prep",
    conjunction: "Conj",
    interjection: "Int",
    other: "Other",
  }[pos];
}

function normalizeTheme(value: string) {
  return value.trim().toLowerCase().replaceAll("&", "and").replace(/\s+/g, " ");
}

async function copyWords(words: WordEntry[], setToast: (message: string) => void) {
  const text = words.map((item) => item.word).join(", ");
  try {
    await navigator.clipboard?.writeText(text);
    setToast("Copied words to clipboard");
  } catch {
    setToast("Clipboard permission was denied");
  }
}

function serializeSets(sets: GeneratedSet[], format: ExportFormat, filters: Filters) {
  const exportedAt = new Date().toISOString();
  const criteria = exportCriteria(filters);
  if (format === "json") return JSON.stringify({ exportedAt, criteria, sets }, null, 2);
  if (format === "csv") {
    return [
      "exported_at,set,position,word,part_of_speech,frequency_band,quality_score,source,set_theme,criteria_theme,semantic_mode,quality_mode,seed_mode,seed",
      ...sets.flatMap((set, setIndex) =>
        set.words.map((entry, wordIndex) =>
          [
            exportedAt,
            setIndex + 1,
            wordIndex + 1,
            entry.word,
            entry.pos,
            entry.frequencyBand,
            entry.qualityScore,
            entry.source,
            set.theme,
            criteria.theme,
            criteria.semanticMode,
            criteria.qualityMode,
            criteria.useSeededGeneration ? "seeded" : "fresh",
            criteria.seed,
          ]
            .map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`)
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
    `Parts of speech: ${criteria.selectedPos.join(", ") || "any"}`,
    `Dialect: ${criteria.dialect}`,
  ].join("\n");
  return `${criteriaLines}\n\n${sets
    .map((set, index) => `Set ${index + 1}\n${set.words.map((entry) => entry.word).join(", ")}`)
    .join("\n\n")}`;
}

function createShareUrl(filters: Filters) {
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.set("criteria", encodeSharePayload(filters));
  return url.href;
}

function readSharedFiltersFromUrl() {
  const encoded = new URL(window.location.href).searchParams.get("criteria");
  if (!encoded) return null;
  try {
    const payload = JSON.parse(decodeSharePayload(encoded)) as unknown;
    return normalizeSharedFilters(payload);
  } catch {
    return null;
  }
}

function encodeSharePayload(filters: Filters) {
  const json = JSON.stringify(exportCriteria(filters));
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeSharePayload(encoded: string) {
  const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizeSharedFilters(payload: unknown): Filters | null {
  if (!isPlainObject(payload)) return null;
  return {
    ...DEFAULT_FILTERS,
    wordsPerSet: boundedNumber(payload.wordsPerSet, DEFAULT_FILTERS.wordsPerSet, 1, 40),
    setCount: boundedNumber(payload.setCount, DEFAULT_FILTERS.setCount, 1, 8),
    minLength: boundedNumber(payload.minLength, DEFAULT_FILTERS.minLength, 1, 30),
    maxLength: boundedNumber(payload.maxLength, DEFAULT_FILTERS.maxLength, 1, 30),
    includeRare: booleanValue(payload.includeRare, DEFAULT_FILTERS.includeRare),
    qualityMode: qualityModeValue(payload.qualityMode),
    selectedPos: posList(payload.selectedPos),
    dialect: dialectValue(payload.dialect),
    startsWith: stringValue(payload.startsWith),
    endsWith: stringValue(payload.endsWith),
    contains: stringValue(payload.contains),
    excludes: stringValue(payload.excludes),
    uniqueWords: booleanValue(payload.uniqueWords, DEFAULT_FILTERS.uniqueWords),
    excludeOffensive: booleanValue(payload.excludeOffensive, DEFAULT_FILTERS.excludeOffensive),
    noProperNouns: booleanValue(payload.noProperNouns, DEFAULT_FILTERS.noProperNouns),
    noAcronyms: booleanValue(payload.noAcronyms, DEFAULT_FILTERS.noAcronyms),
    noContractions: booleanValue(payload.noContractions, DEFAULT_FILTERS.noContractions),
    noHyphenated: booleanValue(payload.noHyphenated, DEFAULT_FILTERS.noHyphenated),
    theme: stringValue(payload.theme),
    semanticMode: semanticModeValue(payload.semanticMode),
    includePhrases: booleanValue(payload.includePhrases, DEFAULT_FILTERS.includePhrases),
    semanticLimit: boundedNumber(payload.semanticLimit, DEFAULT_FILTERS.semanticLimit, 100, 1000),
    semanticWeight: boundedNumber(payload.semanticWeight, DEFAULT_FILTERS.semanticWeight, 1, 5),
    fallbackToGeneral: booleanValue(payload.fallbackToGeneral, DEFAULT_FILTERS.fallbackToGeneral),
    useSeededGeneration: booleanValue(payload.useSeededGeneration, DEFAULT_FILTERS.useSeededGeneration),
    seed: stringValue(payload.seed) || DEFAULT_FILTERS.seed,
  };
}

function exportCriteria(filters: Filters): Filters {
  return {
    ...filters,
    selectedPos: filters.selectedPos.filter((pos) => POS_OPTIONS.includes(pos)),
  };
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function posList(value: unknown): PartOfSpeech[] {
  if (!Array.isArray(value)) return DEFAULT_FILTERS.selectedPos;
  const selected = value.filter((item): item is PartOfSpeech => POS_OPTIONS.includes(item as PartOfSpeech));
  return selected.length ? selected : DEFAULT_FILTERS.selectedPos;
}

function dialectValue(value: unknown): Dialect {
  return value === "us" || value === "gb" || value === "ca" || value === "au" ? value : DEFAULT_FILTERS.dialect;
}

function semanticModeValue(value: unknown): SemanticMode {
  return value === "strict" ||
    value === "broad" ||
    value === "related" ||
    value === "mood" ||
    value === "evocative" ||
    value === "concrete" ||
    value === "actions" ||
    value === "sensory"
    ? value
    : DEFAULT_FILTERS.semanticMode;
}

function qualityModeValue(value: unknown): QualityMode {
  return value === "balanced" || value === "common" || value === "surprising"
    ? value
    : DEFAULT_FILTERS.qualityMode;
}

function prepareGenerationFilters(filters: Filters): Filters {
  if (filters.useSeededGeneration) return filters;
  return {
    ...filters,
    seed: createRandomSeed(),
  };
}

function createRandomSeed() {
  return String(Math.floor(100000000 + Math.random() * 900000000));
}

function exportMime(format: ExportFormat) {
  if (format === "json") return "application/json";
  if (format === "csv") return "text/csv";
  return "text/plain";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return initialValue;
      const parsed = JSON.parse(stored) as T;
      if (isPlainObject(initialValue) && isPlainObject(parsed)) {
        return { ...initialValue, ...parsed } as T;
      }
      return parsed;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default App;
