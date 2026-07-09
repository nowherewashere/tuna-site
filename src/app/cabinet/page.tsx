"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  type Device,
  type DurationOffer,
  type Me,
  type ReferralProgram,
  type SubscriptionInfo,
  type SubscriptionOffers,
  type TelegramAuthUser,
} from "@/lib/api";
import InstallBlock from "@/components/InstallBlock";
import TelegramLoginButton from "@/components/TelegramLoginButton";
import Icon, { type IconName } from "@/components/Icon";
import { useHashTab } from "@/lib/useHashTab";
import { redirectTo, reloadPage } from "@/lib/nav";
import { invalidateAuth } from "@/lib/useAuth";
import { TELEGRAM_BOT } from "@/lib/config";

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

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function durationLabel(days: number): string {
  if (days === 0) return "Навсегда";
  if (days % 365 === 0) {
    const y = days / 365;
    return `${y} ${plural(y, "год", "года", "лет")}`;
  }
  if (days % 30 === 0) {
    const mo = days / 30;
    return `${mo} ${plural(mo, "месяц", "месяца", "месяцев")}`;
  }
  return `${days} ${plural(days, "день", "дня", "дней")}`;
}

// Pick a display price for a duration: prefer a RUB gateway, else the first.
function pickPrice(d: DurationOffer) {
  return d.prices.find((p) => p.currency === "RUB") ?? d.prices[0] ?? null;
}

// Per-month effective price for a duration (for the ladder savings badge).
function monthlyPrice(d: DurationOffer): number | null {
  const pr = pickPrice(d);
  if (!pr || d.days <= 0) return null;
  const amount = parseFloat(pr.final_amount);
  return Number.isFinite(amount) ? amount / (d.days / 30) : null;
}

// Savings vs the plan's shortest duration (the "−30% на 12 месяцев" ladder).
function ladderSavings(d: DurationOffer, base: DurationOffer): number {
  const m = monthlyPrice(d);
  const b = monthlyPrice(base);
  if (m === null || b === null || b <= 0) return 0;
  return Math.round((1 - m / b) * 100);
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

function platformIcon(p?: string | null): IconName {
  const s = (p ?? "").toLowerCase();
  if (s.includes("mac")) return "laptop";
  if (s.includes("windows")) return "monitor";
  if (s.includes("tv")) return "tv";
  return "phone";
}

export default function CabinetPage() {
  const router = useRouter();
  const [tab, setTab] = useHashTab(TAB_IDS, "overview");
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      who: "them",
      text: "Привет! Опиши, что не работает — поможем. К сообщению уже приложены твой ID и тариф, так что сразу видим контекст.",
    },
    {
      who: "sys",
      text: "Апдейт · сегодня: обновили сервера, стало пробивать стабильнее. Если висит — нажми «Обновить» в Happ.",
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
  const [selected, setSelected] = useState<{ planCode: string; days: number } | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

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

  // Lazy per-tab loading: a tab's data is fetched only when it is first opened,
  // then cached in state for the session. Keeps the heavy offers pricing/discount
  // computation and the referral endpoint off unrelated tabs and off every reload.
  const fetchedTabs = useRef<Set<Tab>>(new Set());
  useEffect(() => {
    if (tab === "sub" && !fetchedTabs.current.has("sub")) {
      fetchedTabs.current.add("sub");
      api.subscriptionOffers().then(setOffers).catch(() => {});
    }
    if (tab === "ref" && !fetchedTabs.current.has("ref")) {
      fetchedTabs.current.add("ref");
      api.referralProgram().then(setReferral).catch(() => {});
    }
  }, [tab]);

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

  async function pay(planCode: string, days: number, gateway: string) {
    setPaying(true);
    setPayError(null);
    try {
      const res = await api.purchase(planCode, days, gateway);
      if (res.payment_url) {
        redirectTo(res.payment_url); // hand off to the gateway
        return;
      }
      reloadPage(); // free / instant activation, no redirect
    } catch (e) {
      setPayError(
        e instanceof ApiError
          ? e.detail || "Не удалось создать платёж. Попробуй позже."
          : "Сеть недоступна. Попробуй ещё раз.",
      );
      setPaying(false);
    }
  }

  async function logout() {
    await api.logout().catch(() => {});
    invalidateAuth();
    router.push("/");
  }

  function sendMsg() {
    const v = draft.trim();
    if (!v) return;
    setMessages((m) => [...m, { who: "me", text: v }]);
    setDraft("");
    setTimeout(() => {
      setMessages((m) => [...m, { who: "them", text: "Принял, смотрю (демо-ответ)" }]);
    }, 700);
  }

  function openSupport() {
    setTab("support");
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function linkTelegram(user: TelegramAuthUser) {
    setLinkError(null);
    try {
      const updated = await api.telegramLink(user);
      setMe(updated);
    } catch (e) {
      setLinkError(
        e instanceof ApiError && e.status === 409
          ? "Этот Telegram уже привязан к другому аккаунту."
          : "Не удалось подключить Telegram. Попробуй ещё раз.",
      );
    }
  }

  const displayName = me?.username || me?.email || me?.name || "user";
  const trafficLimit = sub && sub.traffic_limit === 0 ? "∞" : sub ? `${sub.traffic_limit} ГБ` : "—";

  return (
    <div className="cab-wrap" ref={topRef}>
      <div className="cab-topbar">
        <div className="wrap">
          <Link href="/" className="logo">
            Tuna VPN
          </Link>
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
                    {displayName}{" "}
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
                      <div className="lbl">
                        <Icon name="calendar" size={14} /> Истекает
                      </div>
                      <div className="val">{fmtDate(sub.expire_at)}</div>
                    </div>
                    <div className="cab-cell">
                      <div className="lbl">
                        <Icon name="gauge" size={14} /> Трафик
                      </div>
                      <div className="val amber">
                        {fmtBytes(sub.used_traffic_bytes ?? 0)} / {trafficLimit}
                      </div>
                    </div>
                    <div className="cab-cell">
                      <div className="lbl">
                        <Icon name="phone" size={14} /> Устройства
                      </div>
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
              {!loading && authed && (
                <div className="card cab-connect">
                  <div className="cab-connect-head">
                    <Icon name="link" size={18} />
                    <h4>Аккаунт</h4>
                  </div>
                  {me?.telegram_id ? (
                    <p className="cab-connect-on">
                      <Icon name="check" size={16} /> Telegram подключён
                      {me.username ? (
                        <>
                          {" · "}
                          <b>@{me.username}</b>
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <>
                      <p className="cab-connect-sub">
                        Подключи Telegram, чтобы входить в один аккаунт и с сайта, и из бота.
                      </p>
                      {TELEGRAM_BOT && (
                        <TelegramLoginButton botUsername={TELEGRAM_BOT} onAuth={linkTelegram} />
                      )}
                    </>
                  )}
                  {linkError && <p className="cab-connect-err">{linkError}</p>}
                </div>
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
                        <span className="dev-ic">
                          <Icon name={platformIcon(d.platform)} size={22} />
                        </span>
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
                  Тарифы скоро появятся здесь. Пока пользуйся пробным периодом
                </div>
              ) : (
                <>
                  <div className="panel-sub">Доступные тарифы и сроки.</div>
                  {offers.plans.map((p) => {
                    const baseDur = [...p.durations].sort((a, b) => a.days - b.days)[0] ?? null;
                    const monthlies = p.durations
                      .map(monthlyPrice)
                      .filter((m): m is number => m !== null);
                    const fromMonthly = monthlies.length ? Math.round(Math.min(...monthlies)) : null;
                    const sym = baseDur ? (pickPrice(baseDur)?.currency_symbol ?? "") : "";
                    return (
                      <div className="plan-card" key={p.id}>
                        <div className="plan-head">
                          <span className="plan-name">{p.name}</span>
                          {fromMonthly !== null && (
                            <span className="plan-price">
                              от {fromMonthly} {sym}
                              <small>/месяц</small>
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
                                  <span className="ok">
                                  <Icon name="check" size={15} />
                                </span> {line}
                                </li>
                              ))}
                          </ul>
                        ) : (
                          <ul className="plan-feats">
                            <li>
                              <span className="ok">
                                  <Icon name="check" size={15} />
                                </span> До {p.device_limit} устройств
                            </li>
                            <li>
                              <span className="ok">
                                  <Icon name="check" size={15} />
                                </span>{" "}
                              {p.traffic_limit === 0
                                ? "Безлимитный трафик"
                                : `${p.traffic_limit} ГБ трафика`}
                            </li>
                          </ul>
                        )}
                        <div className="term-row">
                          {p.durations.map((d) => {
                            const pr = pickPrice(d);
                            const isSel =
                              selected?.planCode === p.public_code && selected?.days === d.days;
                            return (
                              <div
                                key={d.days}
                                className={`term${isSel ? " on" : ""}`}
                                onClick={() => {
                                  setSelected({ planCode: p.public_code, days: d.days });
                                  setPayError(null);
                                }}
                              >
                                <div className="t">{durationLabel(d.days)}</div>
                                <div className="p">
                                  {pr ? `${pr.final_amount} ${pr.currency_symbol}` : "—"}
                                </div>
                                {baseDur && ladderSavings(d, baseDur) > 0 && (
                                  <div className="save">−{ladderSavings(d, baseDur)}%</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {(() => {
                          const selDur =
                            selected?.planCode === p.public_code
                              ? p.durations.find((d) => d.days === selected.days)
                              : null;
                          if (!selDur || selDur.prices.length === 0) return null;
                          return (
                            <div style={{ marginTop: 14 }}>
                              {selDur.prices.map((pr) => (
                                <button
                                  key={pr.gateway_type}
                                  className="btn btn-amber btn-full"
                                  style={{ marginTop: 8 }}
                                  disabled={paying}
                                  onClick={() => pay(p.public_code, selDur.days, pr.gateway_type)}
                                >
                                  {paying
                                    ? "Переход к оплате…"
                                    : `Оплатить · ${pr.final_amount} ${pr.currency_symbol}` +
                                      (selDur.prices.length > 1 ? ` · ${pr.gateway_type}` : "")}
                                </button>
                              ))}
                              {payError && (
                                <p style={{ color: "var(--coral)", fontSize: 14, marginTop: 8 }}>
                                  {payError}
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                  <p className="modal-note">Выбери срок и нажми «Оплатить» — переведём на оплату.</p>
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
                  друзей за бонусы
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
                  <span className="help-ic"><Icon name="refresh" size={20} /></span>
                  <div>
                    <b>Обнови в Happ</b>
                    <p>Открой Happ и нажми «Обновить» — подтянет свежие сервера.</p>
                  </div>
                </div>
                <div className="help-card">
                  <span className="help-ic"><Icon name="globe" size={20} /></span>
                  <div>
                    <b>Смени локацию</b>
                    <p>Переключи локацию или протокол в Happ — иногда пробивает лучше.</p>
                  </div>
                </div>
                <div className="help-card">
                  <span className="help-ic"><Icon name="phone" size={20} /></span>
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
                  <Icon name="shield" size={15} /> Чат работает прямо здесь, без Telegram.{" "}
                  <span style={{ opacity: 0.7 }}>[контейнер под Chatwoot — заглушка]</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {tab !== "support" && (
        <button className="chat-fab" onClick={openSupport}>
          <Icon name="message" size={18} /> Поддержка
        </button>
      )}
    </div>
  );
}
