import { NextResponse } from "next/server";
import { z } from "zod";
import { requestMagicLink } from "@/lib/auth/magic-link";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const Body = z.object({ email: z.string().email() });

/** POST /api/auth/request — send a magic-link to an existing account (neutral response). */
export async function POST(req: Request) {
  const rl = rateLimit(`auth:${clientIp(req)}`, 5, 15 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const res = await requestMagicLink(
    parsed.data.email.toLowerCase(),
    new URL(req.url).origin,
  );
  // Always neutral: don't reveal whether the account exists. devLink only in dev.
  return NextResponse.json({ ok: true, ...(res.devLink ? { devLink: res.devLink } : {}) });
}
