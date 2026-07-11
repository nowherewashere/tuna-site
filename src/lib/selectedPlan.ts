/**
 * Selected-plan hand-off — carries the plan a visitor picked on the landing pricing
 * cards through /login into the cabinet's Subscription tab, so they don't land on a
 * blank Overview and have to rediscover the tab and re-pick the tier from scratch.
 *
 * It's a short-lived funnel intent (one sign-up), so this uses sessionStorage — unlike
 * the 30-day referral cookie in `referral.ts`, whose store-in-both-places pattern this
 * otherwise mirrors. SSR-safe; storage being blocked is non-fatal (the hand-off is a
 * nicety, not load-bearing).
 */

const KEY = "selected_plan";

/** Persist the plan code the visitor chose (its `public_code`). */
export function storeSelectedPlan(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, code);
  } catch {
    /* storage blocked (private mode / disabled) — non-fatal */
  }
}

/** Read the pending plan code, if any. SSR-safe. */
export function readSelectedPlan(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Clear it once consumed (preselected in the cabinet). */
export function clearSelectedPlan(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
