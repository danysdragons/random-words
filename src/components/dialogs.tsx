import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import {
  UI_THEME_LABELS,
  uiThemeValue,
  type DisplaySettings,
  type ResolvedUiTheme,
  type UiTheme,
} from "../constants";
import { Toggle } from "./controls";

export function HelpDialog({ close }: { close: () => void }) {
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

export function SettingsDialog({
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

export function Modal({
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
