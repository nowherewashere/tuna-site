"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function getHash() {
  return window.location.hash.slice(1);
}

/**
 * A tab selector backed by the URL hash (e.g. `#devices`), so the active section
 * survives reloads and is shareable. The server snapshot is "" → falls back to the
 * default, which avoids a hydration mismatch on the static build.
 */
export function useHashTab<T extends string>(
  valid: readonly T[],
  fallback: T,
): [T, (t: T) => void] {
  const hash = useSyncExternalStore(subscribe, getHash, () => "");
  const tab = (valid as readonly string[]).includes(hash) ? (hash as T) : fallback;
  const setTab = (t: T) => {
    window.location.hash = t;
  };
  return [tab, setTab];
}
