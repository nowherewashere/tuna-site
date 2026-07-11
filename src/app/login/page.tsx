"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { api, ApiError, trackFunnel, type TelegramAuthUser } from "@/lib/api";
import { detectPlatform } from "@/components/InstallBlock";
import { readRefCode } from "@/lib/referral";
import { readSelectedPlan } from "@/lib/selectedPlan";
import Turnstile from "@/components/Turnstile";
import { useTurnstile } from "@/lib/useTurnstile";
import { invalidateAuth } from "@/lib/useAuth";
import { hasSessionHint } from "@/lib/sessionHint";
import { isValidEmail } from "@/lib/email";
import Icon from "@/components/Icon";
import { Button, TextField } from "@/components/ui";
import TelegramLoginButton from "@/components/TelegramLoginButton";
import { TELEGRAM_BOT } from "@/lib/config";

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
  const [tgError, setTgError] = useState<string | null>(null);
  // The Telegram widget's script/iframe failed to load (blocked, or bot domain not
  // registered) — swap in a Russian fallback instead of a dead button / raw error.
  const [tgWidgetFailed, setTgWidgetFailed] = useState(false);
  // Code re-send throttle (client-side; the backend returns no retry_after) plus a
  // separate busy flag so a resend never disables the code field / verify button.
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Persistent polite live region text — a freshly-mounted aria-live node isn't
  // reliably announced, so the region stays mounted and only its text changes.
  const [liveMsg, setLiveMsg] = useState("");

  // Referral attribution captured from a /r/<code> visit (RefCapture). Client-only;
  // useSyncExternalStore returns null on the server so SSG markup matches (no flash).
  const refCode = useSyncExternalStore(
    () => () => {},
    () => readRefCode(),
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

  // Post-authentication routing, shared by the email and Telegram paths. A brand-new
  // account has no subscription → grant the trial (idempotent; 409 = already has one)
  // and fire the onboarding funnel steps. Everyone ends up in the cabinet, which shows
  // the install guide at the top.
  async function finishAuth() {
    invalidateAuth();
    const existing = await api.currentSubscription().catch(() => null);
    if (!existing) {
      try {
        await api.activateTrial();
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 409)) {
          console.error("Trial activation failed:", e);
        }
      }
      const sub = await api.currentSubscription().catch(() => null);
      if (sub) {
        const platform = detectPlatform();
        trackFunnel("config_issued", { platform, userRef: sub.user_remna_id });
        trackFunnel("app_install_shown", { platform, userRef: sub.user_remna_id });
      }
    }
    // A plan chosen on the landing (sessionStorage) deep-links into the Subscription
    // tab, where the cabinet preselects it once offers load — instead of a blank Overview.
    router.push(readSelectedPlan() ? "/cabinet#sub" : "/cabinet");
  }

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

  async function loginWithTelegram(user: TelegramAuthUser) {
    setLoading(true);
    setTgError(null);
    try {
      await api.telegramLogin(user);
      await finishAuth();
    } catch (e) {
      console.error("Telegram login failed:", e);
      // 403 = the account is blocked; 401 = the widget hash didn't verify on the
      // backend; anything else is a transient/network error.
      setTgError(
        e instanceof ApiError && e.status === 403
          ? "Аккаунт заблокирован — напиши в поддержку."
          : e instanceof ApiError && e.status === 401
            ? "Не удалось подтвердить вход через Telegram. Попробуй ещё раз."
            : "Не получилось войти через Telegram. Попробуй ещё раз.",
      );
      setLoading(false);
    }
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
      await finishAuth();
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
                Введи почту — пришлём код. Войдём или создадим аккаунт и сразу выдадим доступ. Без
                пароля.
              </p>
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
              {TELEGRAM_BOT && (
                <div className="auth-tg">
                  <div className="auth-sep">или</div>
                  <p className="auth-tg-note">Уже заходили через Telegram? Войди одним нажатием.</p>
                  {tgWidgetFailed ? (
                    <p className="auth-tg-fallback" role="alert">
                      Не удалось загрузить вход через Telegram — обнови страницу или
                      войди по почте выше.
                    </p>
                  ) : (
                    <TelegramLoginButton
                      botUsername={TELEGRAM_BOT}
                      onAuth={loginWithTelegram}
                      onError={() => setTgWidgetFailed(true)}
                      cornerRadius={12}
                    />
                  )}
                  {tgError && (
                    <p className="auth-tg-err" role="alert">
                      {tgError}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
