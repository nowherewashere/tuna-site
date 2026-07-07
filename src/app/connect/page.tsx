"use client";

import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";

const PLATFORMS = [
  { id: "iphone", label: "📱 iPhone" },
  { id: "android", label: "🤖 Android" },
  { id: "windows", label: "💻 Windows" },
  { id: "mac", label: "🍎 Mac" },
  { id: "tv", label: "📺 TV" },
] as const;

type Step = "register" | "code" | "install";

export default function ConnectPage() {
  const [step, setStep] = useState<Step>("register");
  const [platform, setPlatform] = useState<string>("iphone");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subUrl, setSubUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const platLabel = PLATFORMS.find((p) => p.id === platform)?.label.replace(/^\S+\s/, "") ?? "iPhone";

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
          : "Проверь адрес почты и попробуй снова.",
      );
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
      // Grant the free trial (idempotent-ish: if already has a subscription the
      // API returns 409, which we tolerate and just read the current one).
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
              <button className="btn btn-amber" onClick={requestCode} disabled={loading}>
                {loading ? "Отправляем…" : "Получить код"}
              </button>
            </div>
            {error && (
              <p style={{ color: "var(--coral)", fontSize: 14, margin: "4px 0 10px" }}>{error}</p>
            )}
            <p className="onb-alt">
              уже есть аккаунт? <Link href="/login">войти</Link>
            </p>
            <p className="turnstile-note">
              🛡 Защита от ботов включена автоматически (Cloudflare Turnstile)
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
                href={subUrl ? `happ://add/${subUrl}` : undefined}
              >
                ⚡ Добавить подписку в Happ
              </a>
              <div className="copy-link" style={{ marginTop: 10 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {subUrl || "—"}
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
