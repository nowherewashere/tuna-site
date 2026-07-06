import "server-only";
import { z } from "zod";

/**
 * Server-side environment config. Parsed lazily (on first access) so a missing
 * var never breaks the build — only the request that needs it. See .env.example.
 */
const schema = z.object({
  // Remnawave panel (VPN backend — source of truth)
  REMNAWAVE_API_URL: z.string().url(),
  REMNAWAVE_API_TOKEN: z.string().min(1),
  // Local dev only: the bare panel rejects plain HTTP (ProxyCheck) — add the
  // forwarded headers a reverse proxy would. Leave false in prod (real proxy adds them).
  REMNAWAVE_LOCAL_PROXY_HEADERS: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  // Internal squad(s) to assign new users to (so their subscription has inbounds).
  // Comma-separated uuids. Local panel default squad seeded by the bot setup.
  REMNAWAVE_TRIAL_SQUAD_UUIDS: z
    .string()
    .optional()
    .default("")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),

  // Our database
  DATABASE_URL: z.string().min(1),

  // Sessions
  SESSION_SECRET: z.string().min(16),
  PUBLIC_DOMAIN: z.string().optional(),

  // Trial / device policy (spec §12)
  TRIAL_HOURS: z.coerce.number().default(24),
  TRIAL_HOURS_REFERRED: z.coerce.number().default(72),
  TRIAL_DEVICE_LIMIT: z.coerce.number().default(1),
  PAID_DEVICE_LIMIT: z.coerce.number().default(3),

  // Referral (spec §12)
  REFERRAL_PERCENT: z.coerce.number().default(50),
  REFERRAL_PAYOUT_MIN_RUB: z.coerce.number().default(1000),

  // Optional integrations (not required for the core access flow yet)
  EMAIL_PROVIDER_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET: z.string().optional(),
  CHATWOOT_BASE_URL: z.string().optional(),
  CHATWOOT_WEBSITE_TOKEN: z.string().optional(),
  CHATWOOT_HMAC_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
