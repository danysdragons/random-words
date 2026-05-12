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
  Upload,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { loadWordDatabase, queryWords, type WordDatabase } from "./data";
import { fetchDefinitions, fetchSemanticWords } from "./datamuse";
import { generateSets } from "./generator";
import userManualMarkdown from "../docs/user-manual.md?raw";
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

interface DisplaySettings {
  showWordDetails: boolean;
  uiTheme: UiTheme;
}

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  showWordDetails: false,
  uiTheme: "system",
};

type UiTheme =
  | "system"
  | "light"
  | "dark"
  | "high-contrast"
  | "ink"
  | "forest"
  | "ocean"
  | "sunrise"
  | "solar-light"
  | "solar-dark";

type ResolvedUiTheme = Exclude<UiTheme, "system">;

const UI_THEME_LABELS: Record<UiTheme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
  "high-contrast": "High Contrast",
  ink: "Ink",
  forest: "Forest",
  ocean: "Ocean",
  sunrise: "Sunrise",
  "solar-light": "Solar Light",
  "solar-dark": "Solar Dark",
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
  const [displaySettings, setDisplaySettings] = usePersistentState<DisplaySettings>(
    "random-words:display:v1",
    DEFAULT_DISPLAY_SETTINGS,
  );
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
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const activeUiTheme = resolveUiTheme(displaySettings.uiTheme, systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemPrefersDark(media.matches);
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.uiTheme = activeUiTheme;
    document.documentElement.style.colorScheme = activeUiTheme === "light" || activeUiTheme === "solar-light" ? "light" : "dark";
  }, [activeUiTheme]);

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
    const visibleEntries = sets.flatMap((set) => set.words);
    if (!visibleEntries.length) {
      setDefinitions({});
      return;
    }
    let active = true;
    fetchDefinitions(visibleEntries).then((nextDefinitions) => {
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

  function exportSavedWorkspace() {
    const blob = new Blob([serializeSavedWorkspace(savedSets, collections)], {
      type: "application/json",
    });
    downloadBlob(blob, "random-words-library.json");
  }

  async function importSavedWorkspace(file: File | null) {
    if (!file) return;
    try {
      const imported = parseSavedWorkspace(await file.text());
      setCollections((current) => mergeById(current, imported.collections));
      setSavedSets((current) => mergeById(current, imported.savedSets));
      setToast(
        `Imported ${imported.savedSets.length} saved sets and ${imported.collections.length} collections`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to import saved library.");
    }
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
    localStorage.removeItem("random-words:datamuse-cache:v2");
    localStorage.removeItem("random-words:datamuse-cache:v3");
    localStorage.removeItem("random-words:datamuse-cache:v4");
    localStorage.removeItem("random-words:definition-cache:v1");
    localStorage.removeItem("random-words:definition-cache:v2");
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

  const semanticStats = useMemo(() => {
    const baseWords = new Set(basePool.map((entry) => entry.word));
    const localMatches = semanticPool.filter((entry) => baseWords.has(entry.word)).length;
    const generatedSemanticWords = sets.flatMap((set) => set.words).filter((entry) => entry.semanticScore).length;
    return {
      total: semanticPool.length,
      localMatches,
      datamuseOnly: Math.max(0, semanticPool.length - localMatches),
      generatedSemanticWords,
    };
  }, [basePool, semanticPool, sets]);

  const collectionCounts = useMemo(() => {
    const counts = new Map<string | null, number>();
    for (const saved of savedSets) {
      counts.set(saved.collectionId, (counts.get(saved.collectionId) ?? 0) + 1);
    }
    return counts;
  }, [savedSets]);

  return (
    <div className="app-shell" data-ui-theme={activeUiTheme}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">RW</div>
          <div>
            <strong>Random Words</strong>
            <span>Word & phrase sets for creators</span>
          </div>
        </div>
        <nav aria-label="Primary">
          <button className={view === "generator" ? "active" : ""} aria-current={view === "generator" ? "page" : undefined} onClick={() => setView("generator")}>
            Generator
          </button>
          <button className={view === "saved" ? "active" : ""} aria-current={view === "saved" ? "page" : undefined} onClick={() => setView("saved")}>
            Saved Sets
          </button>
          <button className={view === "collections" ? "active" : undefined} aria-current={view === "collections" ? "page" : undefined} onClick={() => setView("collections")}>
            Collections
          </button>
          <button className={view === "diagnostics" ? "active" : ""} aria-current={view === "diagnostics" ? "page" : undefined} onClick={() => setView("diagnostics")}>
            Diagnostics
          </button>
          <button className={view === "about" ? "active" : ""} aria-current={view === "about" ? "page" : undefined} onClick={() => setView("about")}>
            About Data
          </button>
          <button className={view === "manual" ? "active" : ""} aria-current={view === "manual" ? "page" : undefined} onClick={() => setView("manual")}>
            Manual
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
              {semanticStats.total > 0 && (
                <div className="metric">
                  Semantic matches <strong>{semanticStats.total.toLocaleString()}</strong>
                </div>
              )}
              {semanticStats.total > 0 && (
                <div className="metric">
                  Local semantic data{" "}
                  <strong>
                    {semanticStats.localMatches.toLocaleString()} local ·{" "}
                    {semanticStats.datamuseOnly.toLocaleString()} Datamuse-only
                  </strong>
                </div>
              )}
              {semanticStats.generatedSemanticWords > 0 && (
                <div className="metric">
                  Themed output <strong>{semanticStats.generatedSemanticWords.toLocaleString()} words</strong>
                </div>
              )}
            </div>

            {(status || toast) && <div className="notice" role="status">{toast || status}</div>}

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
                    showDetails={displaySettings.showWordDetails}
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
              importWorkspace={(file) => void importSavedWorkspace(file)}
              exportWorkspace={exportSavedWorkspace}
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
          {view === "diagnostics" && (
            <DiagnosticsView
              sets={sets}
              filters={filters}
              basePoolSize={basePool.length}
              semanticStats={semanticStats}
            />
          )}
          {view === "about" && <AboutDataView wordDb={wordDb} />}
          {view === "manual" && <ManualView />}
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
          displaySettings={displaySettings}
          updateDisplaySettings={setDisplaySettings}
          activeUiTheme={activeUiTheme}
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

function WordSetCard({
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
            {showDetails && (
              <span className="word-details">
                {entry.baseForm !== entry.word && `base ${entry.baseForm} · `}
                {(entry.alternatePos?.length ?? 0) > 0 && `also ${entry.alternatePos.map(posShort).join("/")} · `}
                {entry.semanticScore && `semantic ${semanticStrengthLabel(entry.semanticScore)} · `}
                {posSourceLabel(entry.posSource)} · {entry.posConfidence}%
              </span>
            )}
            {definitions[entry.word] && (
              <span className="definition-tooltip" role="tooltip">
                <strong>{entry.frequencyBand}</strong>
                {definitions[entry.word]}
                {showDetails && (
                  <span className="tooltip-meta">
                    {entry.baseForm !== entry.word ? `Base ${entry.baseForm} · ` : ""}
                    {(entry.alternatePos?.length ?? 0) > 0 ? `Also ${entry.alternatePos.map(posShort).join("/")} · ` : ""}
                    {entry.semanticScore ? `Semantic ${semanticStrengthLabel(entry.semanticScore)} · ` : ""}
                    POS {posSourceLabel(entry.posSource).toLowerCase()} · {entry.posConfidence}% confidence
                  </span>
                )}
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
  importWorkspace,
  exportWorkspace,
  updateSavedCollection,
  removeSavedSet,
  restore,
  copy,
}: {
  savedSets: SavedSet[];
  collections: Collection[];
  importWorkspace: (file: File | null) => void;
  exportWorkspace: () => void;
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
        <div className="library-actions">
          <label className="file-button">
            <Upload size={16} />
            Import library
            <input
              type="file"
              accept="application/json,.json"
              aria-label="Import saved library"
              onChange={(event) => {
                importWorkspace(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <button onClick={exportWorkspace} disabled={savedSets.length === 0 && collections.length === 0}>
            <Download size={16} />
            Export library
          </button>
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

function DiagnosticsView({
  sets,
  filters,
  basePoolSize,
  semanticStats,
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
}) {
  const [query, setQuery] = useState("");
  const [rowFilter, setRowFilter] = useState<"all" | "low-confidence" | "semantic" | "datamuse-only" | "fallback">("all");
  const generatedEntries = sets.flatMap((set, setIndex) =>
    set.words.map((entry, wordIndex) => ({ entry, setIndex, wordIndex })),
  );
  const lowConfidenceCount = generatedEntries.filter(({ entry }) => entry.posConfidence < 70).length;
  const datamuseOnlyCount = generatedEntries.filter(({ entry }) => entry.source === "datamuse").length;
  const semanticOutputCount = generatedEntries.filter(({ entry }) => entry.semanticScore).length;
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
      </div>

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
          {wordDb?.meta?.quality?.posMorphology && (
            <p>
              {wordDb.meta.quality.posMorphology.toLocaleString()} morphology-derived POS tags ·{" "}
              {wordDb.meta.quality.posLowConfidence?.toLocaleString()} low-confidence POS tags ·{" "}
              {(wordDb.meta.quality.posAlternates ?? 0).toLocaleString()} alternate POS entries
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

function ManualView() {
  return (
    <section className="main-panel library-panel manual-panel">
      <div className="section-head">
        <div>
          <h1>User manual</h1>
          <p>Complete operating guide for Random Words.</p>
        </div>
      </div>
      <MarkdownDocument markdown={userManualMarkdown} />
    </section>
  );
}

function MarkdownDocument({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n{2,}/);
  return (
    <article className="manual-content">
      {blocks.map((block, index) => renderMarkdownBlock(block, index))}
    </article>
  );
}

function renderMarkdownBlock(block: string, index: number) {
  const trimmed = block.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("# ")) return <h1 key={index}>{trimmed.slice(2)}</h1>;
  if (trimmed.startsWith("## ")) return <h2 key={index}>{trimmed.slice(3)}</h2>;
  if (trimmed.startsWith("### ")) return <h3 key={index}>{trimmed.slice(4)}</h3>;
  if (trimmed.split("\n").every((line) => line.startsWith("- "))) {
    return (
      <ul key={index}>
        {trimmed.split("\n").map((line, lineIndex) => (
          <li key={`${index}-${lineIndex}`}>{renderInlineMarkdown(line.slice(2))}</li>
        ))}
      </ul>
    );
  }
  if (trimmed.split("\n").every((line) => /^\d+\.\s/.test(line))) {
    return (
      <ol key={index}>
        {trimmed.split("\n").map((line, lineIndex) => (
          <li key={`${index}-${lineIndex}`}>{renderInlineMarkdown(line.replace(/^\d+\.\s/, ""))}</li>
        ))}
      </ol>
    );
  }
  return <p key={index}>{renderInlineMarkdown(trimmed.replace(/\n/g, " "))}</p>;
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    return part;
  });
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
  displaySettings,
  updateDisplaySettings,
  activeUiTheme,
}: {
  close: () => void;
  resetFilters: () => void;
  clearDatamuseCache: () => void;
  clearWorkspaceData: () => void;
  displaySettings: DisplaySettings;
  updateDisplaySettings: (settings: DisplaySettings) => void;
  activeUiTheme: ResolvedUiTheme;
}) {
  return (
    <Modal title="Settings" close={close}>
      <div className="dialog-section">
        <h3>Display</h3>
        <div className="field compact">
          <label htmlFor="ui-theme-select">UI theme</label>
          <select
            id="ui-theme-select"
            value={displaySettings.uiTheme}
            onChange={(event) => updateDisplaySettings({ ...displaySettings, uiTheme: uiThemeValue(event.target.value) })}
          >
            {(Object.keys(UI_THEME_LABELS) as UiTheme[]).map((theme) => (
              <option key={theme} value={theme}>
                {UI_THEME_LABELS[theme]}
              </option>
            ))}
          </select>
          <p className="muted">
            {displaySettings.uiTheme === "system"
              ? `Following system preference: ${UI_THEME_LABELS[activeUiTheme]}.`
              : `${UI_THEME_LABELS[displaySettings.uiTheme]} is pinned for this browser.`}
          </p>
        </div>
        <Toggle
          label="Show word details"
          checked={displaySettings.showWordDetails}
          onChange={(checked) => updateDisplaySettings({ ...displaySettings, showWordDetails: checked })}
        />
        <p className="muted">Adds base form, POS source, and confidence to generated word tiles.</p>
      </div>
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
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2 id={titleId}>{title}</h2>
          <button ref={closeButtonRef} onClick={close} aria-label="Close">
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
  const id = useId();
  return (
    <div className="field">
      <label id={id}>{label}</label>
      <div className="number-control">
        <input aria-labelledby={id} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <button aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>-</button>
        <button aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
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
  const id = useId();
  return (
    <div className="field compact">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
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
      <button
        className={checked ? "toggle on" : "toggle"}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
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

function posSourceLabel(source: WordEntry["posSource"]) {
  return {
    override: "Curated",
    morphology: "Morphology",
    suffix: "Suffix",
    default: "Default",
    datamuse: "Datamuse",
  }[source];
}

function semanticStrengthLabel(score: number) {
  if (score >= 50000) return "very strong";
  if (score >= 10000) return "strong";
  if (score >= 2000) return "moderate";
  return "light";
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
      "exported_at,set,position,word,part_of_speech,alternate_pos,frequency_band,quality_score,source,semantic_score,semantic_source,set_theme,criteria_theme,semantic_mode,quality_mode,seed_mode,seed",
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

function serializeSavedWorkspace(savedSets: SavedSet[], collections: Collection[]) {
  return JSON.stringify(
    {
      app: "random-words",
      version: 1,
      exportedAt: new Date().toISOString(),
      collections,
      savedSets,
    },
    null,
    2,
  );
}

function parseSavedWorkspace(text: string) {
  const payload = JSON.parse(text) as unknown;
  if (!isPlainObject(payload)) throw new Error("Import file is not a valid Random Words library.");
  const collections = arrayValue(payload.collections)
    .map(normalizeImportedCollection)
    .filter((collection): collection is Collection => Boolean(collection));
  const savedSets = arrayValue(payload.savedSets)
    .map(normalizeImportedSavedSet)
    .filter((saved): saved is SavedSet => Boolean(saved));
  if (!collections.length && !savedSets.length) {
    throw new Error("Import file did not contain saved sets or collections.");
  }
  return { collections, savedSets };
}

function normalizeImportedCollection(value: unknown): Collection | null {
  if (!isPlainObject(value)) return null;
  const id = stringValue(value.id).trim() || createId("collection");
  const name = stringValue(value.name).trim();
  if (!name) return null;
  return {
    id,
    name,
    createdAt: parseDateString(value.createdAt) ?? new Date().toISOString(),
  };
}

function normalizeImportedSavedSet(value: unknown): SavedSet | null {
  if (!isPlainObject(value)) return null;
  const set = normalizeImportedGeneratedSet(value.set);
  if (!set) return null;
  return {
    id: stringValue(value.id).trim() || createId("saved"),
    name: stringValue(value.name).trim() || `${set.theme || "Imported"} Set`,
    set,
    savedAt: parseDateString(value.savedAt) ?? new Date().toISOString(),
    collectionId: stringValue(value.collectionId).trim() || null,
  };
}

function normalizeImportedGeneratedSet(value: unknown): GeneratedSet | null {
  if (!isPlainObject(value)) return null;
  const words = arrayValue(value.words)
    .map(normalizeImportedWordEntry)
    .filter((entry): entry is WordEntry => Boolean(entry));
  if (!words.length) return null;
  return {
    id: stringValue(value.id).trim() || createId("set"),
    words,
    theme: stringValue(value.theme),
    createdAt: parseDateString(value.createdAt) ?? new Date().toISOString(),
  };
}

function normalizeImportedWordEntry(value: unknown): WordEntry | null {
  if (!isPlainObject(value)) return null;
  const word = stringValue(value.word).trim().toLowerCase();
  if (!word) return null;
  const pos = POS_OPTIONS.includes(value.pos as PartOfSpeech) ? (value.pos as PartOfSpeech) : "other";
  return {
    id: boundedNumber(value.id, -Date.now(), Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
    word,
    length: boundedNumber(value.length, word.replace(/[^a-z]/g, "").length, 0, 100),
    pos,
    alternatePos: importedPosList(value.alternatePos),
    baseForm: stringValue(value.baseForm).trim() || word,
    posSource: posSourceValue(value.posSource),
    posConfidence: boundedNumber(value.posConfidence, 30, 0, 100),
    commonness: value.commonness === "rare" ? "rare" : "common",
    source: value.source === "datamuse" ? "datamuse" : "scowl",
    score: boundedNumber(value.score, 0, 0, Number.MAX_SAFE_INTEGER),
    qualityScore: boundedNumber(value.qualityScore, 1, 0, 100),
    semanticScore: optionalNumber(value.semanticScore),
    semanticSource: value.semanticSource === "datamuse" ? "datamuse" : value.semanticSource === "local" ? "local" : undefined,
    frequencyBand: stringValue(value.frequencyBand).trim() || "imported",
    isPhrase: Boolean(value.isPhrase),
  };
}

function mergeById<T extends { id: string }>(current: T[], imported: T[]) {
  const existing = new Set(current.map((item) => item.id));
  return [...current, ...imported.filter((item) => !existing.has(item.id))];
}

function importedPosList(value: unknown): PartOfSpeech[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PartOfSpeech => POS_OPTIONS.includes(item as PartOfSpeech));
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function parseDateString(value: unknown) {
  const text = stringValue(value);
  return Number.isNaN(Date.parse(text)) ? null : text;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function posSourceValue(value: unknown): WordEntry["posSource"] {
  if (value === "override" || value === "morphology" || value === "suffix" || value === "default" || value === "datamuse") {
    return value;
  }
  return "default";
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

function uiThemeValue(value: unknown): UiTheme {
  return typeof value === "string" && value in UI_THEME_LABELS ? (value as UiTheme) : DEFAULT_DISPLAY_SETTINGS.uiTheme;
}

function resolveUiTheme(theme: UiTheme, systemPrefersDark: boolean): ResolvedUiTheme {
  if (theme === "system") return systemPrefersDark ? "dark" : "light";
  return theme;
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
