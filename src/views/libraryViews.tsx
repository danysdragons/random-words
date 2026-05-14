import { Bookmark, Copy, Download, Folder, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import type { Collection, GeneratedSet, SavedSet, WordEntry } from "../types";
import { formatDate } from "../utils/appUi";

export function SavedSetsView({
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

export function CollectionsView({
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
