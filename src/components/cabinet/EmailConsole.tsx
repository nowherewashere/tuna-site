"use client";

import { useState } from "react";
import { api, type Me } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import Icon from "@/components/Icon";
import { Button, ConsoleFrame, TextField } from "@/components/ui";

/**
 * The email half of the account-link surface — the mirror of `TelegramConsole`.
 *
 * The caller renders this only while the account has no verified email, because
 * that is exactly when signing in with email would create a *second* account
 * instead of finding this one. Confirming a code sent to an address that already
 * owns an account merges the two server-side; the code is the proof of ownership.
 *
 * Resumes mid-flow: a `pending_email` on the profile means a code is already in
 * the user's inbox, so we open on the code step rather than mailing another one.
 * (The profile is loaded before this mounts, so reading it into initial state is safe.)
 */
export default function EmailConsole({
  me,
  onVerified,
}: {
  me: Me;
  onVerified: (merged: boolean) => void;
}) {
  const pending = me.pending_email;
  const [step, setStep] = useState<"email" | "code">(pending ? "code" : "email");
  const [email, setEmail] = useState(pending ?? me.email ?? "");
  const [sentTo, setSentTo] = useState(pending ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    const target = email.trim();
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestEmailVerification(target);
      setSentTo(res.target_email);
      setCode("");
      setStep("code");
    } catch (e) {
      setError(sendError(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.confirmEmailVerification(code);
      onVerified(res.merged);
    } catch (e) {
      // Keep the raw error in the console so the exact status/detail is visible
      // when diagnosing a failed confirmation.
      console.error("Email confirmation failed:", e);
      setError(confirmError(e));
      setBusy(false);
    }
  }

  return (
    <ConsoleFrame className="tg-console" aria-label="Электронная почта">
      <span className="tg-kicker mono">{"// почта"}</span>

      {step === "code" ? (
        <>
          <h3 className="tg-console-title">Введи код из письма</h3>
          <p className="tg-console-sub">
            Отправили 6-значный код на <b>{sentTo}</b>. Если письма нет — загляни в «Спам».
          </p>
          <TextField
            label="Код из письма"
            labelHidden
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="______"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && confirm()}
            disabled={busy}
          />
          <div className="link-actions">
            <Button
              variant="amber"
              loading={busy}
              loadingLabel="Проверяем…"
              disabled={code.length !== 6}
              onClick={confirm}
            >
              Подтвердить почту
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              Другая почта
            </Button>
          </div>
          {error && (
            <p className="tg-console-err" role="alert">
              {error}
            </p>
          )}
        </>
      ) : (
        <>
          <h3 className="tg-console-title">Добавь почту</h3>
          <p className="tg-console-sub">
            Заходи в один аккаунт откуда удобно: по коду на почту и через Telegram.
          </p>
          <p className="link-warn">
            <Icon name="link" size={16} className="link-warn-ic" />
            Без почты вход с сайта заведёт второй аккаунт — подписка и реферальный баланс
            останутся в этом.
          </p>
          <TextField
            label="Электронная почта"
            labelHidden
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendCode()}
            disabled={busy}
          />
          <Button
            variant="amber"
            loading={busy}
            loadingLabel="Отправляем…"
            disabled={!email.trim()}
            onClick={sendCode}
          >
            Прислать код
          </Button>
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

function sendError(e: unknown): string {
  return apiErrorMessage(e, {
    byStatus: {
      429: "Код уже отправлен. Подожди минуту и запроси новый.",
      503: "Отправка писем сейчас недоступна. Напиши в поддержку.",
      502: "Письмо не ушло. Попробуй ещё раз.",
      409: "Эта почта уже подтверждена на твоём аккаунте.",
      422: "Проверь адрес — похоже, в нём опечатка.",
    },
    fallback: "Не удалось отправить код. Попробуй ещё раз.",
  });
}

function confirmError(e: unknown): string {
  return apiErrorMessage(e, {
    // Both 409s mean the same thing to the user: the accounts can't be joined
    // automatically, and support has to do it. The reasons differ, so does the copy.
    byDetail: {
      two_active_subscriptions:
        "У обоих аккаунтов активная подписка — напиши в поддержку, объединим вручную.",
    },
    byStatus: {
      410: "Код истёк. Запроси новый.",
      403: "Аккаунт с этой почтой заблокирован.",
      409: "К этой почте привязан другой Telegram — напиши в поддержку, объединим вручную.",
      400: "Неверный код. Проверь письмо и попробуй ещё раз.",
    },
    fallback: "Не удалось подтвердить почту. Попробуй ещё раз.",
  });
}
