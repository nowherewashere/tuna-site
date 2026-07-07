"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, type Device, type Me, type SubscriptionInfo } from "@/lib/api";

type Tab = "overview" | "devices" | "sub" | "ref" | "support";
type ChatMsg = { who: "them" | "me" | "sys"; text: string };

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Обзор" },
  { id: "devices", label: "Устройства" },
  { id: "sub", label: "Подписка" },
  { id: "ref", label: "Рефералка" },
  { id: "support", label: "Поддержка" },
];

const CLIENTS = ["Happ · рекоменд.", "FlClashX", "Prizrak-Box"];
const TERMS = [
  { t: "1 мес", p: "249 ₽", save: null },
  { t: "3 мес", p: "674 ₽", save: "−10%" },
  { t: "6 мес", p: "1199 ₽", save: "−20%" },
  { t: "12 мес", p: "2099 ₽", save: "−30%" },
];

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
  const [tab, setTab] = useState<Tab>("overview");
  const [client, setClient] = useState(0);
  const [term, setTerm] = useState(0);
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
                      <span className="platform">iPhone ▾</span>
                    </div>
                    <div className="client-row">
                      {CLIENTS.map((c, i) => (
                        <span
                          key={c}
                          className={`client${client === i ? " on" : ""}`}
                          onClick={() => setClient(i)}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                    <a
                      className="btn btn-amber btn-full"
                      href={sub.url ? `happ://add/${sub.url}` : undefined}
                    >
                      ⚡ Добавить подписку в Happ
                    </a>
                    <div className="copy-link">
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {sub.url}
                      </span>
                      <span
                        className="amber"
                        onClick={() => sub.url && navigator.clipboard?.writeText(sub.url)}
                      >
                        копировать
                      </span>
                    </div>
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
              <div className="panel-sub">Тариф Standard. Выбери срок — чем длиннее, тем выгоднее.</div>
              <div className="plan-card">
                <div className="plan-head">
                  <span className="plan-name">🐟 Standard</span>
                  <span className="plan-price">
                    249 ₽<small>/мес</small>
                  </span>
                </div>
                <div className="plan-amber-line" />
                <ul className="plan-feats">
                  <li>
                    <span className="ok">✓</span> Российские сервисы — как будто без VPN
                  </li>
                  <li>
                    <span className="ok">✓</span> До 3 устройств
                  </li>
                  <li>
                    <span className="ok">✓</span> Высокая скорость по всей России
                  </li>
                </ul>
                <div className="term-row">
                  {TERMS.map((tm, i) => (
                    <div
                      key={tm.t}
                      className={`term${term === i ? " on" : ""}`}
                      onClick={() => setTerm(i)}
                    >
                      <div className="t">{tm.t}</div>
                      <div className="p">{tm.p}</div>
                      {tm.save && <div className="save">{tm.save}</div>}
                    </div>
                  ))}
                </div>
                <button className="btn btn-amber btn-full">Оплатить</button>
                <p className="modal-note">Оплата скоро · бета</p>
              </div>
            </div>
          )}

          {tab === "ref" && (
            <div className="panel">
              <div className="panel-title">Приглашай друзей</div>
              <div className="panel-sub">
                За каждого приглашённого — бонусные дни и баллы. Другу — тоже бонус по твоей ссылке.
              </div>
              <div className="ref-hero">
                <div className="ref-link-box">
                  <div className="lbl">Ссылка для бота</div>
                  <div className="ref-link">
                    <input
                      readOnly
                      value={
                        me?.telegram_id
                          ? "https://t.me/tunavpn_bot?start=invite"
                          : "Привяжи Telegram, чтобы получить ссылку для бота"
                      }
                    />
                    <button className="btn btn-ghost">копировать</button>
                  </div>
                </div>
                <div className="ref-link-box">
                  <div className="lbl">Ссылка для сайта</div>
                  <div className="ref-link">
                    <input readOnly value="https://tuna-vpn.com/r/…" />
                    <button className="btn btn-ghost">копировать</button>
                  </div>
                </div>
              </div>
              <p className="ref-note">Статистика приглашений и начислений появится здесь. Бета.</p>
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
