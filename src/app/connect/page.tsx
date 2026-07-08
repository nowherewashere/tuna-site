"use client";

import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import InstallBlock from "@/components/InstallBlock";
import Icon from "@/components/Icon";
import Turnstile from "@/components/Turnstile";
import { useTurnstile } from "@/lib/useTurnstile";
import { invalidateAuth } from "@/lib/useAuth";
import { Button, TextField } from "@/components/ui";

type Step = "register" | "code" | "install";

export default function ConnectPage() {
  const ts = useTurnstile();
  const [step, setStep] = useState<Step>("register");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subUrl, setSubUrl] = useState<string>("");

  async function requestCode() {
    if (!email.trim()) return;
    if (ts.required && !ts.token) {
      setError("Секунду — проверяем, что вы не робот…");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.requestLoginCode(email.trim(), ts.token || undefined);
      setStep("code");
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
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndProvision() {
    if (code.trim().length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      await api.verifyLoginCode(email.trim(), code.trim());
      invalidateAuth();
      // Grant the free trial (if the user already has a subscription the API
      // returns 409, which we tolerate and just read the current one).
      try {
        await api.activateTrial();
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 409)) throw e;
      }
      const sub = await api.currentSubscription();
      setSubUrl(sub?.url ?? "");
      setStep("install");
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 410
          ? "Код истёк — запроси новый."
          : "Неверный код. Проверь и попробуй снова.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (step === "register") {
    return (
      <main className="onb">
        <div className="wrap">
          <div className="onb-card">
            <h1>Получи доступ</h1>
            <p className="lead">
              Введи почту — пришлём код, и сразу выдадим подписку. Почта нужна, чтобы входить с
              других устройств.
            </p>
            <TextField
              label="Электронная почта"
              labelHidden
              type="email"
              autoComplete="email"
              placeholder="твой@email.ру"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && requestCode()}
              disabled={loading}
              error={error}
              trailing={
                <Button
                  variant="amber"
                  onClick={requestCode}
                  loading={loading}
                  loadingLabel="Отправляем…"
                  disabled={ts.required && !ts.token}
                >
                  Получить код
                </Button>
              }
            />
            {ts.siteKey && (
              <Turnstile key={ts.resetKey} siteKey={ts.siteKey} onVerify={ts.setToken} />
            )}
            <p className="onb-alt">
              уже есть аккаунт? <Link href="/login">войти</Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (step === "code") {
    return (
      <main className="onb">
        <div className="wrap">
          <div className="onb-card">
            <h1>Введи код</h1>
            <p className="lead">
              Отправили 6-значный код на <b>{email}</b>. Действует 15 минут.
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
              label="Код из письма"
              labelHidden
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="______"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && verifyAndProvision()}
              disabled={loading}
              autoFocus
              error={error}
              trailing={
                <Button
                  variant="amber"
                  onClick={verifyAndProvision}
                  loading={loading}
                  loadingLabel="Выдаём…"
                  disabled={code.length !== 6}
                >
                  Подтвердить
                </Button>
              }
            />
            <p className="onb-alt">
              не пришло?{" "}
              <Button
                variant="link"
                onClick={() => {
                  setStep("register");
                  setCode("");
                  setError(null);
                }}
              >
                ввести другую почту
              </Button>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="onb onb-install">
      <div className="wrap">
        <div className="onb-card onb-card-wide">
          <div className="status-pill status-pill-mb">
            <span className="d" /> Подписка активна · пробный период
          </div>
          <h1>Осталось подключить</h1>
          <p className="lead">Три шага — и ты в сети. Выбери устройство:</p>

          <InstallBlock subUrl={subUrl} />

          <div className="onb-divider" />
          <Button variant="amber" size="lg" full href="/cabinet">
            Открыть личный кабинет →
          </Button>
        </div>
      </div>
    </main>
  );
}
