"use client";

import { useCallback, useState } from "react";
import { usePublicConfig } from "@/lib/usePublicConfig";

/**
 * Turnstile state for the auth forms. `required` is true once we know a site key
 * exists; `token` is the solved token; `failed` is true after a hard widget failure
 * (challenge error or a blocked script) so the form can show a retry; `reset()`
 * clears everything and remounts the widget (bump `resetKey` as the widget's key).
 */
export function useTurnstile() {
  const cfg = usePublicConfig();
  const siteKey = cfg?.turnstile_site_key ?? null;
  const [token, setTokenState] = useState("");
  const [failed, setFailed] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // A solved token clears any prior failure.
  const setToken = useCallback((t: string) => {
    setTokenState(t);
    if (t) setFailed(false);
  }, []);

  // The widget errored or its script was blocked — surface a retry rather than a
  // submit that stays disabled looking like "still loading".
  const onError = useCallback(() => setFailed(true), []);

  const reset = useCallback(() => {
    setTokenState("");
    setFailed(false);
    setResetKey((k) => k + 1);
  }, []);

  const required = !!siteKey;
  return { siteKey, token, setToken, onError, failed, resetKey, reset, required };
}
