"use client";

import { api } from "@/lib/api";
import { createCachedResource } from "@/lib/createCachedResource";

// Shared session state so all auth-aware CTAs on a page use one /auth/me call.
// null = unknown/loading. Invalidated on login/logout so it re-resolves.
const auth = createCachedResource<boolean>(() => api.me().then(() => true, () => false));

export function useAuth(): boolean | null {
  return auth.useResource();
}

export function invalidateAuth(): void {
  auth.invalidate();
}
