"use client";

import { useState } from "react";
import Icon, { type IconName } from "@/components/Icon";
import type { SubscriptionInfo } from "@/lib/api";
import { ConsoleFrame } from "@/components/ui";

type ChatMsg = { who: "them" | "me" | "sys"; text: string };

const INITIAL_MESSAGES: ChatMsg[] = [
  {
    who: "them",
    text: "Привет! Опиши, что не работает — поможем. К сообщению уже приложены твой ID и тариф, так что сразу видим контекст.",
  },
  {
    who: "sys",
    text: "Апдейт · сегодня: обновили сервера, стало пробивать стабильнее. Если висит — нажми «Обновить» в Happ.",
  },
];

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
  const [messages, setMessages] = useState<ChatMsg[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");

  function sendMsg() {
    const v = draft.trim();
    if (!v) return;
    setMessages((m) => [...m, { who: "me", text: v }]);
    setDraft("");
    setTimeout(() => {
      setMessages((m) => [...m, { who: "them", text: "Принял, смотрю (демо-ответ)" }]);
    }, 700);
  }

  return (
    <div className="panel">
      <div className="panel-title">Поддержка</div>
      <div className="panel-sub">
        Не подключается? Чаще всего помогает — попробуй сам за минуту. Не вышло — напиши в чат.
      </div>

      <ConsoleFrame aria-label="Быстрая помощь">
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
      </ConsoleFrame>

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
      </div>
    </div>
  );
}
