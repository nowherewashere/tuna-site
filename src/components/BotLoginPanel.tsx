"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type BotLoginStart } from "@/lib/api";
import { Button } from "@/components/ui";
import Icon from "@/components/Icon";

// The bot answers a tap; two seconds is responsive without being a busy loop. Polling
// rather than SSE on purpose: an anonymous long-lived stream is a far larger abuse
// surface than a couple of requests a second for at most two minutes.
const POLL_MS = 2000;

type Phase = "idle" | "starting" | "waiting" | "error";

function formatLeft(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Sign in by confirming inside the Telegram bot.
 *
 * A first-party alternative to the Telegram Login Widget, which pulls a script and an
 * iframe from telegram.org — exactly the kind of dependency this product's users
 * cannot rely on. The login page already carried a branch for that widget failing to
 * load; this is what that branch now becomes.
 */
export default function BotLoginPanel({
  onAuthenticated,
  disabled = false,
}: {
  onAuthenticated: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<BotLoginStart | null>(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Guards the claim: the poll and an unmount can race, and claiming twice would 400.
  const claimed = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const start = useCallback(async () => {
    setPhase("starting");
    setError(null);
    claimed.current = false;
    try {
      const started = await api.botLoginStart();
      setSession(started);
      setLeft(started.expires_in);
      setPhase("waiting");
    } catch {
      setSession(null);
      setError("Не удалось начать вход через Telegram. Попробуй ещё раз.");
      setPhase("error");
    }
  }, []);

  // Move focus into the panel: the button that opened it is gone, and without this the
  // caret lands on <body> — a keyboard user would tab into the Google button next, and
  // a screen reader would silently reset to the top of the document. The panel itself
  // takes focus (tabIndex -1) so its label is announced before its controls.
  useEffect(() => {
    if (phase === "waiting") panelRef.current?.focus();
  }, [phase]);

  // A ticking counter, not decoration: it tells the user there is a two-minute clock
  // instead of an open-ended wait, makes the eventual timeout comprehensible, and — as
  // the one piece of text in the live region that actually changes — is what makes the
  // region announce at all (a freshly-mounted aria-live node is not reliably read).
  useEffect(() => {
    if (phase !== "waiting" || left <= 0) return;
    const timer = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, left]);

  useEffect(() => {
    if (phase !== "waiting" || !session) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (!alive || !session) return;
      try {
        const { status } = await api.botLoginStatus(session.token);
        if (!alive) return;
        if (status === "pending") {
          timer = setTimeout(poll, POLL_MS);
          return;
        }
        if (status === "approved") {
          if (claimed.current) return;
          claimed.current = true;
          await api.botLoginClaim(session.token);
          if (alive) await onAuthenticated();
          return;
        }
        setSession(null);
        setError(
          status === "declined"
            ? "Вход отклонён в Telegram."
            : "Время подтверждения истекло. Начни вход заново.",
        );
        setPhase("error");
      } catch (e) {
        if (!alive) return;
        setSession(null);
        setError(
          e instanceof ApiError && e.status === 403
            ? "Аккаунт заблокирован — напиши в поддержку."
            : "Не удалось подтвердить вход. Попробуй ещё раз.",
        );
        setPhase("error");
      }
    }

    timer = setTimeout(poll, POLL_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [phase, session, onAuthenticated]);

  // The panel stays mounted while a restart is in flight: collapsing it back to the
  // button and re-expanding moved the page by ~330px on a control whose entire job is
  // "try again".
  if (session && (phase === "waiting" || phase === "starting")) {
    const busy = phase === "starting";
    return (
      <div
        className="bot-login"
        ref={panelRef}
        tabIndex={-1}
        role="group"
        aria-labelledby="bot-login-title"
      >
        <p className="bot-login-title" id="bot-login-title">
          Подтверди вход в Telegram
        </p>
        {/* Hidden by CSS on phone-sized screens: on the device that opens the link, a
            QR of that same link is useless. alt="" because a QR is not actionable via
            a screen reader — the link below carries the identical action. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- static export; an inline data: URI has nothing for an optimizer to do */}
        <img
          className="bot-login-qr"
          src={`data:image/png;base64,${session.qr_png_base64}`}
          alt=""
          width={180}
          height={180}
        />
        <Button
          variant="ghost"
          size="lg"
          full
          className="bot-login-open"
          href={session.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Открыть Telegram
        </Button>
        <p className="bot-login-hint" role="status">
          {busy
            ? "Готовим новую ссылку…"
            : `Ждём подтверждения — нажми «Это я, войти» в боте. Осталось ${formatLeft(left)}`}
        </p>
        <Button variant="link" onClick={start} disabled={busy}>
          начать заново
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="lg"
        full
        className="btn-oauth btn-oauth-telegram"
        iconLeft={<Icon name="telegram" size={20} />}
        loading={phase === "starting"}
        loadingLabel="Готовим ссылку…"
        disabled={disabled}
        onClick={start}
      >
        Войти через Telegram
      </Button>
      {error && (
        <p className="auth-oauth-err" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
