import type { PublicPlanLanding } from "@/lib/api";

// Build-time pricing fetch (SEO-08). Under `output: "export"` the landing is a server
// component rendered once at build, so we can pull the plans here and hand them to the
// client PricingSection as initial data — putting real prices/plan names in the served
// HTML for non-JS crawlers and AI engines. The browser still refreshes them on mount, so
// the backend stays the single source of truth (no committed price snapshot).
//
// Server-only: imported solely by the server `page.tsx`; the plain data array is what
// crosses to the client, never this module. The runtime client calls hit the same origin
// via `/api/v1/...`, but at BUILD there is no origin, so fetch the absolute backend URL.
// Any failure (backend down, timeout, non-200) degrades to `[]` → PricingSection falls
// back to its existing client-side skeleton load. The build must never break on this.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://tunashop.tuna-transfer.xyz";
const BUILD_FETCH_TIMEOUT_MS = 8_000;

export async function fetchLandingPlans(): Promise<PublicPlanLanding[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BUILD_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/public/plans/public`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
      signal: ctrl.signal,
      // Static build-time read: `force-cache` keeps this fetch compatible with
      // `output: "export"` (a `no-store`/dynamic fetch makes the route un-exportable).
      // Baked into the HTML at build; the client refresh keeps it current thereafter.
      cache: "force-cache",
    });
    if (!res.ok) {
      console.warn(`[plans.server] plans fetch ${res.status} — landing prices fall back to client load`);
      return [];
    }
    const data = (await res.json()) as { plans?: PublicPlanLanding[] };
    return data.plans ?? [];
  } catch (e) {
    // Non-fatal: log so a silent degradation to client-only skeletons is visible in
    // the build/deploy log, then let the build proceed.
    console.warn(`[plans.server] plans fetch failed (${(e as Error).name}) — landing prices fall back to client load`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
