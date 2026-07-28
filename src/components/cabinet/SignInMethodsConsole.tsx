"use client";

import { useId, useState } from "react";
import { api, type Me } from "@/lib/api";
import { usePublicConfig } from "@/lib/usePublicConfig";
import {
  OAUTH_PROVIDER_LABEL,
  isEmbeddedBrowser,
  renderableProviders,
  startOAuth,
  type OAuthProvider,
} from "@/lib/oauth";
import BrandIcon from "@/components/BrandIcon";
import Icon from "@/components/Icon";
import { Button, ConsoleFrame } from "@/components/ui";

// Why an unlink is refused. Same rule the backend enforces (409 last_sign_in_method),
// stated here so the user reads it instead of hitting the error.
const LAST_METHOD_REASON =
  "Это твой единственный способ входа. Сначала привяжи Telegram, подтверди почту или " +
  "подключи другой сервис — иначе отвязка закроет доступ к аккаунту.";

// A short fixed run, not one star per character: matching the length leaks it, and at
// default screen-reader punctuation the stars are not spoken at all — which would turn
// "a****@gmail.com" into a confidently wrong "a@gmail.com".
function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return email;
  return `${email.slice(0, 1)}•••${email.slice(at)}`;
}

/**
 * How many ways this account can still be signed into.
 *
 * Mirrors the backend rule (`count_sign_in_methods`) so the UI can explain a refusal
 * before the request rather than after a 409. It cannot see `password_hash`, so an
 * account with an unverified email *and* a password counts one lower here than on the
 * server — that errs toward refusing the unlink, which is the recoverable direction.
 */
function signInMethodCount(me: Me, excluding?: string): number {
  let total = 0;
  if (me.telegram_id !== null) total += 1;
  if (me.email && me.is_email_verified) total += 1;
  total += (me.oauth_providers ?? []).filter((p) => p.provider !== excluding).length;
  return total;
}

/**
 * The social half of the account-link surface; `TelegramConsole` and `EmailConsole`
 * are its siblings for the other two methods.
 *
 * Renders nothing when no provider is enabled server-side, so the cabinet is unchanged
 * while the feature ships dark.
 */
export default function SignInMethodsConsole({
  me,
  onChanged,
}: {
  me: Me | null;
  onChanged: (updated: Me) => void;
}) {
  const config = usePublicConfig();
  const headingId = useId();
  const reasonId = useId();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const providers = renderableProviders(config?.oauth_providers ?? []);
  if (!me || providers.length === 0) return null;

  const linked = new Map((me.oauth_providers ?? []).map((p) => [p.provider, p]));
  const anyLast = providers.some((p) => linked.has(p) && signInMethodCount(me, p) === 0);

  async function link(provider: OAuthProvider) {
    setError(null);
    setNotice(null);
    setBusy(provider);
    // Warm the access token first: /oauth/<p>/link/start is a top-level navigation, and
    // a 401 there cannot be silently refreshed and replayed the way an API call can.
    await api.me().catch(() => {});
    startOAuth(provider, { link: true });
    // The navigation normally ends this page. If it was blocked — an in-app WebView, a
    // navigation block — clear the busy state so the button is not stuck forever.
    setTimeout(() => setBusy(null), 4000);
  }

  async function unlink(provider: OAuthProvider) {
    setError(null);
    setNotice(null);
    setBusy(provider);
    try {
      onChanged(await api.oauthUnlink(provider));
      setNotice(`${OAUTH_PROVIDER_LABEL[provider]} отвязан.`);
    } catch {
      setError(`Не удалось отвязать ${OAUTH_PROVIDER_LABEL[provider]}. Попробуй ещё раз.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <ConsoleFrame className="tg-console" aria-labelledby={headingId}>
      <span className="tg-kicker mono">{"// способы входа"}</span>
      <h3 className="tg-console-title" id={headingId}>
        Вход одним нажатием
      </h3>
      <p className="tg-console-sub">
        Привяжи аккаунт — и заходи без кода на почту. Это тот же профиль, второй не появится.
      </p>
      {isEmbeddedBrowser() && (
        <p className="link-warn">
          <Icon name="link" size={16} className="link-warn-ic" />
          Если привязка не открывается — открой сайт в Chrome или Safari: Google не пускает
          вход из встроенного браузера.
        </p>
      )}

      <ul className="signin-list">
        {providers.map((provider) => {
          const row = linked.get(provider);
          const label = OAUTH_PROVIDER_LABEL[provider];
          const isLast = !!row && signInMethodCount(me, provider) === 0;
          return (
            <li className="signin-row" key={provider}>
              <span className="signin-id">
                <BrandIcon name={provider} size={18} />
                <span>
                  {label}
                  {row?.provider_email && (
                    <span className="signin-email"> · {maskEmail(row.provider_email)}</span>
                  )}
                </span>
              </span>

              {row ? (
                <span className="signin-actions">
                  <span className="signin-ok">
                    <Icon name="check" size={16} /> подключён
                  </span>
                  {/* aria-disabled rather than `disabled`: a disabled button leaves the
                      tab order entirely, so a keyboard or screen-reader user would meet
                      no control and no explanation at all. Kept focusable, described by
                      the reason, and the click is intercepted. */}
                  <Button
                    variant="link"
                    aria-label={`Отвязать ${label}`}
                    aria-disabled={isLast || undefined}
                    aria-describedby={isLast ? reasonId : undefined}
                    loading={busy === provider}
                    loadingLabel="отвязываем…"
                    onClick={() => (isLast ? setError(LAST_METHOD_REASON) : unlink(provider))}
                  >
                    отвязать
                  </Button>
                </span>
              ) : (
                <Button
                  variant="ghost"
                  aria-label={`Привязать ${label}`}
                  onClick={() => link(provider)}
                  loading={busy === provider}
                  loadingLabel="Открываем…"
                >
                  Привязать
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {anyLast && (
        <p className="link-warn" id={reasonId}>
          <Icon name="link" size={16} className="link-warn-ic" />
          {LAST_METHOD_REASON}
        </p>
      )}
      {/* Failure is an alert; a successful unlink only changes a row, so it needs its
          own polite announcement or a screen-reader user hears nothing. */}
      <p className="tg-console-err" role="alert">
        {error}
      </p>
      <p className="sr-only" role="status">
        {notice}
      </p>
    </ConsoleFrame>
  );
}
