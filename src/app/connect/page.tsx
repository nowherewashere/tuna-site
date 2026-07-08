"use client";

import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import InstallBlock from "@/components/InstallBlock";
import Turnstile from "@/components/Turnstile";
import { useTurnstile } from "@/lib/useTurnstile";
import { invalidateAuth } from "@/lib/useAuth";

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
      <div className="onb">
        <div className="wrap">
          <div className="onb-card">
            <h2>Получи доступ 🐟</h2>
            <p className="lead">
              Введи почту — пришлём код, и сразу выдадим подписку. Почта нужна, чтобы входить с
              других устройств.
            </p>
            <div className="field-row">
              <input
                className="field"
                type="email"
                placeholder="твой@email.ру"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && requestCode()}
                disabled={loading}
              />
              <button
                className="btn btn-amber"
                onClick={requestCode}
                disabled={loading || (ts.required && !ts.token)}
              >
                {loading ? "Отправляем…" : "Получить код"}
              </button>
            </div>
            {ts.siteKey && (
              <Turnstile key={ts.resetKey} siteKey={ts.siteKey} onVerify={ts.setToken} />
            )}
            {error && (
              <p style={{ color: "var(--coral)", fontSize: 14, margin: "4px 0 10px" }}>{error}</p>
            )}
            <p className="onb-alt">
              уже есть аккаунт? <Link href="/login">войти</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="onb">
        <div className="wrap">
          <div className="onb-card">
            <h2>Введи код 🐟</h2>
            <p className="lead">
              Отправили 6-значный код на <b>{email}</b>. Действует 15 минут.
            </p>
            <div className="field-row">
              <input
                className="field"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="______"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && verifyAndProvision()}
                disabled={loading}
                autoFocus
              />
              <button
                className="btn btn-amber"
                onClick={verifyAndProvision}
                disabled={loading || code.length !== 6}
              >
                {loading ? "Выдаём…" : "Подтвердить"}
              </button>
            </div>
            {error && (
              <p style={{ color: "var(--coral)", fontSize: 14, margin: "4px 0 10px" }}>{error}</p>
            )}
            <p className="onb-alt">
              не пришло?{" "}
              <a
                onClick={() => {
                  setStep("register");
                  setCode("");
                  setError(null);
                }}
              >
                ввести другую почту
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="onb" style={{ minHeight: "auto", padding: "56px 0" }}>
      <div className="wrap">
        <div className="onb-card" style={{ maxWidth: 660 }}>
          <div className="status-pill" style={{ marginBottom: 16 }}>
            <span className="d" /> Подписка активна · пробный период
          </div>
          <h2>Осталось подключить</h2>
          <p className="lead">Три шага — и ты в сети. Выбери устройство:</p>

          <InstallBlock subUrl={subUrl} />

          <div className="onb-divider" />
          <Link className="btn btn-amber btn-full btn-lg" href="/cabinet">
            Открыть личный кабинет →
          </Link>
        </div>
      </div>
    </div>
  );
}
