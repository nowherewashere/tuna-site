"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import Turnstile from "@/components/Turnstile";
import { useTurnstile } from "@/lib/useTurnstile";
import { invalidateAuth } from "@/lib/useAuth";
import Icon from "@/components/Icon";
import { Button, TextField } from "@/components/ui";

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const ts = useTurnstile();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function verifyCode() {
    if (code.trim().length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      await api.verifyLoginCode(email.trim(), code.trim());
      invalidateAuth();
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
    <main className="login">
      <div className="wrap">
        <div className="login-card">
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
                label="Код из письма"
                labelHidden
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="______"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                disabled={loading}
                autoFocus
                error={error}
              />
              <Button
                variant="amber"
                size="lg"
                full
                onClick={verifyCode}
                loading={loading}
                loadingLabel="Проверяем…"
                disabled={code.length !== 6}
              >
                Войти
              </Button>
              <p className="onb-alt onb-alt-lg">
                не пришло?{" "}
                <Button
                  variant="link"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError(null);
                  }}
                >
                  ввести другую почту
                </Button>
              </p>
            </>
          ) : (
            <>
              <h1>Вход в Tuna</h1>
              <p className="lead">Введи почту — пришлём код для входа. Без пароля.</p>
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
              />
              {ts.siteKey && (
                <Turnstile key={ts.resetKey} siteKey={ts.siteKey} onVerify={ts.setToken} />
              )}
              <Button
                variant="amber"
                size="lg"
                full
                onClick={requestCode}
                loading={loading}
                loadingLabel="Отправляем…"
                disabled={ts.required && !ts.token}
              >
                Получить код
              </Button>
              <p className="onb-alt onb-alt-lg">
                нет аккаунта? <Link href="/connect">получить доступ</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
