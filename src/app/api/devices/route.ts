import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserDevices, deleteDevice } from "@/lib/remnawave";

export const dynamic = "force-dynamic";

/** GET /api/devices — the current user's HWID devices. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.remnawaveUuid) return NextResponse.json({ devices: [] });
  try {
    const devices = await getUserDevices(user.remnawaveUuid);
    return NextResponse.json({ devices });
  } catch (e) {
    console.error("[/api/devices] GET:", e);
    return NextResponse.json(
      { error: "panel_error", detail: (e as Error).message },
      { status: 502 },
    );
  }
}

const DelBody = z.object({ hwid: z.string().min(1) });

/** DELETE /api/devices — unbind one device (frees the slot). */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user?.remnawaveUuid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = DelBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    await deleteDevice(user.remnawaveUuid, parsed.data.hwid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/devices] DELETE:", e);
    return NextResponse.json(
      { error: "panel_error", detail: (e as Error).message },
      { status: 502 },
    );
  }
}
