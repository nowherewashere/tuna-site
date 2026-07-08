"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.requestLoginCode(email.trim());
      setStep("code");
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 503
          ? "Отправка кода временно недоступна. Попробуй позже."
          : e instanceof ApiError && e.status === 429
            ? "Слишком много запросов. Подожди немного и попробуй снова."
            : "Проверь адрес почты и попробуй снова.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (code.trim().length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      await api.verifyLoginCode(email.trim(), code.trim());
      router.push("/cabinet");
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

  return (
    <div className="login">
      <div className="wrap">
        <div className="login-card">
          <span className="fishmoji">🐟</span>
          {step === "code" ? (
            <>
              <h2>Введи код</h2>
              <p className="lead">
                Мы отправили 6-значный код на <b>{email}</b>. Действует 15 минут.
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
                  onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                  disabled={loading}
                  autoFocus
                />
              </div>
              {error && (
                <p style={{ color: "var(--coral)", fontSize: 14, marginBottom: 10 }}>{error}</p>
              )}
              <button
                className="btn btn-amber btn-full btn-lg"
                onClick={verifyCode}
                disabled={loading || code.length !== 6}
              >
                {loading ? "Проверяем…" : "Войти"}
              </button>
              <p className="onb-alt" style={{ marginTop: 20 }}>
                не пришло?{" "}
                <a
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError(null);
                  }}
                >
                  ввести другую почту
                </a>
              </p>
            </>
          ) : (
            <>
              <h2>Вход в Tuna</h2>
              <p className="lead">Введи почту — пришлём код для входа. Без пароля.</p>
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
              </div>
              {error && (
                <p style={{ color: "var(--coral)", fontSize: 14, marginBottom: 10 }}>{error}</p>
              )}
              <button
                className="btn btn-amber btn-full btn-lg"
                onClick={requestCode}
                disabled={loading}
              >
                {loading ? "Отправляем…" : "Получить код"}
              </button>
              <p className="onb-alt" style={{ marginTop: 20 }}>
                нет аккаунта? <Link href="/connect">получить доступ</Link>
              </p>
              <p className="turnstile-note">🛡 Cloudflare Turnstile</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
