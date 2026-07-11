"use client";

import { api } from "@/lib/api";
import { createCachedResource } from "@/lib/createCachedResource";
import { hasSessionHint } from "@/lib/sessionHint";

// Shared session state so all auth-aware CTAs on a page use one /auth/me call.
// null = unknown/loading. Invalidated on login/logout so it re-resolves.
//
// Gate the probe on the `has_session` hint: anonymous visitors (no hint) resolve to
// `false` with NO network call, so public pages never fire the guest 401 storm on
// /auth/me + /auth/refresh (SEO-11 — keeps the console clean → Best-Practices). When
// the hint is present we probe as before; a real 401 there still falls through to
// `false` (and the backend has already cleared the hint on logout).
const auth = createCachedResource<boolean>(() =>
  hasSessionHint() ? api.me().then(() => true, () => false) : Promise.resolve(false),
);

export function useAuth(): boolean | null {
  return auth.useResource();
}

export function invalidateAuth(): void {
  auth.invalidate();
}
