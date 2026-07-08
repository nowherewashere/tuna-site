/**
 * Client for the bot's public API (`/api/v1/public/*`) — the single backend.
 *
 * The browser calls it same-origin: in production nginx serves this SPA at `/`
 * and proxies `/api/v1` to the app; in development `next.config.ts` rewrites
 * `/api/v1/*` to the bot domain. Either way the httpOnly JWT + refresh cookies
 * are first-party, so every call uses `credentials: "include"`.
 *
 * There is NO site database, no direct Remnawave calls, no server code here —
 * all of that lives in the Python backend (see specs/tuna-vpn-website-backend-spec-en.md).
 */

const BASE = "/api/v1/public";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(detail || `HTTP ${status}`);
    this.name = "ApiError";
  }
}

// Auth-entry endpoints where a 401 is a real failure, not an expired session —
// never trigger a token refresh for these (and never for /refresh itself).
const AUTH_ENTRY = /^\/auth\/(refresh|login|email\/|telegram)/;

async function req<T>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    cache: "no-store",
  });

  // Access tokens are short-lived (15 min). On 401, try a one-time silent refresh
  // using the 30-day refresh cookie, then replay the request — so a reload or an
  // expired access token never logs the user out while the refresh token is valid.
  if (res.status === 401 && !retried && !AUTH_ENTRY.test(path)) {
    const refreshed = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    if (refreshed.ok) return req<T>(method, path, body, true);
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { detail?: string })?.detail ?? "";
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── Response shapes (mirror the Python pydantic schemas) ──────────────────────

export interface Me {
  telegram_id: number | null;
  auth_type: string;
  email: string | null;
  is_email_verified: boolean;
  pending_email: string | null;
  name: string;
  username: string | null;
  language: string;
}

export interface SubscriptionInfo {
  user_remna_id: string;
  status: string;
  is_trial: boolean;
  traffic_limit: number;
  device_limit: number;
  traffic_limit_strategy: string;
  expire_at: string;
  url: string;
  plan_name: string;
  plan_duration_days: number;
  used_traffic_bytes: number | null;
  lifetime_used_traffic_bytes: number | null;
  online_at: string | null;
}

export interface Device {
  hwid: string;
  platform: string | null;
  device_model: string | null;
  os_version: string | null;
  user_agent: string | null;
}

export interface DevicesInfo {
  devices: Device[];
  current_count: number;
  max_count: number;
}

export interface TrialActivate {
  is_free: boolean;
  activated: boolean;
  duration_days: number;
}

export interface RequestCodeResult {
  success: boolean;
  target_email: string;
  expires_at: string;
}

export interface AuthResult {
  expires_at: string;
  refresh_expires_at: string;
}

export interface ReferralProgram {
  enabled: boolean;
  referral_code: string;
  bot_referral_url: string;
  site_referral_url: string | null;
  invited_count: number;
  invited_with_payment_count: number;
  reward_type: string;
  reward_strategy: string;
  accrual_strategy: string;
  max_level: number;
  reward_levels: { level: number; value: number }[];
}

export interface DurationPrice {
  gateway_type: string;
  currency: string;
  currency_symbol: string;
  original_amount: string;
  discount_percent: number;
  final_amount: string;
  is_free: boolean;
}

export interface DurationOffer {
  days: number;
  prices: DurationPrice[];
}

export interface PlanOffer {
  id: number;
  public_code: string;
  name: string;
  description: string | null;
  traffic_limit: number;
  device_limit: number;
  type: string;
  recommended_purchase_type: string;
  durations: DurationOffer[];
}

export interface SubscriptionOffers {
  gateways: { gateway_type: string; currency: string; currency_symbol: string }[];
  plans: PlanOffer[];
  has_current_subscription: boolean;
  current_subscription_status: string | null;
}

export interface PaymentInit {
  payment_id: string;
  payment_url: string | null;
  purchase_type: string;
  status: string;
  is_free: boolean;
  final_amount: string;
  currency: string;
}

export interface OnboardingConfig {
  happ_import_template: string;
  refresh_video_url: string | null;
  store_links: { ios: string; android: string; windows: string; mac: string; linux: string };
  store_link_ios_ru: string;
  tv: { web_import_url: string; faq: { apple_tv: string; android_tv: string } };
}

// ── Calls ─────────────────────────────────────────────────────────────────────

export const api = {
  // Passwordless auth
  requestLoginCode: (email: string) =>
    req<RequestCodeResult>("POST", "/auth/email/request-code", { email }),
  verifyLoginCode: (email: string, code: string) =>
    req<AuthResult>("POST", "/auth/email/verify-code", { email, code }),
  me: () => req<Me>("GET", "/auth/me"),
  logout: () => req<{ success: boolean }>("POST", "/auth/logout"),

  // Subscription. `/current` returns null when the user has no subscription yet.
  currentSubscription: () => req<SubscriptionInfo | null>("GET", "/subscription/current"),
  devices: () => req<DevicesInfo>("GET", "/subscription/devices"),
  deleteDevice: (hwid: string) =>
    req<{ deleted: boolean }>("DELETE", `/subscription/devices/${encodeURIComponent(hwid)}`),
  activateTrial: () => req<TrialActivate>("POST", "/subscription/trial"),

  // Canonical Happ install links (single source: the bot's OnboardingConfig).
  onboardingConfig: () => req<OnboardingConfig>("GET", "/onboarding/config"),

  // Plans/prices and referral program — both live in the backend, never hardcoded.
  subscriptionOffers: () => req<SubscriptionOffers>("GET", "/subscription/offers"),
  referralProgram: () => req<ReferralProgram>("GET", "/referral/program"),

  // Create a payment for a plan/duration via a gateway → returns a redirect URL.
  purchase: (planCode: string, durationDays: number, gatewayType: string) =>
    req<PaymentInit>("POST", "/subscription/purchase", {
      plan_code: planCode,
      duration_days: durationDays,
      gateway_type: gatewayType,
    }),
};
