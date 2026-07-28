"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { api, ApiError, trackFunnel } from "@/lib/api";
import { detectPlatform } from "@/components/InstallBlock";
import { readRefCode } from "@/lib/referral";
import { readSelectedPlan } from "@/lib/selectedPlan";
import Turnstile from "@/components/Turnstile";
import { useTurnstile } from "@/lib/useTurnstile";
import { hasSessionHint } from "@/lib/sessionHint";
import { isValidEmail } from "@/lib/email";
import Icon from "@/components/Icon";
import { Button, TextField } from "@/components/ui";
import BotLoginPanel from "@/components/BotLoginPanel";
import { finishAuth } from "@/lib/finishAuth";
import { readLastAuthMethod } from "@/lib/lastAuthMethod";
import { usePublicConfig } from "@/lib/usePublicConfig";
import OAuthButtons from "@/components/OAuthButtons";
import {
  OAUTH_PROVIDER_LABEL,
  isEmbeddedBrowser,
  oauthErrorMessage,
  renderableProviders,
  startOAuth,
  type OAuthProvider,
} from "@/lib/oauth";

type Step = "email" | "code";

// The in-progress email address is mirrored here so a reload, or a Back gesture on the
// code step, doesn't wipe it (step itself is client state; see the popstate handler).
const EMAIL_KEY = "login_email";

// One passwordless screen for both sign-in and sign-up: the backend is
// find-or-create, so there is no separate registration. New accounts are granted
// a trial after the code is confirmed; everyone lands in the cabinet.
export default function LoginPage() {
  const router = useRouter();
  const ts = useTurnstile();
  // Gate the form on a session check so a signed-in user who reloads or navigates
  // here goes straight to the cabinet instead of being asked to log in again.
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<Step>("email");
  // Seeded from sessionStorage (SSR-safe: the email field isn't rendered until the
  // session check clears, so this never mismatches hydration) and mirrored back on
  // change — so a reload, or Back→forward on the code step, keeps the address.
  const [email, setEmail] = useState<string>(() => {
    try {
      return typeof window !== "undefined" ? (sessionStorage.getItem(EMAIL_KEY) ?? "") : "";
    } catch {
      return "";
    }
  });
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Code re-send throttle (client-side; the backend returns no retry_after) plus a
  // separate busy flag so a resend never disables the code field / verify button.
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Persistent polite live region text — a freshly-mounted aria-live node isn't
  // reliably announced, so the region stays mounted and only its text changes.
  const [liveMsg, setLiveMsg] = useState("");
  // Social sign-in: which provider's redirect is in flight, and the failure the
  // /auth/callback shell bounced back here as `?error=`.
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);
  // A social sign-in that failed comes back as /login?error=<code> — the callback
  // shell is a bare redirect target and can't render an error itself. Seeded from the
  // URL here rather than in an effect (SSR-safe for the same reason as `email` above:
  // nothing on this branch renders until the session check clears).
  const [oauthError, setOauthError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const code = new URLSearchParams(window.location.search).get("error");
    return code ? oauthErrorMessage(code) : null;
  });

  const publicConfig = usePublicConfig();
  // Gate on what will actually render, not on the raw list: a provider the backend
  // enables before this build knows its mark is dropped, and gating on the raw list
  // would leave a lone "или по почте" divider above nothing.
  const oauthProviders = renderableProviders(publicConfig?.oauth_providers ?? []);
  // /config is a runtime fetch, so the buttons arrive after first paint. Reserve their
  // row meanwhile or everything below — including the autofocused email field — jumps
  // down when they land (same reason .tg-auth carries a min-height).
  const providersPending = publicConfig === null;

  // Referral attribution captured from a /r/<code> visit (RefCapture). Client-only;
  // useSyncExternalStore returns null on the server so SSG markup matches (no flash).
  const refCode = useSyncExternalStore(
    () => () => {},
    () => readRefCode(),
    () => null,
  );

  // Which method worked last time, for the "в прошлый раз" hint. Same shape as
  // refCode above: client-only storage, so the server snapshot is null and the
  // static markup matches (no flash, no hydration mismatch).
  const lastMethod = useSyncExternalStore(
    () => () => {},
    () => readLastAuthMethod(),
    () => null,
  );

  // Already-authenticated guard. A valid session cookie (or a silent refresh of an
  // expired access token) resolves /auth/me → straight to the cabinet. Only when it
  // truly fails do we show the form and mark the funnel start.
  //
  // Gate the probe on the `has_session` hint: no hint means the visitor is definitely
  // anonymous, so we skip /auth/me (no guest 401 on this page) and go straight to the
  // form — identical outcome, minus the console error (SEO-11).
  useEffect(() => {
    function showForm() {
      setChecking(false);
      trackFunnel("start", { platform: detectPlatform() });
    }
    if (!hasSessionHint()) {
      showForm();
      return;
    }
    let alive = true;
    api
      .me()
      .then(() => {
        // Honor a plan picked on the landing before this session was recognized.
        if (alive) router.replace(readSelectedPlan() ? "/cabinet#sub" : "/cabinet");
      })
      .catch(() => {
        if (alive) showForm();
      });
    return () => {
      alive = false;
    };
  }, [router]);

  // Drop ?error= from the URL once it has been read into state, so a reload doesn't
  // resurrect a stale failure. Deliberately no setState — the value is already seeded.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("error")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Mirror the entered address to sessionStorage so a reload or a Back→forward cycle
  // on the code step keeps it (seeded back via the useState initializer above).
  useEffect(() => {
    try {
      if (email) sessionStorage.setItem(EMAIL_KEY, email);
    } catch {
      /* storage blocked — non-fatal */
    }
  }, [email]);

  // A native Back on the code step pops the history entry requestCode() pushed and
  // returns to the email step in place, instead of leaving /login and remounting with
  // empty fields (the address is still in state / sessionStorage).
  useEffect(() => {
    function onPop() {
      setStep("email");
      setCode("");
      setError(null);
      setLiveMsg("");
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Tick the resend cooldown down to zero. Self-clearing: each decrement re-runs this
  // effect and the previous timeout is cleared here (also on unmount mid-countdown).
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // The bare send + error handling, with no history/step side-effects, so the initial
  // request and an in-place resend share one path (and one error vocabulary). `setBusy`
  // is the caller's busy flag: setLoading for the initial send (locks the form), or
  // setResending for a resend (leaves the code field / verify button usable).
  async function sendCode(setBusy: (b: boolean) => void): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await api.requestLoginCode(email.trim(), ts.token || undefined, refCode || undefined);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        ts.reset();
        setError("Проверка не пройдена. Попробуй ещё раз.");
      } else {
        setError(
          e instanceof ApiError && e.status === 503
            ? "Отправка кода временно недоступна. Попробуй позже."
            : e instanceof ApiError && e.status === 429
              ? "Слишком много запросов. Подожди немного и попробуй снова."
              : "Проверь адрес почты и попробуй снова.",
        );
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function requestCode() {
    if (!isValidEmail(email)) {
      setError("Проверь адрес почты — похоже, есть опечатка.");
      return;
    }
    if (ts.required && !ts.token) {
      setError("Секунду — проверяем, что ты не робот…");
      return;
    }
    if (await sendCode(setLoading)) {
      // Push a history entry so a native Back returns to the email step (see popstate
      // handler) instead of leaving /login and losing the in-progress login.
      window.history.pushState({ loginStep: "code" }, "");
      setStep("code");
      setLiveMsg(`Код отправлен на ${email.trim()}`);
      setCooldown(30);
    }
  }

  // Explicit "send it again" for the code step. Turnstile's token is single-use and its
  // widget only lives on the email step, so when a fresh check is required we return to
  // the email step (address preserved) to re-solve; otherwise we resend in place.
  // Throttled by the cooldown, and never while a verify is in flight.
  async function resendCode() {
    if (cooldown > 0 || resending || loading) return;
    if (ts.required) {
      window.history.back();
      return;
    }
    if (await sendCode(setResending)) {
      setLiveMsg(`Код отправлен повторно на ${email.trim()}`);
      setCooldown(30);
    }
  }

  // "Enter a different address" — actually clears the email (the old control kept it,
  // making it a mislabelled resend), then returns to the email step via history.
  function enterDifferentEmail() {
    setEmail("");
    try {
      sessionStorage.removeItem(EMAIL_KEY);
    } catch {
      /* storage blocked — non-fatal */
    }
    setCode("");
    setError(null);
    setLiveMsg("");
    window.history.back();
  }

  // Leaves the SPA entirely, so there is no success path to handle here — the browser
  // comes back to /auth/callback. The busy flag only survives until the navigation
  // commits; it exists so a second click can't start a competing flow.
  function startProvider(provider: OAuthProvider) {
    setOauthError(null);
    setOauthBusy(provider);
    setLiveMsg(`Переходим к ${OAUTH_PROVIDER_LABEL[provider]}…`);
    startOAuth(provider, { ref: refCode || undefined });
  }


  // Accepts the code explicitly so auto-submit can pass the just-typed value without
  // waiting for the state update; falls back to state for the button / Enter key.
  async function verifyCode(value?: string) {
    const entered = (value ?? code).trim();
    if (entered.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      await api.verifyLoginCode(email.trim(), entered);
      await finishAuth("email", (href) => router.push(href));
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 410
          ? "Код истёк — запроси новый."
          : "Неверный код. Проверь и попробуй снова.",
      );
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="login">
        {/* The settled form renders its own <h1>, but the transient checking state
            has none — give it a visually-hidden heading so /login never snapshots
            without a level-one heading (axe page-has-heading-one). */}
        <h1 className="sr-only">Вход в Tuna</h1>
        <div className="wrap">
          <div className="auth-checking" aria-busy="true">
            <span className="auth-spinner" aria-hidden="true" />
            <span className="sr-only">Проверяем сессию…</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="login">
      <div className="wrap">
        <div className="login-card">
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {liveMsg}
          </div>
          {step === "code" ? (
            <>
              <h1>Введи код</h1>
              <p className="lead">
                Мы отправили 6-значный код на <b>{email}</b>. Действует 15 минут.
              </p>
              <div className="auth-hint">
                <span className="auth-hint-ic">
                  <Icon name="mail" size={18} />
                </span>
                <span>
                  Письмо приходит в течение минуты. Если его не видно — загляни в папку{" "}
                  <b>«Спам»</b>.
                </span>
              </div>
              <TextField
                key="login-code"
                label="Код из письма"
                labelHidden
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="______"
                value={code}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(next);
                  // Auto-submit the moment the 6th digit lands (modern OTP UX); button
                  // and Enter stay as fallback. Guarded on !loading so a wrong code
                  // (which leaves 6 digits in place) doesn't resubmit until an edit.
                  if (next.length === 6 && !loading) verifyCode(next);
                }}
                onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                disabled={loading}
                autoFocus
                error={error}
              />
              <Button
                variant="amber"
                size="lg"
                full
                onClick={() => verifyCode()}
                loading={loading}
                loadingLabel="Проверяем…"
                disabled={code.length !== 6}
              >
                Продолжить
              </Button>
              <p className="onb-alt onb-alt-lg">
                не пришло?{" "}
                <Button
                  variant="link"
                  onClick={resendCode}
                  disabled={cooldown > 0 || resending}
                >
                  {cooldown > 0 ? `прислать код ещё раз (${cooldown})` : "прислать код ещё раз"}
                </Button>
                <span aria-hidden="true"> · </span>
                <Button variant="link" onClick={enterDifferentEmail}>
                  ввести другую почту
                </Button>
              </p>
            </>
          ) : (
            <>
              <h1>Вход в Tuna</h1>
              <p className="lead">
                Войди одним нажатием — или получи код на почту. Войдём или создадим аккаунт и сразу
                выдадим доступ. Без пароля.
              </p>
              {/* One-tap methods first: the email path costs two steps and a wait for
                  the letter, so it sits below as the universal fallback. */}
              <>
                <div className="auth-social">
                  {oauthProviders.length > 0 && isEmbeddedBrowser() && (
                    <p className="auth-oauth-note">
                      Если вход через Google не открывается — открой сайт в Chrome
                      или Safari.
                    </p>
                  )}
                  {providersPending ? (
                    <div className="auth-oauth-reserve" aria-hidden="true" />
                  ) : (
                    <OAuthButtons
                      providers={oauthProviders}
                      busy={oauthBusy}
                      lastUsed={lastMethod}
                      onStart={startProvider}
                    />
                  )}
                  {oauthError && (
                    <p className="auth-oauth-err" role="alert">
                      {oauthError}
                    </p>
                  )}
                  {/* Telegram's own Login Widget used to sit here. It is a fixed-width
                      iframe served from oauth.telegram.org behind a script from
                      telegram.org — a third-party dependency in the one market where it
                      is least dependable, and one that could never line up with the
                      full-width buttons beside it. This panel does the same job
                      first-party and at the same size. */}
                  <BotLoginPanel
                    disabled={loading}
                    onAuthenticated={() => finishAuth("telegram", (h) => router.push(h))}
                  />
                  {lastMethod === "telegram" && (
                    <p className="auth-last-note">В прошлый раз ты входил через Telegram.</p>
                  )}
                </div>
                {/* Outside .auth-social: it separates the two groups rather than
                    belonging to the social one, which also lets its own margins do
                    the spacing instead of collapsing into the block's. */}
                <div className="auth-sep">или по почте</div>
              </>
              <TextField
                key="login-email"
                label="Электронная почта"
                labelHidden
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && requestCode()}
                disabled={loading}
                autoFocus
                error={error}
              />
              {ts.siteKey && (
                <Turnstile
                  key={ts.resetKey}
                  siteKey={ts.siteKey}
                  onVerify={ts.setToken}
                  onError={ts.onError}
                />
              )}
              {ts.failed && (
                <p className="auth-ts-err" role="alert">
                  Не удалось пройти проверку безопасности — возможно, её блокирует
                  расширение в браузере.{" "}
                  <Button variant="link" onClick={ts.reset}>
                    Повторить проверку
                  </Button>
                </p>
              )}
              <Button
                variant="amber"
                size="lg"
                full
                onClick={requestCode}
                loading={loading}
                loadingLabel="Отправляем…"
                disabled={!isValidEmail(email) || (ts.required && !ts.token)}
              >
                Получить код
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
