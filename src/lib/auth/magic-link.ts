import "server-only";
import { randomBytes, createHash } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";

const TTL_MINUTES = 15;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issue a one-time login link for an existing account. Returns { sent: false } if
 * no account has that email — the route responds neutrally either way (no enumeration).
 * In dev (no email provider) the link is returned so it can be followed without email.
 */
export async function requestMagicLink(
  email: string,
  baseUrl: string,
): Promise<{ sent: boolean; devLink?: string }> {
  const db = getDb();
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (!user) return { sent: false };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000);
  await db.insert(schema.magicLinks).values({
    tokenHash: hashToken(token),
    userId: user.id,
    expiresAt,
  });

  const link = `${baseUrl}/api/auth/verify?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Вход в Tuna VPN 🐟",
    text: `Ссылка для входа (действует 15 минут): ${link}`,
    html: `<p>Ссылка для входа в Tuna VPN (действует 15 минут):</p><p><a href="${link}">Войти</a></p>`,
  });

  return { sent: true, devLink: env().EMAIL_PROVIDER_KEY ? undefined : link };
}

/** Validate + burn a login token. Returns the user id, or null if invalid/expired/used. */
export async function consumeMagicLink(token: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.magicLinks)
    .where(
      and(
        eq(schema.magicLinks.tokenHash, hashToken(token)),
        isNull(schema.magicLinks.usedAt),
      ),
    )
    .limit(1);
  if (!row || row.expiresAt.getTime() < Date.now()) return null;

  await db
    .update(schema.magicLinks)
    .set({ usedAt: new Date() })
    .where(eq(schema.magicLinks.id, row.id));
  return row.userId;
}
