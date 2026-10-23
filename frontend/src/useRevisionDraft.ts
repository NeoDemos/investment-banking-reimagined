import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
/** Public-prototype edit buffers: scoped to one workroom AND committed revision. */
export function useRevisionDraft<T>(
  scope: string,
  revision: number,
  initial: T,
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const key = `banking-public-draft:${scope}:r${revision}`,
    fallback = useRef(initial);
  fallback.current = initial;
  const read = (k: string) => {
    try {
      const raw = sessionStorage.getItem(k);
      return {
        value: raw === null ? fallback.current : (JSON.parse(raw) as T),
        dirty: raw !== null,
      };
    } catch {
      return { value: fallback.current, dirty: false };
    }
  };
  const [entry, setEntry] = useState(() => ({ key, ...read(key) }));
  useEffect(() => {
    if (entry.key !== key) {
      setEntry({ key, ...read(key) });
      return;
    }
    try {
      if (entry.dirty) sessionStorage.setItem(key, JSON.stringify(entry.value));
    } catch {
      /* Authoritative state is still saved explicitly to SQLite. */
    }
  }, [key, entry]);
  const value = entry.key === key ? entry.value : read(key).value;
  const set: Dispatch<SetStateAction<T>> = (action) =>
    setEntry((old) => {
      const prior = old.key === key ? old.value : read(key).value;
      return {
        key,
        dirty: true,
        value:
          typeof action === "function"
            ? (action as (old: T) => T)(prior)
            : action,
      };
    });
  return [
    value,
    set,
    () => {
      try {
        sessionStorage.removeItem(key);
      } catch {}
      setEntry({ key, value: fallback.current, dirty: false });
    },
  ];
}
