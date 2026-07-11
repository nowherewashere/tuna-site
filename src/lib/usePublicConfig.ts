"use client";

import { api, type PublicConfig } from "@/lib/api";
import { createCachedResource } from "@/lib/createCachedResource";

// One shared fetch across all pages that need public config (e.g. the site key).
const config = createCachedResource<PublicConfig>(() => api.publicConfig());

export function usePublicConfig(): PublicConfig | null {
  return config.useResource();
}
