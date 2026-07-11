"use client";

import type { Me, TelegramAuthUser } from "@/lib/api";
import { TELEGRAM_BOT, telegramBotUrl } from "@/lib/config";
import Icon from "@/components/Icon";
import TelegramLoginButton from "@/components/TelegramLoginButton";
import { ConsoleFrame } from "@/components/ui";

/**
 * The Telegram half of the account-link surface; `EmailConsole` is its mirror.
 * One card, two states:
 * - not linked → invite a site (email) user to attach the Telegram bot. Linking
 *   a Telegram that already has its own bot account merges the two server-side.
 * - linked → confirm the connection and offer to open the bot.
 *
 * Renders nothing when no bot is configured (`NEXT_PUBLIC_TELEGRAM_BOT=""`).
 */
export default function TelegramConsole({
  me,
  onLink,
  error,
}: {
  me: Me | null;
  onLink: (user: TelegramAuthUser) => void;
  error: string | null;
}) {
  if (!TELEGRAM_BOT) return null;
  const linked = !!me?.telegram_id;

  return (
    <ConsoleFrame className="tg-console" aria-label="Telegram">
      <span className="tg-kicker mono">{"// telegram"}</span>

      {linked ? (
        <>
          <p className="tg-linked">
            <Icon name="check" size={16} /> Telegram подключён
            {me?.username ? (
              <>
                {" · "}
                <b>@{me.username}</b>
              </>
            ) : null}
          </p>
          <p className="tg-console-sub">Заходи в аккаунт и с сайта, и из Telegram — это один профиль.</p>
          <a className="btn btn-ghost" href={telegramBotUrl()} target="_blank" rel="noopener noreferrer">
            <Icon name="telegram" size={16} /> Открыть бота
          </a>
        </>
      ) : (
        <>
          <h3 className="tg-console-title">Управляй подпиской в Telegram</h3>
          <p className="tg-console-sub">
            Привяжи бота — и заходи в один аккаунт откуда удобно: с сайта и из Telegram. Туда же
            придут напоминания о подписке.
          </p>
          <p className="link-warn">
            <Icon name="link" size={16} className="link-warn-ic" />
            Без привязки вход через Telegram заведёт второй аккаунт — подписка и реферальный
            баланс останутся в этом.
          </p>
          <TelegramLoginButton botUsername={TELEGRAM_BOT} onAuth={onLink} cornerRadius={12} />
          {error && (
            <p className="tg-console-err" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </ConsoleFrame>
  );
}
