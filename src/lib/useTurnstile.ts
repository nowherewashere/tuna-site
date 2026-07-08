"use client";

import { useCallback, useState } from "react";
import { usePublicConfig } from "@/lib/usePublicConfig";

/**
 * Turnstile state for the auth forms. `required` is true once we know a site key
 * exists; `token` is the solved token; `reset()` clears it and remounts the widget
 * (bump `resetKey` as the widget's React key).
 */
export function useTurnstile() {
  const cfg = usePublicConfig();
  const siteKey = cfg?.turnstile_site_key ?? null;
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);

  const reset = useCallback(() => {
    setToken("");
    setResetKey((k) => k + 1);
  }, []);

  const required = !!siteKey;
  return { siteKey, token, setToken, resetKey, reset, required };
}
