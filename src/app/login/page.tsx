"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Проверь адрес почты и попробуй снова.");
        return;
      }
      setDevLink(data.devLink ?? null);
      setSent(true);
    } catch {
      setError("Сеть недоступна. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <div className="wrap">
        <div className="login-card">
          <span className="fishmoji">🐟</span>
          {sent ? (
            <>
              <h2>Проверь почту</h2>
              <p className="lead">
                Если аккаунт с адресом <b>{email}</b> существует — мы отправили ссылку для входа.
                Действует 15 минут.
              </p>
              {devLink && (
                <a className="btn btn-amber btn-full btn-lg" href={devLink}>
                  Открыть ссылку (dev)
                </a>
              )}
              <p className="onb-alt" style={{ marginTop: 20 }}>
                не пришло? <a onClick={() => setSent(false)}>ввести другую почту</a>
              </p>
            </>
          ) : (
            <>
              <h2>Вход в Tuna</h2>
              <p className="lead">Введи почту — пришлём ссылку для входа. Без пароля.</p>
              <div className="field-row">
                <input
                  className="field"
                  type="email"
                  placeholder="твой@email.ру"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  disabled={loading}
                />
              </div>
              {error && (
                <p style={{ color: "var(--coral)", fontSize: 14, marginBottom: 10 }}>{error}</p>
              )}
              <button
                className="btn btn-amber btn-full btn-lg"
                onClick={submit}
                disabled={loading}
              >
                {loading ? "Отправляем…" : "Получить ссылку"}
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
