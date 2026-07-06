import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { createTrialAccount } from "@/lib/access";
import { createSession } from "@/lib/auth/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const Body = z.object({
  email: z.string().email().optional().or(z.literal("")),
  referred: z.boolean().optional(),
});

/**
 * POST /api/access — guest gets working VPN (spec §4). Creates our user + a
 * Remnawave trial, opens a session, returns the subscription URL. Email optional
 * ("без почты"): access lives on our remnawave_uuid, email only enables re-login.
 */
export async function POST(req: Request) {
  const rl = rateLimit(`access:${clientIp(req)}`, 5, 60 * 60_000);
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

  const email =
    parsed.data.email && parsed.data.email.length > 0
      ? parsed.data.email.toLowerCase()
      : null;

  if (email) {
    const [existing] = await getDb()
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    if (existing) {
      return NextResponse.json({ error: "account_exists" }, { status: 409 });
    }
  }

  try {
    const { user, remna } = await createTrialAccount({
      email,
      referred: parsed.data.referred,
    });
    await createSession(user.id);
    return NextResponse.json({
      ok: true,
      username: remna.username,
      expireAt: remna.expireAt,
      subscriptionUrl: remna.subscriptionUrl ?? null,
    });
  } catch (e) {
    console.error("[/api/access] failed:", e);
    return NextResponse.json({ error: "provisioning_failed" }, { status: 502 });
  }
}
