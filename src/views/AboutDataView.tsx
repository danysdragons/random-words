import { Database, FileText, Search } from "lucide-react";
import { APP_VERSION } from "../constants";
import type { WordDatabase } from "../data";

export function AboutDataView({ wordDb }: { wordDb: WordDatabase | null }) {
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
          {wordDb?.meta?.quality?.lemmaEntries && (
            <p>
              {wordDb.meta.quality.lemmaEntries.toLocaleString()} lemma-normalized entries ·{" "}
              {wordDb.meta.quality.familyKeys?.toLocaleString()} family keys ·{" "}
              {wordDb.meta.quality.syllableEntries?.toLocaleString()} syllable-counted entries
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
          <p>Release version: {APP_VERSION}</p>
        </article>
      </div>
    </section>
  );
}
