"use client";

import Icon, { type IconName } from "@/components/Icon";
import type { SubscriptionInfo } from "@/lib/api";
import { usePublicConfig } from "@/lib/usePublicConfig";

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
  const cfg = usePublicConfig();
  // Embed the Chatwoot widget inline — the same /widget URL the floating SDK loads
  // in its iframe, just placed in the cabinet panel instead of a floating bubble.
  // NOTE: identity/plan context isn't passed to this raw iframe yet — wired together
  // with the HMAC identity follow-up.
  const widgetUrl =
    cfg?.chatwoot_base_url && cfg?.chatwoot_website_token
      ? `${cfg.chatwoot_base_url}/widget?website_token=${encodeURIComponent(cfg.chatwoot_website_token)}`
      : null;

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
        {widgetUrl ? (
          <iframe className="chat-frame" src={widgetUrl} title="Чат поддержки" />
        ) : (
          <p className="chat-fallback">Чат временно недоступен. Попробуй позже.</p>
        )}
      </div>
    </div>
  );
}
