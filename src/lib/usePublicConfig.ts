"use client";

import { useEffect, useState } from "react";
import { api, type PublicConfig } from "@/lib/api";

// One shared fetch across all pages that need public config (e.g. the site key).
let cache: PublicConfig | null = null;
let inflight: Promise<PublicConfig> | null = null;

export function usePublicConfig(): PublicConfig | null {
  const [cfg, setCfg] = useState<PublicConfig | null>(cache);

  useEffect(() => {
    if (cache) return;
    if (!inflight) {
      inflight = api.publicConfig().then((c) => (cache = c));
    }
    let alive = true;
    inflight.then((c) => alive && setCfg(c)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return cfg;
}
