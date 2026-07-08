"use client";

import { useEffect, useState } from "react";
import { api, type OnboardingConfig } from "@/lib/api";

// Module-level cache so both the onboarding and cabinet screens share one fetch.
let cache: OnboardingConfig | null = null;
let inflight: Promise<OnboardingConfig> | null = null;

export function useOnboarding(): OnboardingConfig | null {
  const [cfg, setCfg] = useState<OnboardingConfig | null>(cache);

  useEffect(() => {
    // `useState(cache)` already seeds a populated cache, so only fetch when empty.
    if (cache) return;
    if (!inflight) {
      inflight = api.onboardingConfig().then((c) => (cache = c));
    }
    let alive = true;
    inflight.then((c) => alive && setCfg(c)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return cfg;
}
