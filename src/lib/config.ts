/**
 * Public, build-time site configuration.
 *
 * These are inlined into the static export at build time (NEXT_PUBLIC_* is baked
 * into the bundle by `next build`, not read at runtime), so the defaults below
 * ship with the code and need no env setup to work in dev or prod.
 */

// Telegram bot backing the Login Widget (sign in on /login and linking in the
// cabinet), WITHOUT the leading @. This is public — it appears in the widget
// markup on the live site anyway. Defaults to our bot; set
// NEXT_PUBLIC_TELEGRAM_BOT to override it (e.g. to test against another bot), or
// to "" to hide the Telegram button entirely. The bot's login domain must be set
// to this site via @BotFather (/setdomain) or the widget will not render.
export const TELEGRAM_BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT ?? "VPNTuna_Bot";

// Canonical production origin of the marketing/cabinet site: the single source of
// truth for every ABSOLUTE URL the site emits — canonical, OG/metadataBase, sitemap,
// robots, and JSON-LD @id. RU domain-blocking forces periodic public-domain rotation;
// point a build at the live domain with NEXT_PUBLIC_SITE_URL (e.g. https://v-tuna.com)
// and rebuild — no code edits. No trailing slash (stripped defensively).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://tuna-vpn.com"
).replace(/\/+$/, "");

// Deep link to open the bot in Telegram (used by the cabinet once linked).
export const telegramBotUrl = () => `https://t.me/${TELEGRAM_BOT}`;
