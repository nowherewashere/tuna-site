import "server-only";
import { env } from "./env";

/**
 * Thin typed wrapper over the Remnawave Panel REST API (the VPN backend / source
 * of truth). Everything VPN-related goes through here — we never store VPN state.
 *
 * Prod talks to the panel behind its reverse proxy. Local dev talks to the bare
 * panel, which rejects plain HTTP via ProxyCheck — set REMNAWAVE_LOCAL_PROXY_HEADERS
 * to add the X-Forwarded-Proto header a proxy would.
 */

export interface RemnawaveUser {
  uuid: string;
  shortUuid: string;
  username: string;
  status: "ACTIVE" | "EXPIRED" | "LIMITED" | "DISABLED" | string;
  expireAt: string;
  trafficLimitBytes: number;
  usedTrafficBytes?: number;
  subscriptionUrl?: string;
  telegramId?: number | null;
  hwidDeviceLimit?: number | null;
}

interface Envelope<T> {
  response: T;
}

export class RemnawaveError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    readonly path: string,
  ) {
    super(`Remnawave ${status} on ${path}: ${body.slice(0, 200)}`);
    this.name = "RemnawaveError";
  }
}

function authHeaders(): Record<string, string> {
  const e = env();
  const h: Record<string, string> = {
    Authorization: `Bearer ${e.REMNAWAVE_API_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (e.REMNAWAVE_LOCAL_PROXY_HEADERS) {
    h["X-Forwarded-Proto"] = "https";
    h["X-Forwarded-For"] = "127.0.0.1";
  }
  return h;
}

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const e = env();
  const res = await fetch(`${e.REMNAWAVE_API_URL}${path}`, {
    method,
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new RemnawaveError(res.status, text, path);
  }
  return (await res.json()) as T;
}

/** Look up a panel user by Telegram id (used for site↔bot account merges). */
export async function getUserByTelegramId(
  telegramId: number,
): Promise<RemnawaveUser | null> {
  const data = await call<Envelope<RemnawaveUser[]>>(
    "GET",
    `/api/users/by-telegram-id/${telegramId}`,
  );
  return data.response[0] ?? null;
}

/** Fetch a panel user by uuid (status/term/traffic for the cabinet). */
export async function getUserByUuid(uuid: string): Promise<RemnawaveUser> {
  const data = await call<Envelope<RemnawaveUser>>("GET", `/api/users/${uuid}`);
  return data.response;
}

/** Create a trial user (∞ traffic, HWID-limited). Returns uuid + subscription URL. */
export async function createTrialUser(opts: {
  username: string;
  referred?: boolean;
  telegramId?: number | null;
}): Promise<RemnawaveUser> {
  const e = env();
  const hours = opts.referred ? e.TRIAL_HOURS_REFERRED : e.TRIAL_HOURS;
  const expireAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

  const payload: Record<string, unknown> = {
    username: opts.username,
    status: "ACTIVE",
    expireAt,
    trafficLimitBytes: 0, // 0 = unlimited
    trafficLimitStrategy: "NO_RESET",
    hwidDeviceLimit: e.TRIAL_DEVICE_LIMIT,
  };
  if (e.REMNAWAVE_TRIAL_SQUAD_UUIDS.length > 0) {
    payload.activeInternalSquads = e.REMNAWAVE_TRIAL_SQUAD_UUIDS;
  }
  if (opts.telegramId != null) payload.telegramId = opts.telegramId;

  const data = await call<Envelope<RemnawaveUser>>("POST", "/api/users", payload);
  return data.response;
}

/** Delete a panel user (cleanup / account removal). */
export async function deleteUser(uuid: string): Promise<boolean> {
  const data = await call<Envelope<{ isDeleted: boolean }>>(
    "DELETE",
    `/api/users/${uuid}`,
  );
  return data.response.isDeleted;
}

/** Lightweight connectivity probe for health checks. Returns the panel status code. */
export async function ping(): Promise<{ ok: boolean; status: number }> {
  const e = env();
  try {
    const res = await fetch(
      `${e.REMNAWAVE_API_URL}/api/users/by-telegram-id/0`,
      { method: "GET", headers: authHeaders(), cache: "no-store" },
    );
    // 200 (empty list) or any authenticated response means we reached the panel.
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
