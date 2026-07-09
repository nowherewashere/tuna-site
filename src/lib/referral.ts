/**
 * Referral attribution storage — one source of truth for the captured `ref` code.
 *
 * A visitor arrives via `/r/<code>` (see `RefCapture`); we persist the code in
 * BOTH a 30-day cookie and localStorage, then strip the URL. Later — on the
 * trial/signup page — we read it back to show the bonus pill and (once the
 * backend accepts it) attribute the new account. localStorage is the primary
 * store; the cookie is the belt-and-braces copy that survives if storage is
 * cleared or unavailable (and is first-party, so the backend could read it too).
 */

const KEY = "ref";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

/** Read the stored ref code (localStorage first, cookie fallback). SSR-safe. */
export function readRefCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored) return stored;
  } catch {
    /* storage blocked (private mode / disabled) — fall through to the cookie */
  }
  const m = document.cookie.match(/(?:^|;\s*)ref=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Persist the ref code for 30 days in both localStorage and a first-party cookie. */
export function storeRefCode(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, code);
  } catch {
    /* storage blocked — the cookie below still carries the attribution */
  }
  document.cookie = `${KEY}=${encodeURIComponent(code)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}
