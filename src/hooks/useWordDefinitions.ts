import { useEffect, useState } from "react";
import { fetchDefinitions } from "../datamuse";
import type { GeneratedSet } from "../types";

export function useWordDefinitions(sets: GeneratedSet[]) {
  const [definitions, setDefinitions] = useState<Record<string, string>>({});

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

  return {
    definitions,
    clearDefinitions: () => setDefinitions({}),
  };
}
