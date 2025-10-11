import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_PREFIX = "oldauta.pref";

const memoryFallback = new Map<string, unknown>();

const getStorageKey = (key: string) => `${STORAGE_PREFIX}:${key}`;

const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const readFromStorage = <T>(key: string): T | undefined => {
  if (isBrowser) {
    try {
      const raw = window.localStorage.getItem(getStorageKey(key));
      if (raw == null) return undefined;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.warn("Failed to read preference", key, error);
    }
  }

  if (memoryFallback.has(key)) {
    return memoryFallback.get(key) as T;
  }

  return undefined;
};

const writeToStorage = <T>(key: string, value: T) => {
  if (isBrowser) {
    try {
      window.localStorage.setItem(getStorageKey(key), JSON.stringify(value));
    } catch (error) {
      console.warn("Failed to persist preference", key, error);
    }
  }

  memoryFallback.set(key, value);
};

export const clearPreference = (key: string) => {
  if (isBrowser) {
    try {
      window.localStorage.removeItem(getStorageKey(key));
    } catch (error) {
      console.warn("Failed to remove preference", key, error);
    }
  }
  memoryFallback.delete(key);
};

export const getPreference = <T>(key: string, defaultValue: T): T => {
  const stored = readFromStorage<T>(key);
  if (stored === undefined) {
    return defaultValue;
  }
  return stored;
};

export const setPreference = <T>(key: string, value: T) => {
  writeToStorage(key, value);
};

export const usePreference = <T>(key: string, defaultValue: T) => {
  const stableDefault = useMemo(() => defaultValue, [defaultValue]);
  const [value, setValue] = useState<T>(() => getPreference(key, stableDefault));

  useEffect(() => {
    setValue(getPreference(key, stableDefault));
  }, [key, stableDefault]);

  useEffect(() => {
    if (!isBrowser) return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== getStorageKey(key)) return;
      setValue(event.newValue ? (JSON.parse(event.newValue) as T) : stableDefault);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, stableDefault]);

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
        setPreference(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, update] as const;
};
