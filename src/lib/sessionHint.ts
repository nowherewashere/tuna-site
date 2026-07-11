/**
 * Session hint — a non-httpOnly `has_session` cookie the backend sets/clears alongside
 * the httpOnly auth cookies (see the bot's `set_auth_cookies`/`clear_auth_cookies`). It
 * carries no secret, only "a session likely exists", so the SPA can skip the `/auth/me`
 * probe for anonymous visitors — no guest 401s on public pages (SEO-11 / Best-Practices).
 *
 * Read-only on this side: the backend owns the cookie's lifecycle, so there's a single
 * source of truth with no drift. `false` here just means "don't bother probing" — the
 * server is still the authority on whether a request is actually authenticated.
 */
export function hasSessionHint(): boolean {
  // SSR/static-export prerender has no document; treat as "no hint" (callers only run
  // this in effects, but guard anyway so it's safe to call from anywhere).
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === "has_session=1");
}
