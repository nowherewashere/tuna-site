import type { MouseEvent } from "react";

/**
 * Native app-store deep links for the Happ download buttons.
 *
 * On a real iPhone/Mac or Android device the platform store app is guaranteed
 * to exist, so the button first tries the store's own URL scheme (opens the
 * store app directly, skipping the browser) and only falls back to the plain
 * https listing if nothing handled the scheme. The https URLs come from the
 * bot's runtime onboarding config, so the scheme is *derived* — an admin
 * override pointing anywhere else simply yields null and the link stays plain.
 */

export function storeSchemeUrl(httpsUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(httpsUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;

  // App Store (iOS + macOS): same URL, itms-apps: scheme.
  if (u.hostname === "apps.apple.com" || u.hostname === "itunes.apple.com") {
    return httpsUrl.replace(/^https:/, "itms-apps:");
  }
  // Google Play: market://details?id=<package>.
  if (u.hostname === "play.google.com") {
    const id = u.searchParams.get("id");
    return id ? `market://details?id=${id}` : null;
  }
  return null;
}

/**
 * Click handler: try the store scheme, fall back to the https listing if the
 * page is still visible after ~1.2s (i.e. no store app took over). Leaving the
 * page (store opened / user navigated) cancels the fallback.
 */
export function openStoreWithFallback(e: MouseEvent<HTMLElement>, httpsUrl: string): void {
  const scheme = storeSchemeUrl(httpsUrl);
  if (!scheme) return; // unrecognized URL — let the plain link do its thing

  e.preventDefault();

  const cleanup = () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onHidden);
    window.removeEventListener("pagehide", cleanup);
  };
  const onHidden = () => {
    if (document.hidden) cleanup();
  };
  const timer = window.setTimeout(() => {
    cleanup();
    window.location.href = httpsUrl;
  }, 1200);

  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("pagehide", cleanup);
  window.location.href = scheme;
}
