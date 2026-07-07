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

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    cache: "no-store",
  });

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
};
