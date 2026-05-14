import {
  Bookmark,
  Database,
  Download,
  HelpCircle,
  Link,
  Loader2,
  RotateCcw,
  Settings,
  Shuffle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Toggle } from "./components/controls";
import { HelpDialog, SettingsDialog } from "./components/dialogs";
import { CriteriaPanel, HistoryPanel, ThemePanel, WordSetCard } from "./components/generatorPanels";
import {
  APP_VERSION,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_FILTERS,
  QUALITY_LABELS,
  type DisplaySettings,
} from "./constants";
import { loadWordDatabase, localPoolCriteriaKey, queryWords, type WordDatabase } from "./data";
import { fetchSemanticWords } from "./datamuse";
import { generateSets } from "./generator";
import { usePersistentState } from "./hooks/usePersistentState";
import { useResolvedUiTheme } from "./hooks/useResolvedUiTheme";
import { useWordDefinitions } from "./hooks/useWordDefinitions";
import { exportFileName, exportMime, serializeDiagnostics, serializeSets } from "./services/exportService";
import { mergeById, parseSavedWorkspace, serializeSavedWorkspace } from "./services/importService";
import { createShareUrl, readSharedCriteriaFromUrl } from "./services/shareLink";
import { createId } from "./services/valueUtils";
import type {
  AppView,
  Collection,
  DiagnosticExportContext,
  DiagnosticRow,
  ExportFormat,
  Filters,
  GeneratedSet,
  HistoryEntry,
  SavedSet,
  WordEntry,
} from "./types";
import {
  copyWords,
  createRandomSeed,
  downloadBlob,
  getGenerationWarnings,
  prepareGenerationFilters,
} from "./utils/appUi";
import { AboutDataView } from "./views/AboutDataView";
import { DiagnosticsView } from "./views/DiagnosticsView";
import { CollectionsView, SavedSetsView } from "./views/libraryViews";
import { ManualView } from "./views/ManualView";

function App() {
  const [view, setView] = usePersistentState<AppView>("random-words:view:v1", "generator");
  const [wordDb, setWordDb] = useState<WordDatabase | null>(null);
  const [filters, setFilters] = usePersistentState<Filters>("random-words:filters:v1", DEFAULT_FILTERS);
  const [displaySettings, setDisplaySettings] = usePersistentState<DisplaySettings>(
    "random-words:display:v1",
    DEFAULT_DISPLAY_SETTINGS,
  );
  const [basePool, setBasePool] = useState<WordEntry[]>([]);
  const [basePoolKey, setBasePoolKey] = useState("");
  const [semanticPool, setSemanticPool] = useState<WordEntry[]>([]);
  const [sets, setSets] = usePersistentState<GeneratedSet[]>("random-words:current-sets:v1", []);
  const [history, setHistory] = usePersistentState<HistoryEntry[]>("random-words:history:v1", []);
  const [savedSets, setSavedSets] = usePersistentState<SavedSet[]>("random-words:saved:v1", []);
  const [collections, setCollections] = usePersistentState<Collection[]>("random-words:collections:v1", []);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const [collectionName, setCollectionName] = useState("");
  const [activeDialog, setActiveDialog] = useState<"help" | "settings" | null>(null);
  const [status, setStatus] = useState("Loading word database...");
  const [toast, setToast] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const activeUiTheme = useResolvedUiTheme(displaySettings.uiTheme);
  const { definitions, clearDefinitions } = useWordDefinitions(sets);
  const activeLocalPoolKey = useMemo(() => localPoolCriteriaKey(filters), [filters]);

  useEffect(() => {
    const sharedCriteria = readSharedCriteriaFromUrl(window.location.href);
    if (sharedCriteria.status === "none") return;
    if (sharedCriteria.status === "invalid") {
      setView("generator");
      setToast("Could not load shared criteria. The link may be incomplete or malformed.");
      return;
    }
    setFilters(sharedCriteria.filters);
    setView("generator");
    setToast(`Loaded shared criteria${sharedCriteria.summary ? `: ${sharedCriteria.summary}` : ""}`);
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
    setBasePoolKey(activeLocalPoolKey);
  }, [wordDb, activeLocalPoolKey]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function handleGenerate(requestedFilters = filters) {
    if (!wordDb) return;
    const nextFilters = prepareGenerationFilters(requestedFilters);
    if (nextFilters.seed !== filters.seed || nextFilters.useSeededGeneration !== filters.useSeededGeneration) {
      setFilters(nextFilters);
    }
    setIsGenerating(true);
    setStatus("");
    try {
      const semanticLookup = await fetchSemanticWords(nextFilters);
      const semanticWords = semanticLookup.words;
      const generated = generateSets(getLocalPool(wordDb, nextFilters), semanticWords, nextFilters, {
        preservedSets: sets,
      });
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
      } else if (semanticLookup.warning) {
        setStatus(semanticLookup.warning);
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
      const semanticLookup = await fetchSemanticWords(nextFilters);
      const semanticWords = semanticLookup.words;
      const [replacement] = generateSets(getLocalPool(wordDb, nextFilters), semanticWords, nextFilters, {
        preservedSets: [sets[targetIndex]],
      });
      if (!replacement) return;
      setSemanticPool(semanticWords);
      setSets((current) => current.map((set, index) => (index === targetIndex ? replacement : set)));
      if (semanticLookup.warning) setStatus(semanticLookup.warning);
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

  function applyFilters(patch: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function getLocalPool(db: WordDatabase, nextFilters: Filters) {
    const nextLocalPoolKey = localPoolCriteriaKey(nextFilters);
    if (nextLocalPoolKey === basePoolKey) return basePool;
    return queryWords(db.db, nextFilters);
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
    downloadBlob(blob, exportFileName("random-word-sets", format, filters));
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
    const href = createShareUrl(window.location.href, filters);
    window.history.replaceState(null, "", href);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(href);
      setToast("Copied criteria link to clipboard");
    } catch {
      setToast("Criteria link added to the address bar. Copy it from there.");
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

  function togglePinnedWord(setIndex: number, wordIndex: number) {
    setSets((current) =>
      current.map((set, currentSetIndex) =>
        currentSetIndex === setIndex
          ? {
              ...set,
              words: set.words.map((entry, currentWordIndex) =>
                currentWordIndex === wordIndex ? { ...entry, pinned: !entry.pinned } : entry,
              ),
            }
          : set,
      ),
    );
  }

  function editWord(setIndex: number, wordIndex: number, word: string) {
    const trimmed = word.trim();
    if (!trimmed) return;
    setSets((current) =>
      current.map((set, currentSetIndex) =>
        currentSetIndex === setIndex
          ? {
              ...set,
              words: set.words.map((entry, currentWordIndex) =>
                currentWordIndex === wordIndex ? manualWordEntry(trimmed, entry) : entry,
              ),
            }
          : set,
      ),
    );
  }

  function removeWord(setIndex: number, wordIndex: number) {
    setSets((current) =>
      current.map((set, currentSetIndex) =>
        currentSetIndex === setIndex
          ? {
              ...set,
              words: set.words.filter((_, currentWordIndex) => currentWordIndex !== wordIndex),
            }
          : set,
      ),
    );
  }

  function addWord(setIndex: number, word: string) {
    const trimmed = word.trim();
    if (!trimmed) return;
    setSets((current) =>
      current.map((set, currentSetIndex) =>
        currentSetIndex === setIndex
          ? {
              ...set,
              words: [...set.words, manualWordEntry(trimmed)],
            }
          : set,
      ),
    );
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
    localStorage.removeItem("random-words:datamuse-cache:v5");
    localStorage.removeItem("random-words:definition-cache:v1");
    localStorage.removeItem("random-words:definition-cache:v2");
    clearDefinitions();
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
  const generationWarnings = useMemo(
    () => getGenerationWarnings(filters, sets, basePool.length, semanticStats),
    [filters, sets, basePool.length, semanticStats],
  );

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
          <CriteriaPanel
            filters={filters}
            updateFilter={updateFilter}
            applyFilters={applyFilters}
            reset={() => setFilters(DEFAULT_FILTERS)}
          />

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
                <button onClick={() => exportCurrentSets()} disabled={sets.length === 0}>
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
                  <input aria-label="Seed value" value={filters.seed} onChange={(event) => updateFilter("seed", event.target.value)} />
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

            {generationWarnings.length > 0 && (
              <div className="warning-list" role="status" aria-label="Generation warnings">
                {generationWarnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            )}

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
                    showInlineDefinitions={displaySettings.showInlineDefinitions}
                    onCopy={(words) => void copyWords(words, setToast)}
                    onSave={() => saveSet(set, index)}
                    onRegenerate={() => void handleRegenerateSet(index)}
                    onTogglePin={(wordIndex) => togglePinnedWord(index, wordIndex)}
                    onEditWord={(wordIndex, word) => editWord(index, wordIndex, word)}
                    onRemoveWord={(wordIndex) => removeWord(index, wordIndex)}
                    onAddWord={(word) => addWord(index, word)}
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
              warnings={generationWarnings}
              exportDiagnostics={(rows, format, context) => {
                const blob = new Blob([serializeDiagnostics(rows, format, filters, semanticStats, context)], {
                  type: exportMime(format),
                });
                downloadBlob(blob, exportFileName("random-words-diagnostics", format, filters));
              }}
            />
          )}
          {view === "about" && <AboutDataView wordDb={wordDb} />}
          {view === "manual" && <ManualView />}
        </main>
      )}

      <div className="bottom-line">
        <span>All DB words are lowercase. Filters apply to normalized forms.</span>
        <span>{generatedWordCount} generated words visible</span>
        <span>Version {APP_VERSION}</span>
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

function manualWordEntry(word: string, previous?: WordEntry): WordEntry {
  const normalized = word.trim().toLowerCase().replace(/\s+/g, " ");
  const length = normalized.replace(/[^a-z]/g, "").length || normalized.length;
  return {
    id: previous?.manual ? previous.id : -Date.now(),
    word: normalized,
    length,
    pos: previous?.pos ?? "noun",
    alternatePos: previous?.alternatePos ?? [],
    baseForm: normalized,
    posSource: previous?.posSource ?? "default",
    posConfidence: previous?.posConfidence ?? 40,
    commonness: previous?.commonness ?? "common",
    source: previous?.source ?? "scowl",
    score: previous?.score ?? 1,
    qualityScore: previous?.qualityScore ?? 1,
    semanticScore: previous?.semanticScore,
    semanticSource: previous?.semanticSource,
    frequencyBand: previous?.frequencyBand ?? "manual",
    isPhrase: /\s/.test(normalized),
    pinned: previous?.pinned,
    manual: true,
  };
}

export default App;
