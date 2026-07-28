import { api, ApiError, trackFunnel } from "@/lib/api";
import { detectPlatform } from "@/components/InstallBlock";
import { invalidateAuth } from "@/lib/useAuth";
import { readSelectedPlan } from "@/lib/selectedPlan";
import { writeLastAuthMethod, type AuthMethod } from "@/lib/lastAuthMethod";

/**
 * Everything that must happen after a session exists, whichever way it was created.
 *
 * A brand-new account has no subscription → grant the trial (idempotent; 409 = already
 * has one) and fire the onboarding funnel steps. Everyone ends up in the cabinet, which
 * shows the install guide at the top.
 *
 * Shared so that a sign-in route added later cannot quietly skip the trial and the
 * funnel — that is exactly what would have happened to the OAuth path had this stayed
 * inline in the login page.
 *
 * `navigate` is passed in rather than importing a router, because the two callers need
 * different history behaviour: /login pushes, /auth/callback replaces (Back must not
 * return to a spent callback URL).
 */
export async function finishAuth(
  method: AuthMethod,
  navigate: (href: string) => void,
): Promise<void> {
  invalidateAuth();
  writeLastAuthMethod(method);

  const existing = await api.currentSubscription().catch(() => null);
  if (!existing) {
    try {
      await api.activateTrial();
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 409)) {
        console.error("Trial activation failed:", e);
      }
    }
    const sub = await api.currentSubscription().catch(() => null);
    if (sub) {
      const platform = detectPlatform();
      trackFunnel("config_issued", { platform, userRef: sub.user_remna_id });
      trackFunnel("app_install_shown", { platform, userRef: sub.user_remna_id });
    }
  }
  // A plan chosen on the landing (sessionStorage) deep-links into the Subscription
  // tab, where the cabinet preselects it once offers load — instead of a blank Overview.
  navigate(readSelectedPlan() ? "/cabinet#sub" : "/cabinet");
}
