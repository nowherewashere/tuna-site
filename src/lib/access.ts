import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { createTrialUser, type RemnawaveUser } from "@/lib/remnawave";
import type { User } from "@/lib/db/schema";

/**
 * Guest → working VPN (spec §4). Create our user row, mint a Remnawave trial user,
 * and link them by `remnawave_uuid` (the spine shared with the bot).
 */
export async function createTrialAccount(opts: {
  email?: string | null;
  referred?: boolean;
}): Promise<{ user: User; remna: RemnawaveUser }> {
  const db = getDb();

  // Our row first, so we have a stable id to derive the panel username from.
  const [user] = await db
    .insert(schema.users)
    .values({ email: opts.email ?? null, isReferred: Boolean(opts.referred) })
    .returning();

  const username = `web_${user.id.replace(/-/g, "").slice(0, 12)}`;

  let remna: RemnawaveUser;
  try {
    remna = await createTrialUser({ username, referred: opts.referred });
  } catch (e) {
    // Roll back our row so a panel failure doesn't leave an orphaned user.
    await db.delete(schema.users).where(eq(schema.users.id, user.id));
    throw e;
  }

  const [linked] = await db
    .update(schema.users)
    .set({ remnawaveUuid: remna.uuid })
    .where(eq(schema.users.id, user.id))
    .returning();

  return { user: linked, remna };
}
