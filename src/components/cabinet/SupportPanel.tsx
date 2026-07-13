"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon, { type IconName } from "@/components/Icon";
import {
  api,
  type SubscriptionInfo,
  type SupportMessage,
  type SupportStreamEvent,
} from "@/lib/api";
import { ConsoleFrame } from "@/components/ui";

const GREETING =
  "Привет! Опиши, что не работает — поможем. К сообщению уже приложены твой ID и тариф, так что сразу видим контекст.";

const HELP: { icon: IconName; title: string; text: string }[] = [
  { icon: "refresh", title: "Обнови в Happ", text: "Открой Happ и нажми «Обновить» — подтянет свежие сервера." },
  { icon: "globe", title: "Смени локацию", text: "Переключи локацию или протокол в Happ — иногда пробивает лучше." },
];

// Polling is the fallback for when the SSE stream is down/unsupported. It idles from
// fast (a reply likely incoming) up to a slow ceiling (quiet chat), resetting to fast
// on any send or received message so a live exchange stays responsive.
const POLL_MIN_MS = 4000;
const POLL_MAX_MS = 15000;
const POLL_BACKOFF = 1.5;

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
  // Set by the transport effect; lets `sendMsg` reset the polling cadence to fast when
  // it is the active transport (no-op while SSE is healthy and polling is stopped).
  const pokePollRef = useRef<() => void>(() => {});

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

  // Live updates: prefer the SSE push stream; fall back to the history poll (with idle
  // backoff) whenever SSE is unsupported, errored, or terminally closed. Both feed the
  // same dedupe-by-id merge, so overlap during a handover is harmless.
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let pollDelay = POLL_MIN_MS;

    // --- polling fallback (idle backoff, visibility-paused) ---------------------
    const schedulePoll = (delay: number) => {
      clearTimeout(pollTimer);
      pollTimer = setTimeout(poll, delay);
    };
    const poll = async () => {
      if (stopped) return;
      // Keep the tab-hidden pause: don't fetch while hidden, just re-check soon.
      if (document.hidden) {
        schedulePoll(POLL_MIN_MS);
        return;
      }
      let gotNew = false;
      try {
        const history = await api.supportHistory(cursorRef.current);
        if (!stopped) {
          setStatus(history.status);
          gotNew = history.messages.length > 0;
          appendServer(history.messages);
        }
      } catch {
        // transient — keep polling
      }
      if (stopped) return;
      // Reset to fast on activity, otherwise ramp toward the idle ceiling.
      pollDelay = gotNew ? POLL_MIN_MS : Math.min(POLL_MAX_MS, Math.round(pollDelay * POLL_BACKOFF));
      schedulePoll(pollDelay);
    };
    const startPolling = () => {
      if (pollTimer !== undefined) return; // already polling
      pollDelay = POLL_MIN_MS;
      schedulePoll(POLL_MIN_MS);
    };
    const stopPolling = () => {
      clearTimeout(pollTimer);
      pollTimer = undefined;
    };
    // Let `sendMsg` snap polling back to fast (only meaningful while polling is active).
    pokePollRef.current = () => {
      if (pollTimer !== undefined) {
        pollDelay = POLL_MIN_MS;
        schedulePoll(POLL_MIN_MS);
      }
    };

    // --- SSE primary ------------------------------------------------------------
    const handleFrame = (data: string) => {
      try {
        const ev = JSON.parse(data) as SupportStreamEvent;
        if (ev.type === "message") appendServer([ev.message]);
        else if (ev.type === "status") setStatus(ev.status);
      } catch {
        /* ignore a malformed frame */
      }
    };

    if (typeof EventSource !== "undefined") {
      es = new EventSource(api.supportStreamUrl(cursorRef.current), { withCredentials: true });
      es.onopen = () => stopPolling(); // stream healthy → stop the fallback poll
      es.onmessage = (e) => handleFrame(e.data);
      es.onerror = () => {
        // Terminal (server error / support disabled) → EventSource won't retry, so fall
        // back to polling for good. Transient (network blip) → the browser auto-reconnects
        // with Last-Event-ID; poll as a safety net until onopen stops it again.
        if (es && es.readyState === EventSource.CLOSED) {
          es.close();
          es = null;
        }
        startPolling();
      };
    } else {
      startPolling(); // no EventSource support → polling only
    }

    // Re-poll immediately when a hidden tab returns (skips the paused wait).
    const onVisible = () => {
      if (!document.hidden && pollTimer !== undefined) schedulePoll(0);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      stopPolling();
      pokePollRef.current = () => {};
      document.removeEventListener("visibilitychange", onVisible);
      if (es) es.close();
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
      pokePollRef.current(); // a reply is likely incoming — poll fast if SSE is down
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
