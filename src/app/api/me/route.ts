import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserByUuid } from "@/lib/remnawave";

export const dynamic = "force-dynamic";

/** GET /api/me — current session user + live subscription state from the panel. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let subscription: {
    status: string;
    expireAt: string;
    usedTrafficBytes: number;
    trafficLimitBytes: number;
    subscriptionUrl: string | null;
    deviceLimit: number | null;
  } | null = null;

  if (user.remnawaveUuid) {
    try {
      const r = await getUserByUuid(user.remnawaveUuid);
      subscription = {
        status: r.status,
        expireAt: r.expireAt,
        usedTrafficBytes: r.usedTrafficBytes ?? 0,
        trafficLimitBytes: r.trafficLimitBytes,
        subscriptionUrl: r.subscriptionUrl ?? null,
        deviceLimit: r.hwidDeviceLimit ?? null,
      };
    } catch (e) {
      console.error("[/api/me] panel error:", e);
    }
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: `web_${user.id.replace(/-/g, "").slice(0, 12)}`,
      isReferred: user.isReferred,
    },
    subscription,
  });
}
