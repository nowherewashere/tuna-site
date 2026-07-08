"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// Shared session state so all auth-aware CTAs on a page use one /auth/me call.
// null = unknown/loading. Invalidated on login/logout so it re-resolves.
let cache: boolean | null = null;
let inflight: Promise<boolean> | null = null;

export function invalidateAuth(): void {
  cache = null;
  inflight = null;
}

export function useAuth(): boolean | null {
  const [authed, setAuthed] = useState<boolean | null>(cache);

  useEffect(() => {
    if (cache !== null) return; // useState(cache) already seeded it
    if (!inflight) {
      inflight = api
        .me()
        .then(() => true)
        .catch(() => false)
        .then((v) => (cache = v));
    }
    let alive = true;
    inflight.then((v) => alive && setAuthed(v)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return authed;
}
