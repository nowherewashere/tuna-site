"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  api,
  type Device,
  type DurationOffer,
  type Me,
  type ReferralProgram,
  type SubscriptionInfo,
  type SubscriptionOffers,
} from "@/lib/api";
import InstallBlock from "@/components/InstallBlock";
import { useHashTab } from "@/lib/useHashTab";

type Tab = "overview" | "devices" | "sub" | "ref" | "support";
type ChatMsg = { who: "them" | "me" | "sys"; text: string };

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Обзор" },
  { id: "devices", label: "Устройства" },
  { id: "sub", label: "Подписка" },
  { id: "ref", label: "Рефералка" },
  { id: "support", label: "Поддержка" },
];
const TAB_IDS: Tab[] = TABS.map((t) => t.id);

function durationLabel(days: number): string {
  if (days === 0) return "Навсегда";
  if (days % 365 === 0) return `${days / 365} г`;
  if (days % 30 === 0) return `${days / 30} мес`;
  return `${days} дн`;
}

// Pick a display price for a duration: prefer a RUB gateway, else the first.
function pickPrice(d: DurationOffer) {
  return d.prices.find((p) => p.currency === "RUB") ?? d.prices[0] ?? null;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Активна",
  EXPIRED: "Истекла",
  LIMITED: "Лимит трафика",
  DISABLED: "Отключена",
};

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function fmtBytes(n: number): string {
  if (!n) return "0 Б";
  const u = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

function platformEmoji(p?: string | null): string {
  const s = (p ?? "").toLowerCase();
  if (s.includes("ios") || s.includes("iphone")) return "📱";
  if (s.includes("mac")) return "💻";
  if (s.includes("android")) return "🤖";
  if (s.includes("windows")) return "🖥️";
  if (s.includes("tv")) return "📺";
  return "📱";
}

export default function CabinetPage() {
  const router = useRouter();
  const [tab, setTab] = useHashTab(TAB_IDS, "overview");
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      who: "them",
      text: "Привет! 🐟 Опиши, что не работает — поможем. К сообщению уже приложены твой ID и тариф, так что сразу видим контекст.",
    },
    {
      who: "sys",
      text: "📢 Апдейт · сегодня: обновили сервера, стало пробивать стабильнее. Если висит — нажми ⟳ в Happ.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [maxDevices, setMaxDevices] = useState<number | null>(null);
  const [offers, setOffers] = useState<SubscriptionOffers | null>(null);
  const [referral, setReferral] = useState<ReferralProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, subRes] = await Promise.all([api.me(), api.currentSubscription()]);
        setMe(meRes);
        setSub(subRes);
      } catch {
        setAuthed(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Plans/prices and referral come from the backend (403 for referral when the
  // user has no active subscription — handled by falling back to null).
  useEffect(() => {
    api.subscriptionOffers().then(setOffers).catch(() => setOffers(null));
    api.referralProgram().then(setReferral).catch(() => setReferral(null));
  }, []);

  function loadDevices() {
    api
      .devices()
      .then((d) => {
        setDevices(d.devices);
        setMaxDevices(d.max_count);
      })
      .catch(() => {
        setDevices([]);
        setMaxDevices(null);
      });
  }
  useEffect(() => {
    loadDevices();
  }, []);

  async function unbind(hwid: string) {
    setDevices((ds) => ds?.filter((d) => d.hwid !== hwid) ?? null);
    await api.deleteDevice(hwid).catch(() => {});
    loadDevices();
  }

  async function logout() {
    await api.logout().catch(() => {});
    router.push("/");
  }

  function sendMsg() {
    const v = draft.trim();
    if (!v) return;
    setMessages((m) => [...m, { who: "me", text: v }]);
    setDraft("");
    setTimeout(() => {
      setMessages((m) => [...m, { who: "them", text: "Принял, смотрю 🐟 (демо-ответ)" }]);
    }, 700);
  }

  function openSupport() {
    setTab("support");
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const displayName = me?.username || me?.email || me?.name || "user";
  const trafficLimit = sub && sub.traffic_limit === 0 ? "∞" : sub ? `${sub.traffic_limit} ГБ` : "—";

  return (
    <div className="cab-wrap" ref={topRef}>
      <div className="cab-topbar">
        <div className="wrap">
          <div className="logo">Tuna VPN</div>
          <div className="cab-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`cab-tab${tab === t.id ? " active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost" style={{ padding: "8px 16px" }} onClick={logout}>
            Выйти
          </button>
        </div>
      </div>

      <div className="cab-body">
        <div className="wrap">
          {tab === "overview" && (
            <div className="panel">
              {loading ? (
                <div className="panel-sub">Загрузка…</div>
              ) : !authed ? (
                <div className="card">
                  <p style={{ marginBottom: 16 }}>Нужно войти, чтобы увидеть подписку.</p>
                  <a className="btn btn-amber" href="/login">
                    Войти
                  </a>
                </div>
              ) : !sub ? (
                <div className="card">
                  <p style={{ marginBottom: 16 }}>Пока нет активной подписки.</p>
                  <a className="btn btn-amber" href="/connect">
                    Получить доступ
                  </a>
                </div>
              ) : (
                <>
                  <div className="cab-user">
                    <span>🐟</span> {displayName}{" "}
                    <span className="status-pill">
                      <span className="d" /> {STATUS_LABEL[sub.status] ?? sub.status}
                    </span>
                  </div>
                  <div className="cab-grid">
                    <div className="cab-cell">
                      <div className="lbl">Тариф</div>
                      <div className="val">{sub.plan_name}</div>
                    </div>
                    <div className="cab-cell">
                      <div className="lbl">📅 Истекает</div>
                      <div className="val">{fmtDate(sub.expire_at)}</div>
                    </div>
                    <div className="cab-cell">
                      <div className="lbl">↕ Трафик</div>
                      <div className="val amber">
                        {fmtBytes(sub.used_traffic_bytes ?? 0)} / {trafficLimit}
                      </div>
                    </div>
                    <div className="cab-cell">
                      <div className="lbl">📱 Устройства</div>
                      <div className="val">
                        {devices?.length ?? 0} / {maxDevices ?? sub.device_limit}
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="install-head">
                      <h4>Установка</h4>
                    </div>
                    <InstallBlock subUrl={sub.url} />
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "devices" && (
            <div className="panel">
              <div className="panel-title">Устройства</div>
              <div className="panel-sub">
                Один доступ работает на нескольких устройствах. Нажми «Отвязать», чтобы освободить
                слот.
              </div>
              <div className="dev-counter">
                Подключено:{" "}
                <b style={{ color: "#fff" }}>
                  {devices?.length ?? 0} / {maxDevices ?? sub?.device_limit ?? "—"}
                </b>
              </div>
              {devices === null ? (
                <div className="panel-sub">Загрузка…</div>
              ) : devices.length === 0 ? (
                <div className="card">
                  Пока нет подключённых устройств. Добавь профиль в Happ — устройство появится здесь
                  после первого подключения.
                </div>
              ) : (
                <div className="dev-list">
                  {devices.map((d) => (
                    <div className="dev" key={d.hwid}>
                      <div className="dev-info">
                        <span className="dev-ic">{platformEmoji(d.platform)}</span>
                        <div>
                          <div className="dev-name">{d.device_model || d.platform || "Устройство"}</div>
                          <div className="dev-meta">
                            {d.os_version ? d.os_version + " · " : ""}
                            {d.hwid.slice(0, 6)}…
                          </div>
                        </div>
                      </div>
                      <button className="dev-unbind" onClick={() => unbind(d.hwid)}>
                        Отвязать
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "sub" && (
            <div className="panel">
              <div className="panel-title">Подписка</div>
              {!offers || offers.plans.length === 0 ? (
                <div className="card">
                  Тарифы скоро появятся здесь. Пока пользуйся пробным периодом 🐟
                </div>
              ) : (
                <>
                  <div className="panel-sub">Доступные тарифы и сроки.</div>
                  {offers.plans.map((p) => {
                    const headPrice = p.durations[0] ? pickPrice(p.durations[0]) : null;
                    return (
                      <div className="plan-card" key={p.id}>
                        <div className="plan-head">
                          <span className="plan-name">🐟 {p.name}</span>
                          {headPrice && (
                            <span className="plan-price">
                              {headPrice.final_amount} {headPrice.currency_symbol}
                              <small>/{durationLabel(p.durations[0].days)}</small>
                            </span>
                          )}
                        </div>
                        <div className="plan-amber-line" />
                        {p.description ? (
                          <ul className="plan-feats">
                            {p.description
                              .split("\n")
                              .map((line) => line.trim())
                              .filter(Boolean)
                              .map((line, i) => (
                                <li key={i}>
                                  <span className="ok">✓</span> {line}
                                </li>
                              ))}
                          </ul>
                        ) : (
                          <ul className="plan-feats">
                            <li>
                              <span className="ok">✓</span> До {p.device_limit} устройств
                            </li>
                            <li>
                              <span className="ok">✓</span>{" "}
                              {p.traffic_limit === 0
                                ? "Безлимитный трафик"
                                : `${p.traffic_limit} ГБ трафика`}
                            </li>
                          </ul>
                        )}
                        <div className="term-row">
                          {p.durations.map((d) => {
                            const pr = pickPrice(d);
                            return (
                              <div key={d.days} className="term">
                                <div className="t">{durationLabel(d.days)}</div>
                                <div className="p">
                                  {pr ? `${pr.final_amount} ${pr.currency_symbol}` : "—"}
                                </div>
                                {pr && pr.discount_percent > 0 && (
                                  <div className="save">−{pr.discount_percent}%</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <p className="modal-note">Оплата скоро · бета</p>
                </>
              )}
            </div>
          )}

          {tab === "ref" && (
            <div className="panel">
              <div className="panel-title">Приглашай друзей</div>
              {!referral ? (
                <div className="card">
                  Реферальная программа доступна при активной подписке. Оформи доступ — и приглашай
                  друзей за бонусы 🐟
                </div>
              ) : (
                <>
                  <div className="panel-sub">
                    За каждого приглашённого — бонус по твоей ссылке. Твой код:{" "}
                    <b>{referral.referral_code}</b>.
                  </div>
                  <div className="ref-hero">
                    <div className="ref-link-box">
                      <div className="lbl">Ссылка для бота</div>
                      <div className="ref-link">
                        <input readOnly value={referral.bot_referral_url} />
                        <button
                          className="btn btn-ghost"
                          onClick={() => navigator.clipboard?.writeText(referral.bot_referral_url)}
                        >
                          копировать
                        </button>
                      </div>
                    </div>
                    {referral.site_referral_url && (
                      <div className="ref-link-box">
                        <div className="lbl">Ссылка для сайта</div>
                        <div className="ref-link">
                          <input readOnly value={referral.site_referral_url} />
                          <button
                            className="btn btn-ghost"
                            onClick={() =>
                              referral.site_referral_url &&
                              navigator.clipboard?.writeText(referral.site_referral_url)
                            }
                          >
                            копировать
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="ref-stats">
                    <div className="ref-stat">
                      <div className="num">{referral.invited_count}</div>
                      <div className="cap">Приглашено</div>
                    </div>
                    <div className="ref-stat">
                      <div className="num">{referral.invited_with_payment_count}</div>
                      <div className="cap">Из них платят</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "support" && (
            <div className="panel">
              <div className="panel-title">Поддержка</div>
              <div className="panel-sub">
                Не подключается? Чаще всего помогает — попробуй сам за минуту. Не вышло — напиши в
                чат.
              </div>

              <div className="help-grid">
                <div className="help-card">
                  <span className="help-ic">🔄</span>
                  <div>
                    <b>Обнови в Happ</b>
                    <p>Открой Happ и нажми «Обновить» (⟳) — подтянет свежие сервера.</p>
                  </div>
                </div>
                <div className="help-card">
                  <span className="help-ic">🌍</span>
                  <div>
                    <b>Смени локацию</b>
                    <p>Переключи локацию или протокол в Happ — иногда пробивает лучше.</p>
                  </div>
                </div>
                <div className="help-card">
                  <span className="help-ic">📱</span>
                  <div>
                    <b>Переподключись</b>
                    <p>Отвяжи устройство во вкладке «Устройства» и добавь профиль заново.</p>
                  </div>
                </div>
              </div>

              <div className="chat-box">
                <div className="chat-head">
                  <div className="chat-title">
                    <span className="chat-online" /> Чат поддержки{" "}
                    <span className="chat-eta">отвечаем ~10 мин</span>
                  </div>
                  <span className="chat-ctx">
                    {displayName} · {sub?.plan_name ?? "—"}
                  </span>
                </div>
                <div className="chat-log">
                  {messages.map((m, i) => (
                    <div key={i} className={`msg ${m.who}`}>
                      {m.who === "sys" ? (
                        <span>{m.text}</span>
                      ) : (
                        <div className="bubble">{m.text}</div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="chat-input">
                  <input
                    className="field"
                    placeholder="Опиши проблему…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                  />
                  <button className="btn btn-amber" onClick={sendMsg}>
                    Отправить
                  </button>
                </div>
                <p className="chat-note">
                  🛡 Чат работает прямо здесь, без Telegram.{" "}
                  <span style={{ opacity: 0.7 }}>[контейнер под Chatwoot — заглушка]</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {tab !== "support" && (
        <button className="chat-fab" onClick={openSupport}>
          💬 Поддержка
        </button>
      )}
    </div>
  );
}
