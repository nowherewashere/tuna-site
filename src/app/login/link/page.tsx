"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { finishAuth } from "@/lib/finishAuth";
import { Button } from "@/components/ui";
import Icon from "@/components/Icon";

/**
 * Landing page for the one-tap link mailed with a login code.
 *
 * The link does NOT sign anyone in by being opened — this page asks for one explicit
 * press first. Corporate mail scanners and link-preview crawlers fetch every URL in an
 * email; a link that authenticated on GET would routinely be burned before the user
 * ever touched it, and would hand a session to whatever fetched it. The button is the
 * entire reason this flow is safe to put in an inbox.
 */
export default function LoginLinkPage() {
  const router = useRouter();
  // Three states, and the distinction matters: `null` = not read yet (the server
  // snapshot, and what hydration renders), `""` = definitely no token, a string = the
  // token. A lazy useState initializer reading `location` would hydrate a *different*
  // branch than the prerendered HTML — the /login page gets away with that only
  // because its first render is a spinner on both sides. This one renders content
  // immediately, so it needs a snapshot React knows how to reconcile.
  const token = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("t") ?? "",
    () => null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await api.verifyLoginLink(token);
      await finishAuth("email", (href) => router.replace(href));
    } catch {
      setError(
        "Ссылка не сработала — скорее всего, она устарела или её уже использовали. " +
          "Запроси новый код на странице входа.",
      );
      setBusy(false);
    }
  }

  // Not read yet — server render and hydration land here, so both sides agree.
  if (token === null) {
    return (
      <main className="login">
        <h1 className="sr-only">Подтверди вход</h1>
        <div className="wrap">
          <div className="auth-checking" aria-busy="true">
            <span className="auth-spinner" aria-hidden="true" />
            <span className="sr-only">Открываем ссылку…</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="login">
      <div className="wrap">
        <div className="login-card">
          <h1>Подтверди вход</h1>
          {token ? (
            <>
              <p className="lead">
                Ты открыл ссылку из письма. Нажми кнопку — и мы откроем твой аккаунт.
              </p>
              <div className="auth-hint">
                <span className="auth-hint-ic">
                  <Icon name="mail" size={18} />
                </span>
                <span>
                  Ссылка срабатывает <b>один раз</b> и действует 15 минут с момента
                  отправки письма.
                </span>
              </div>
              <Button
                variant="amber"
                size="lg"
                full
                onClick={confirm}
                loading={busy}
                loadingLabel="Входим…"
              >
                Войти в Tuna
              </Button>
              {error && (
                <p className="auth-oauth-err" role="alert">
                  {error}
                </p>
              )}
              <p className="onb-alt onb-alt-lg">
                <a href="/login">войти другим способом</a>
              </p>
            </>
          ) : (
            <>
              <p className="lead">
                В ссылке нет кода подтверждения — возможно, почтовый клиент обрезал её при
                пересылке.
              </p>
              <Button variant="amber" size="lg" full href="/login">
                Перейти ко входу
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
