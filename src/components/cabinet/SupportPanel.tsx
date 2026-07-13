"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon, { type IconName } from "@/components/Icon";
import { api, type SubscriptionInfo, type SupportMessage } from "@/lib/api";
import { ConsoleFrame } from "@/components/ui";

const GREETING =
  "Привет! Опиши, что не работает — поможем. К сообщению уже приложены твой ID и тариф, так что сразу видим контекст.";

const HELP: { icon: IconName; title: string; text: string }[] = [
  { icon: "refresh", title: "Обнови в Happ", text: "Открой Happ и нажми «Обновить» — подтянет свежие сервера." },
  { icon: "globe", title: "Смени локацию", text: "Переключи локацию или протокол в Happ — иногда пробивает лучше." },
];

const POLL_INTERVAL_MS = 4000;

type Who = "them" | "me" | "sys";

function authorToWho(author: SupportMessage["author"]): Who {
  if (author === "operator") return "them";
  if (author === "system") return "sys";
  return "me";
}

export default function SupportPanel({
  displayName,
  sub,
}: {
  displayName: string;
  sub: SubscriptionInfo | null;
}) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  const cursorRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  const appendServer = useCallback((incoming: SupportMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const merged = [...prev];
      for (const m of incoming) if (!known.has(m.id)) merged.push(m);
      return merged;
    });
    cursorRef.current = incoming.reduce((max, m) => Math.max(max, m.id), cursorRef.current);
  }, []);

  // Initial load: history (which also tells us if live chat is on) + the Telegram
  // fallback link when it isn't.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const history = await api.supportHistory(0);
        if (cancelled) return;
        setEnabled(history.enabled);
        setStatus(history.status);
        if (history.enabled) {
          setMessages(history.messages);
          cursorRef.current = history.messages.reduce((max, m) => Math.max(max, m.id), 0);
        } else {
          const cfg = await api.publicConfig();
          if (!cancelled) setTelegramUrl(cfg.support?.telegram_url ?? null);
        }
      } catch {
        // Leave the widget in its fallback state; the self-help block still helps.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll for operator replies while the chat is open and the tab is visible.
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (!document.hidden) {
        try {
          const history = await api.supportHistory(cursorRef.current);
          if (!stopped) {
            setStatus(history.status);
            appendServer(history.messages);
          }
        } catch {
          // transient — keep polling
        }
      }
      if (!stopped) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [enabled, appendServer]);

  // Keep the log pinned to the latest message.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function sendMsg() {
    const value = draft.trim();
    if (!value || sending) return;
    setDraft("");
    setSending(true);
    setSendError(false);
    try {
      const message = await api.sendSupportMessage(value);
      appendServer([message]);
      setStatus("open");
    } catch {
      setSendError(true);
      setDraft(value); // restore so the user can retry
    } finally {
      setSending(false);
    }
  }

  const showGreeting = enabled && !loading && messages.length === 0;

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

      {loading ? (
        <div className="chat-box">
          <div className="chat-log" aria-busy="true">
            <div className="msg sys">
              <span>Загружаем чат…</span>
            </div>
          </div>
        </div>
      ) : enabled ? (
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
          <div className="chat-log" ref={logRef} role="log" aria-live="polite">
            {showGreeting && (
              <div className="msg them">
                <div className="bubble">{GREETING}</div>
              </div>
            )}
            {messages.map((m) => {
              const who = authorToWho(m.author);
              return (
                <div key={m.id} className={`msg ${who}`}>
                  {who === "sys" ? <span>{m.text}</span> : <div className="bubble">{m.text}</div>}
                </div>
              );
            })}
            {status === "closed" && (
              <div className="msg sys">
                <span>Диалог закрыт оператором. Напишите сообщение, чтобы продолжить.</span>
              </div>
            )}
          </div>
          <div className="chat-input">
            <input
              className="field"
              placeholder="Опиши проблему…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMsg()}
              disabled={sending}
              aria-label="Сообщение в поддержку"
            />
            <button className="btn btn-amber" onClick={sendMsg} disabled={sending || !draft.trim()}>
              {sending ? "Отправляем…" : "Отправить"}
            </button>
          </div>
          {sendError && (
            <p className="chat-error" role="alert">
              Не удалось отправить. Проверьте связь и попробуйте ещё раз.
            </p>
          )}
        </div>
      ) : (
        <div className="chat-box">
          <div className="chat-log">
            <div className="msg them">
              <div className="bubble">
                Напишите нам в Telegram — оператор на связи и поможет с подключением.
              </div>
            </div>
          </div>
          {telegramUrl && (
            <div className="chat-input">
              <a className="btn btn-amber" href={telegramUrl} target="_blank" rel="noopener noreferrer">
                Написать в Telegram
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
