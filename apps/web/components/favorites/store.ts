import { useCallback, useSyncExternalStore } from "react";

/** Separate key from `aurora-bookings`; stores stay slugs only. */
const KEY = "aurora-favorites";

export interface FavoritesState {
  slugs: readonly string[];
  /** False when the browser refuses to store data: favourites then live in memory only. */
  persisted: boolean;
}

const serverState: FavoritesState = { slugs: [], persisted: true };

let state: FavoritesState | null = null;
/** Kept when storage is blocked so the hearts still work during the visit. */
let memory: readonly string[] = [];
const listeners = new Set<() => void>();

function parse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return [...new Set(data.filter((v): v is string => typeof v === "string"))];
  } catch {
    return [];
  }
}

function read(): FavoritesState {
  try {
    const slugs = parse(window.localStorage.getItem(KEY));
    return { slugs, persisted: true };
  } catch {
    return { slugs: memory, persisted: false };
  }
}

function same(a: FavoritesState, b: FavoritesState) {
  return (
    a.persisted === b.persisted &&
    a.slugs.length === b.slugs.length &&
    a.slugs.every((s, i) => s === b.slugs[i])
  );
}

function refresh() {
  const next = read();
  if (state && same(state, next)) return false;
  state = next;
  return true;
}

function emit() {
  listeners.forEach((l) => l());
}

function getSnapshot(): FavoritesState {
  if (!state) refresh();
  return state ?? serverState;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    // Another tab changed the list (key === null means storage was cleared).
    if (e.key === KEY || e.key === null) {
      if (refresh()) emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(slugs: readonly string[]) {
  memory = slugs;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(slugs));
    state = { slugs, persisted: true };
  } catch {
    state = { slugs, persisted: false };
  }
  emit();
}

/** Adds the slug if absent, removes it if present. */
export function toggleFavorite(slug: string) {
  const current = getSnapshot().slugs;
  write(
    current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [slug, ...current],
  );
}

export function useFavorites() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, () => serverState);
  const has = useCallback((slug: string) => snap.slugs.includes(slug), [snap]);
  return { slugs: snap.slugs, persisted: snap.persisted, has };
}
