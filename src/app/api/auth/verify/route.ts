import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { consumeMagicLink } from "@/lib/auth/magic-link";
import { createSession } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/auth/verify?token=… — burn the token, open a session, land in the cabinet. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = url.origin;
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.redirect(`${base}/login?error=1`);

  const userId = await consumeMagicLink(token);
  if (!userId) return NextResponse.redirect(`${base}/login?error=expired`);

  await createSession(userId);
  await getDb()
    .update(schema.users)
    .set({ lastLoginAt: new Date() })
    .where(eq(schema.users.id, userId));

  return NextResponse.redirect(`${base}/cabinet`);
}
