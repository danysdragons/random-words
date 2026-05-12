import {
  Bookmark,
  Copy,
  Database,
  Download,
  HelpCircle,
  History,
  Info,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Shuffle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadWordDatabase, queryWords, type WordDatabase } from "./data";
import { fetchSemanticWords } from "./datamuse";
import { generateSets } from "./generator";
import type {
  Dialect,
  Filters,
  GeneratedSet,
  PartOfSpeech,
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
  "Ocean Mystery",
  "Forest Adventure",
  "Ancient Myth",
  "Space Colony",
  "Lost Technology",
  "Cozy Fantasy",
  "City Night",
  "Stormy Weather",
  "Dream Logic",
  "Tools & Craft",
];

const DEFAULT_FILTERS: Filters = {
  wordsPerSet: 12,
  setCount: 3,
  minLength: 2,
  maxLength: 12,
  includeRare: false,
  selectedPos: ["noun", "verb", "adjective"],
  dialect: "us",
  startsWith: "",
  endsWith: "",
  contains: "",
  excludes: "",
  uniqueWords: true,
  excludeOffensive: true,
  noProperNouns: true,
  noContractions: true,
  noHyphenated: true,
  theme: "",
  semanticMode: "broad",
  includePhrases: false,
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
};

function App() {
  const [wordDb, setWordDb] = useState<WordDatabase | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [basePool, setBasePool] = useState<WordEntry[]>([]);
  const [semanticPool, setSemanticPool] = useState<WordEntry[]>([]);
  const [sets, setSets] = useState<GeneratedSet[]>([]);
  const [history, setHistory] = useState<GeneratedSet[][]>([]);
  const [status, setStatus] = useState("Loading word database...");
  const [isGenerating, setIsGenerating] = useState(false);

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

  async function handleGenerate(nextFilters = filters) {
    if (!wordDb) return;
    setIsGenerating(true);
    setStatus("");
    try {
      const semanticWords = await fetchSemanticWords(nextFilters);
      const generated = generateSets(queryWords(wordDb.db, nextFilters), semanticWords, nextFilters);
      setSemanticPool(semanticWords);
      setSets(generated);
      setHistory((current) => [generated, ...current].slice(0, 8));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function randomizeSeed() {
    updateFilter("seed", String(Math.floor(100000 + Math.random() * 900000)));
  }

  function handleShuffle() {
    const nextFilters = {
      ...filters,
      seed: String(Number(filters.seed) + 1 || Math.floor(100000 + Math.random() * 900000)),
    };
    setFilters(nextFilters);
    void handleGenerate(nextFilters);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ filters, sets }, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, "random-word-sets.json");
  }

  const generatedWordCount = useMemo(
    () => sets.reduce((total, set) => total + set.words.length, 0),
    [sets],
  );

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
          <a className="active">Generator</a>
          <a>Saved Sets</a>
          <a>Collections</a>
          <a href="#about-data">About Data</a>
        </nav>
        <div className="top-actions">
          <HelpCircle size={18} />
          <Settings size={18} />
        </div>
      </header>

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
          </div>

          <div className="toolbar">
            <button className="primary" onClick={() => void handleGenerate()} disabled={isGenerating || !wordDb}>
              {isGenerating ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
              Generate
            </button>
            <button onClick={handleShuffle}>
              <Shuffle size={18} />
              Shuffle
            </button>
            <button onClick={() => setSets([])}>
              <Trash2 size={18} />
              Clear
            </button>
            <button onClick={exportJson}>
              <Download size={18} />
              Export
            </button>
          </div>

          <div className="status-row">
            <label>
              <span>Seed</span>
              <input value={filters.seed} onChange={(event) => updateFilter("seed", event.target.value)} />
              <button className="icon" onClick={randomizeSeed} aria-label="Randomize seed">
                <RotateCcw size={15} />
              </button>
            </label>
            <div className="metric">
              Filtered pool size <strong>{basePool.length.toLocaleString()}</strong>
            </div>
            <div className="metric">
              Commonness <strong>{filters.includeRare ? "Expanded" : "Balanced"}</strong>
            </div>
            {semanticPool.length > 0 && (
              <div className="metric">
                Semantic matches <strong>{semanticPool.length.toLocaleString()}</strong>
              </div>
            )}
          </div>

          {status && <div className="notice">{status}</div>}

          <div className="sets">
            {sets.length === 0 ? (
              <div className="empty-state">
                <Sparkles size={24} />
                <h2>Ready to generate</h2>
                <p>Choose criteria, add an optional theme, and generate reproducible sets.</p>
              </div>
            ) : (
              sets.map((set, index) => <WordSetCard key={set.id} set={set} index={index} />)
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
          <HistoryPanel history={history} restore={(restored) => setSets(restored)} />
        </aside>
      </main>

      <div className="bottom-line">
        <span>All DB words are lowercase. Filters apply to normalized forms.</span>
        <span>{generatedWordCount} generated words visible</span>
      </div>
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
          {THEME_PRESETS.map((preset) => (
            <button key={preset} onClick={() => updateFilter("theme", preset.toLowerCase())}>
              {preset}
            </button>
          ))}
        </div>
      </div>
      <button className="advanced">Advanced semantic options</button>
    </section>
  );
}

function WordSetCard({ set, index }: { set: GeneratedSet; index: number }) {
  return (
    <article className="set-card">
      <header>
        <div className="set-title">
          <span>{index + 1}</span>
          <h2>Set {index + 1}</h2>
        </div>
        <div className="set-actions">
          <button onClick={() => void copyWords(set.words)}>
            <Copy size={16} />
            Copy
          </button>
          <button>
            <Bookmark size={16} />
            Save
          </button>
          <button>
            <RefreshCw size={16} />
            Regenerate
          </button>
        </div>
      </header>
      <div className="word-grid">
        {set.words.map((entry, wordIndex) => (
          <div className="word-tile" key={`${entry.word}-${wordIndex}`}>
            <span className="word-number">{wordIndex + 1}</span>
            <strong>{entry.word}</strong>
            <small className={`pos pos-${entry.pos}`}>{posShort(entry.pos)}</small>
          </div>
        ))}
      </div>
    </article>
  );
}

function HistoryPanel({
  history,
  restore,
}: {
  history: GeneratedSet[][];
  restore: (sets: GeneratedSet[]) => void;
}) {
  return (
    <section className="panel history-panel">
      <div className="panel-title">
        <h2>Generation history</h2>
        <History size={17} />
      </div>
      {history.length === 0 ? (
        <p className="muted">Generated sets will appear here.</p>
      ) : (
        history.map((group, index) => (
          <button key={group[0]?.id ?? index} className="history-item" onClick={() => restore(group)}>
            <strong>{group[0]?.theme || "random"}</strong>
            <span>
              {group.length} sets · {group.reduce((total, set) => total + set.words.length, 0)} words
            </span>
          </button>
        ))
      )}
    </section>
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
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-row">
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

async function copyWords(words: WordEntry[]) {
  const text = words.map((item) => item.word).join(", ");
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    console.info("Clipboard write was not allowed by the browser.");
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default App;
