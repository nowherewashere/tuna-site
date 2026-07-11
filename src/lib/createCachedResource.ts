"use client";
import { useEffect, useState } from "react";

export function createCachedResource<T>(fetcher: () => Promise<T>) {
  let cache: T | null = null;
  let inflight: Promise<T> | null = null;

  function load(): Promise<T> {
    if (!inflight) {
      inflight = fetcher().then(
        (v) => (cache = v),
        (err) => {
          inflight = null; // reset so a failed fetch retries on the next mount (fixes SEC-04)
          throw err;
        },
      );
    }
    return inflight;
  }

  function useResource(): T | null {
    const [val, setVal] = useState<T | null>(cache);
    useEffect(() => {
      if (cache !== null) return; // useState(cache) already seeded a populated cache
      let alive = true;
      load()
        .then((v) => alive && setVal(v))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []);
    return val;
  }

  function invalidate(): void {
    cache = null;
    inflight = null;
  }

  return { useResource, invalidate };
}
