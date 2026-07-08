"use client";

import Icon, { type IconName } from "@/components/Icon";
import type { SubscriptionInfo } from "@/lib/api";

const HELP: { icon: IconName; title: string; text: string }[] = [
  { icon: "refresh", title: "Обнови в Happ", text: "Открой Happ и нажми «Обновить» — подтянет свежие сервера." },
  { icon: "globe", title: "Смени локацию", text: "Переключи локацию или протокол в Happ — иногда пробивает лучше." },
  { icon: "phone", title: "Переподключись", text: "Отвяжи устройство во вкладке «Устройства» и добавь профиль заново." },
];

export default function SupportPanel({
  displayName,
  sub,
}: {
  displayName: string;
  sub: SubscriptionInfo | null;
}) {
  function openChat() {
    // Enrich the conversation with plan context for the agent, then open Chatwoot.
    window.$chatwoot?.setCustomAttributes?.({ plan: sub?.plan_name ?? "—" });
    window.$chatwoot?.toggle?.("open");
  }

  return (
    <div className="panel">
      <div className="panel-title">Поддержка</div>
      <div className="panel-sub">
        Не подключается? Чаще всего помогает — попробуй сам за минуту. Не вышло — напиши в чат.
      </div>

      <section className="console" aria-label="Быстрая помощь">
        <div className="console-corner console-corner-tl" aria-hidden="true" />
        <div className="console-corner console-corner-tr" aria-hidden="true" />
        <ul className="help-rows">
          {HELP.map((h) => (
            <li className="help-row" key={h.title}>
              <span className="help-ic">
                <Icon name={h.icon} size={20} />
              </span>
              <div className="help-body">
                <b>{h.title}</b>
                <p>{h.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

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
        <div className="chat-cta">
          <p>Опиши проблему в чате — приложим твой ID и тариф, ответим прямо здесь.</p>
          <button className="btn btn-amber" onClick={openChat}>
            <Icon name="message" size={16} /> Открыть чат
          </button>
        </div>
        <p className="chat-note">
          <Icon name="shield" size={15} /> Чат работает прямо здесь, без Telegram.
        </p>
      </div>
    </div>
  );
}
