import { useRef, useState } from "react";

import { errorMessage } from "@/lib/errors";

export interface KeyedLoad<T> {
  data: T | null;
  error: string | null;
  reload: () => void;
}

/** Runs `load` during render whenever `key` changes or `reload` is called; answers from a superseded load are dropped. */
export function useKeyedLoad<T>(key: string, load: () => Promise<T>, enabled = true): KeyedLoad<T> {
  const [revision, setRevision] = useState(0);
  const loadKey = `${key}#${revision}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const latestLoad = useRef<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (enabled && loadedKey !== loadKey) {
    latestLoad.current = loadKey;
    setLoadedKey(loadKey);
    setError(null);
    void load()
      .then((next) => {
        if (latestLoad.current === loadKey) setData(next);
      })
      .catch((e: unknown) => {
        if (latestLoad.current === loadKey) setError(errorMessage(e));
      });
  }

  return { data, error, reload: () => setRevision((current) => current + 1) };
}
