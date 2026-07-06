import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { ping } from "@/lib/remnawave";

export const dynamic = "force-dynamic";

/** Diagnostic: DB gate + panel reachability (panel is informational, doesn't fail health). */
export async function GET() {
  const out: { ok: boolean; db: string; panel: string } = {
    ok: true,
    db: "unknown",
    panel: "unknown",
  };

  try {
    await getDb().execute(sql`select 1`);
    out.db = "ok";
  } catch (e) {
    out.db = `fail: ${(e as Error).message.slice(0, 120)}`;
    out.ok = false;
  }

  const p = await ping();
  out.panel = p.ok ? `ok (${p.status})` : `unreachable (${p.status})`;

  return NextResponse.json(out, { status: out.ok ? 200 : 503 });
}
