import { useEffect, useMemo, useState } from "react";
import { listenList, listenObject } from "./db";

export function useList<T>(path: string) {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = listenList<T>(path, (v) => {
      setItems(v);
      setReady(true);
    });
    return unsub;
  }, [path]);

  return useMemo(() => ({ items, ready }), [items, ready]);
}

export function useObject<T>(path: string) {
  const [value, setValue] = useState<T | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = listenObject<T>(path, (v) => {
      setValue(v);
      setReady(true);
    });
    return unsub;
  }, [path]);

  return useMemo(() => ({ value, ready }), [value, ready]);
}
