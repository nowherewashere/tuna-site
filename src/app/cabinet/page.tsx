"use client";

import Link from "next/link";
import { useRef, useState } from "react";

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

export default function CabinetPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [client, setClient] = useState(0);
  const [term, setTerm] = useState(0);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      who: "them",
      text:
        "Привет! 🐟 Опиши, что не работает — поможем. К сообщению уже приложены твой ID и тариф, так что сразу видим контекст.",
    },
    {
      who: "sys",
      text:
        "📢 Апдейт · сегодня: обновили сервера, стало пробивать стабильнее. Если висит — нажми ⟳ в Happ.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

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
          <Link className="btn btn-ghost" style={{ padding: "8px 16px" }} href="/">
            Выйти
          </Link>
        </div>
      </div>

      <div className="cab-body">
        <div className="wrap">
          {tab === "overview" && (
            <div className="panel">
              <div className="cab-user">
                <span>🐟</span> user_8f3a{" "}
                <span className="status-pill">
                  <span className="d" /> Активна
                </span>
              </div>
              <div className="cab-grid">
                <div className="cab-cell">
                  <div className="lbl">Тариф</div>
                  <div className="val">Standard</div>
                </div>
                <div className="cab-cell">
                  <div className="lbl">📅 Истекает</div>
                  <div className="val">12 авг 2026</div>
                </div>
                <div className="cab-cell">
                  <div className="lbl">↕ Трафик</div>
                  <div className="val amber">14.2 ГБ / ∞</div>
                </div>
                <div className="cab-cell">
                  <div className="lbl">📱 Устройства</div>
                  <div className="val">2 / 3</div>
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
                <button className="btn btn-amber btn-full">⚡ Добавить подписку в Happ</button>
                <div className="copy-link">
                  <span>happ://add/tuna-8f3a…</span>
                  <span className="amber">копировать</span>
                </div>
              </div>
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
                Подключено: <b style={{ color: "#fff" }}>2 / 3</b>
              </div>
              <div className="dev-list">
                <div className="dev">
                  <div className="dev-info">
                    <span className="dev-ic">📱</span>
                    <div>
                      <div className="dev-name">iPhone</div>
                      <div className="dev-meta">активно сейчас · a1b2…</div>
                    </div>
                  </div>
                  <button className="dev-unbind">Отвязать</button>
                </div>
                <div className="dev">
                  <div className="dev-info">
                    <span className="dev-ic">💻</span>
                    <div>
                      <div className="dev-name">MacBook</div>
                      <div className="dev-meta">2 часа назад · c3d4…</div>
                    </div>
                  </div>
                  <button className="dev-unbind">Отвязать</button>
                </div>
              </div>
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
              <div className="panel-title">Приглашай и зарабатывай</div>
              <div className="panel-sub">
                50% с каждого платежа приглашённых — навсегда. Другу — 3 дня бесплатно по твоей
                ссылке.
              </div>
              <div className="ref-hero">
                <div className="ref-link-box">
                  <div className="lbl">Ссылка для бота</div>
                  <div className="ref-link">
                    <input readOnly value="https://t.me/tunavpn_bot?start=invite_8f3a" />
                    <button className="btn btn-ghost">копировать</button>
                  </div>
                </div>
                <div className="ref-link-box">
                  <div className="lbl">Ссылка для сайта</div>
                  <div className="ref-link">
                    <input readOnly value="https://tuna.vpn/r/8f3a" />
                    <button className="btn btn-ghost">копировать</button>
                  </div>
                </div>
              </div>
              <div className="ref-stats">
                <div className="ref-stat">
                  <div className="num">7</div>
                  <div className="cap">Приглашено</div>
                </div>
                <div className="ref-stat">
                  <div className="num">4</div>
                  <div className="cap">Из них платят</div>
                </div>
                <div className="ref-stat">
                  <div className="num amber">1 340 ₽</div>
                  <div className="cap">Доступно к выводу</div>
                </div>
              </div>
              <div className="ref-actions">
                <button className="btn btn-amber">💰 Вывести (от 1000 ₽)</button>
                <button className="btn btn-ghost">🐟 Оплатить подписку балансом</button>
              </div>
              <p className="ref-note">Выведено всего: 500 ₽ · Доход за всё время: 1 840 ₽</p>
            </div>
          )}

          {tab === "support" && (
            <div className="panel">
              <div className="panel-title">Поддержка</div>
              <div className="panel-sub">
                Не подключается? Чаще всего помогает — попробуй сам за минуту. Не вышло — напиши в чат.
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
                  <span className="chat-ctx">id: 8f3a · Standard · iPhone</span>
                </div>
                <div className="chat-log">
                  {messages.map((m, i) => (
                    <div key={i} className={`msg ${m.who}`}>
                      {m.who === "sys" ? <span>{m.text}</span> : <div className="bubble">{m.text}</div>}
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
