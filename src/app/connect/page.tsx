"use client";

import Link from "next/link";
import { useState } from "react";

const PLATFORMS = [
  { id: "iphone", label: "📱 iPhone" },
  { id: "android", label: "🤖 Android" },
  { id: "windows", label: "💻 Windows" },
  { id: "mac", label: "🍎 Mac" },
  { id: "tv", label: "📺 TV" },
] as const;

type Step = "register" | "install";

interface AccessResult {
  username: string;
  subscriptionUrl: string | null;
  expireAt: string;
}

export default function ConnectPage() {
  const [step, setStep] = useState<Step>("register");
  const [platform, setPlatform] = useState<string>("iphone");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AccessResult | null>(null);
  const [copied, setCopied] = useState(false);

  const platLabel =
    PLATFORMS.find((p) => p.id === platform)?.label.replace(/^\S+\s/, "") ?? "iPhone";
  const subUrl = result?.subscriptionUrl ?? "";

  async function getAccess(withEmail: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withEmail ? { email } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "account_exists"
            ? "Аккаунт с этой почтой уже есть — войди."
            : "Не удалось выдать доступ. Попробуй ещё раз.",
        );
        return;
      }
      setResult(data);
      setStep("install");
    } catch {
      setError("Сеть недоступна. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  function copySub() {
    if (!subUrl) return;
    navigator.clipboard?.writeText(subUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (step === "register") {
    return (
      <div className="onb">
        <div className="wrap">
          <div className="onb-card">
            <h2>Получи доступ 🐟</h2>
            <p className="lead">
              Введи почту — сразу выдадим подписку. Почта нужна, чтобы входить с других устройств.
            </p>
            <div className="field-row">
              <input
                className="field"
                type="email"
                placeholder="твой@email.ру"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <button
                className="btn btn-amber"
                onClick={() => getAccess(true)}
                disabled={loading}
              >
                {loading ? "Выдаём…" : "Получить доступ"}
              </button>
            </div>
            {error && (
              <p style={{ color: "var(--coral)", fontSize: 14, margin: "4px 0 10px" }}>{error}</p>
            )}
            <p className="onb-alt">
              или{" "}
              <a onClick={() => !loading && getAccess(false)}>продолжить без почты</a> · уже есть
              аккаунт? <Link href="/login">войти</Link>
            </p>
            <p className="turnstile-note">
              🛡 Защита от ботов включена автоматически (Cloudflare Turnstile)
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
            <span className="d" /> Подписка активна · 24 часа бесплатно
          </div>
          <h2>Осталось подключить</h2>
          <p className="lead">Три шага — и ты в сети. Выбери устройство:</p>

          <div className="plat-picker">
            {PLATFORMS.map((p) => (
              <span
                key={p.id}
                className={`plat${platform === p.id ? " on" : ""}`}
                onClick={() => setPlatform(p.id)}
              >
                {p.label}
              </span>
            ))}
          </div>

          <div className="istep">
            <div className="istep-n">1</div>
            <div className="istep-body">
              <h4>Установи Happ</h4>
              <p>Приложение, через которое работает VPN.</p>
              <a className="btn btn-ghost" style={{ marginTop: 10 }}>
                ⬇️ Скачать Happ для {platLabel}
              </a>
            </div>
          </div>
          <div className="istep">
            <div className="istep-n">2</div>
            <div className="istep-body">
              <h4>Добавь Tuna</h4>
              <p>Одним тапом — настроится само.</p>
              <a
                className="btn btn-amber"
                style={{ marginTop: 10 }}
                href={subUrl ? `happ://add/${encodeURIComponent(subUrl)}` : undefined}
              >
                ⚡ Добавить подписку в Happ
              </a>
              <div className="copy-link" style={{ marginTop: 10 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {subUrl || "happ://add/…"}
                </span>
                <span className="amber" onClick={copySub}>
                  {copied ? "скопировано ✓" : "копировать"}
                </span>
              </div>
            </div>
          </div>
          <div className="istep">
            <div className="istep-n">3</div>
            <div className="istep-body">
              <h4>Готово 🎉</h4>
              <p>Включи Happ и открой то, что не открывалось.</p>
            </div>
          </div>

          <div className="onb-divider" />
          <Link className="btn btn-amber btn-full btn-lg" href="/cabinet">
            Открыть личный кабинет →
          </Link>
        </div>
      </div>
    </div>
  );
}
