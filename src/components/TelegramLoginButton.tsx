"use client";

import { useEffect, useRef } from "react";
import type { TelegramAuthUser } from "@/lib/api";

const WIDGET_SRC = "https://telegram.org/js/telegram-widget.js?22";

// The widget's `data-onauth` runs a string of JS in global scope, so every mount
// needs its own uniquely-named global callback. A module counter keeps them apart
// when several buttons live on one page (e.g. login + a future link surface).
let seq = 0;

/**
 * Telegram Login Widget (https://core.telegram.org/widgets/login). Renders
 * Telegram's own button into a container and calls `onAuth` with the signed user
 * payload; the caller POSTs it to the backend, which verifies the hash. Renders
 * nothing when `botUsername` is empty, so the page degrades gracefully if the
 * `NEXT_PUBLIC_TELEGRAM_BOT` env var is unset.
 *
 * NOTE: the widget only renders on the domain configured for the bot via
 * @BotFather (/setdomain); on other hosts it shows an inline error instead.
 */
export default function TelegramLoginButton({
  botUsername,
  onAuth,
  size = "large",
  cornerRadius,
  requestAccess = true,
  lang = "ru",
}: {
  botUsername: string;
  onAuth: (user: TelegramAuthUser) => void;
  size?: "large" | "medium" | "small";
  cornerRadius?: number;
  requestAccess?: boolean;
  lang?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onAuth);

  useEffect(() => {
    cb.current = onAuth;
  }, [onAuth]);

  useEffect(() => {
    const container = ref.current;
    if (!botUsername || !container) return;

    const cbName = `__tgAuth_${(seq += 1)}`;
    const globals = window as unknown as Record<string, unknown>;
    globals[cbName] = (user: TelegramAuthUser) => cb.current(user);

    const s = document.createElement("script");
    s.src = WIDGET_SRC;
    s.async = true;
    s.setAttribute("data-telegram-login", botUsername);
    s.setAttribute("data-size", size);
    if (cornerRadius !== undefined) s.setAttribute("data-radius", String(cornerRadius));
    if (requestAccess) s.setAttribute("data-request-access", "write");
    s.setAttribute("data-userpic", "false");
    s.setAttribute("data-lang", lang);
    s.setAttribute("data-onauth", `${cbName}(user)`);
    container.appendChild(s);

    return () => {
      container.innerHTML = "";
      delete globals[cbName];
    };
  }, [botUsername, size, cornerRadius, requestAccess, lang]);

  if (!botUsername) return null;
  return <div className="tg-auth" ref={ref} />;
}
