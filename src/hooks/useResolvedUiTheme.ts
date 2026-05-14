import { useEffect, useMemo, useState } from "react";
import { resolveUiTheme, type ResolvedUiTheme, type UiTheme } from "../constants";

export function useResolvedUiTheme(uiTheme: UiTheme): ResolvedUiTheme {
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const activeUiTheme = useMemo(() => resolveUiTheme(uiTheme, systemPrefersDark), [uiTheme, systemPrefersDark]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemPrefersDark(media.matches);
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.uiTheme = activeUiTheme;
    document.documentElement.style.colorScheme =
      activeUiTheme === "light" || activeUiTheme === "solar-light" ? "light" : "dark";
  }, [activeUiTheme]);

  return activeUiTheme;
}
