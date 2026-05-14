import { useEffect, useState } from "react";
import { isPlainObject } from "../services/valueUtils";

export function usePersistentState<T>(key: string, initialValue: T) {
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
