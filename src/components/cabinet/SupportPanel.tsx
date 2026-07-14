"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const MAX_LEN = 4000;
const GROUP_WINDOW_MS = 5 * 60 * 1000; // messages within 5 min from the same author group
const NEAR_BOTTOM_PX = 48;

// Transport health, surfaced by the header dot so the user can see the chat is live.
type Conn = "connecting" | "live" | "polling";
const CONN_LABEL: Record<Conn, string> = {
  connecting: "подключаемся…",
  live: "на связи · отвечаем ~10 мин",
  polling: "обновляем…",
};

type Who = "them" | "me" | "sys";

function authorToWho(author: SupportMessage["author"]): Who {
  if (author === "operator") return "them";
  if (author === "system") return "sys";
  return "me";
}

const timeFmt = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

function msgTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : timeFmt.format(d);
}
function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  return dayFmt.format(d);
}

// Flatten the message list into render rows: day dividers between calendar days, plus a
// `grouped` flag when a message continues the same author within a short window (tighter
// spacing), so the log reads as a conversation rather than a flat wall of bubbles.
type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "msg"; key: number; m: SupportMessage; grouped: boolean };

function buildRows(messages: SupportMessage[]): Row[] {
  const rows: Row[] = [];
  let lastDay = "";
  let lastAuthor: SupportMessage["author"] | null = null;
  let lastTime = 0;
  for (const m of messages) {
    const d = new Date(m.created_at);
    const valid = !Number.isNaN(d.getTime());
    const dayKey = valid ? d.toDateString() : "";
    if (dayKey && dayKey !== lastDay) {
      rows.push({ kind: "day", key: `day-${dayKey}`, label: dayLabel(m.created_at) });
      lastDay = dayKey;
      lastAuthor = null;
      lastTime = 0;
    }
    const t = valid ? d.getTime() : 0;
    const grouped =
      m.author === lastAuthor && t > 0 && lastTime > 0 && t - lastTime < GROUP_WINDOW_MS;
    rows.push({ kind: "msg", key: m.id, m, grouped });
    lastAuthor = m.author;
    if (t > 0) lastTime = t;
  }
  return rows;
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
  const [conn, setConn] = useState<Conn>("connecting");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [unread, setUnread] = useState(0);
  const [atBottom, setAtBottom] = useState(true);

  const cursorRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // Set by the transport effect; lets `sendMsg` reset the polling cadence to fast when
  // it is the active transport (no-op while SSE is healthy and polling is stopped).
  const pokePollRef = useRef<() => void>(() => {});
  // Smart-autoscroll bookkeeping (kept in refs so the messages effect isn't a closure
  // over stale state): are we pinned to the bottom, how long was the list, and a
  // one-shot "force scroll" for the user's own send.
  const atBottomRef = useRef(true);
  const prevLenRef = useRef(0);
  const forceScrollRef = useRef(false);

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

  const scrollToBottom = useCallback(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    atBottomRef.current = true;
    setAtBottom(true);
    setUnread(0);
  }, []);

  const onLogScroll = useCallback(() => {
    const el = logRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    atBottomRef.current = bottom;
    setAtBottom(bottom);
    if (bottom) setUnread(0);
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
  // same dedupe-by-id merge, so overlap during a handover is harmless. `conn` mirrors the
  // transport so the header dot can show live / connecting / polling.
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
      setConn("polling"); // reaching the poll means SSE isn't the live transport
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
      es.onopen = () => {
        setConn("live"); // real-time push established
        stopPolling(); // stream healthy → stop the fallback poll
      };
      es.onmessage = (e) => handleFrame(e.data);
      es.onerror = () => {
        // Terminal (server error / support disabled) → EventSource won't retry, so fall
        // back to polling for good. Transient (network blip) → the browser auto-reconnects
        // with Last-Event-ID; poll as a safety net until onopen stops it again (which also
        // flips `conn` back to live). `poll` itself sets conn to "polling".
        if (es && es.readyState === EventSource.CLOSED) {
          es.close();
          es = null;
          setConn("polling"); // terminal — reflect the fallback immediately (callback, not effect body)
        }
        startPolling();
      };
    } else {
      startPolling(); // no EventSource support → polling only (poll sets conn)
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

  // Smart autoscroll: pin to the newest message only when the user is already at the
  // bottom (or just sent) — otherwise count arrivals for the "new messages" pill so
  // reading scrollback isn't yanked away.
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const added = messages.length - prevLenRef.current;
    prevLenRef.current = messages.length;
    if (forceScrollRef.current || atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      setUnread(0);
      forceScrollRef.current = false;
    } else if (added > 0) {
      setUnread((u) => u + added);
    }
  }, [messages]);

  // First paint of the chat: land at the bottom (DOM-only; atBottom/unread already
  // default to bottom/0, so no state change is needed here).
  useEffect(() => {
    if (loading) return;
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [loading]);

  // Auto-grow the composer up to a cap, so multi-line problems are readable while typing.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  async function sendMsg() {
    const value = draft.trim();
    if (!value || sending) return;
    setDraft("");
    setSending(true);
    setSendError(false);
    forceScrollRef.current = true; // always follow your own message down
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
  const rows = useMemo(() => buildRows(messages), [messages]);
  const closed = status === "closed";

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
              <span
                className={`chat-dot chat-dot--${conn}`}
                aria-hidden="true"
              />
              Чат поддержки <span className="chat-eta">{CONN_LABEL[conn]}</span>
            </div>
            <span className="chat-ctx">
              {displayName} · {sub?.plan_name ?? "—"}
            </span>
          </div>
          <div className="chat-scroll">
            <div
              className="chat-log"
              ref={logRef}
              onScroll={onLogScroll}
              role="log"
              aria-live="polite"
            >
              {showGreeting && (
                <div className="msg them">
                  <div className="msg-wrap">
                    <div className="bubble">{GREETING}</div>
                  </div>
                </div>
              )}
              {rows.map((row) =>
                row.kind === "day" ? (
                  <div className="chat-day" key={row.key}>
                    <span>{row.label}</span>
                  </div>
                ) : (
                  <MessageRow key={row.key} m={row.m} grouped={row.grouped} />
                ),
              )}
              {closed && (
                <div className="msg sys">
                  <span>Диалог закрыт. Напишите сообщение, чтобы продолжить.</span>
                </div>
              )}
            </div>
            {!atBottom && unread > 0 && (
              <button type="button" className="chat-jump" onClick={scrollToBottom}>
                ↓ Новые сообщения{unread > 1 ? ` · ${unread}` : ""}
              </button>
            )}
          </div>
          <div className="chat-input">
            <textarea
              ref={taRef}
              className="field chat-textarea"
              rows={1}
              maxLength={MAX_LEN}
              placeholder="Опиши проблему…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMsg();
                }
              }}
              disabled={sending}
              aria-label="Сообщение в поддержку"
            />
            <button className="btn btn-amber" onClick={sendMsg} disabled={sending || !draft.trim()}>
              {sending ? "Отправляем…" : "Отправить"}
            </button>
          </div>
          <div className="chat-foot">
            <span className="chat-note-inline">
              <Icon name="refresh" size={13} /> Чат закроется после долгой паузы — просто напишите
              снова, чтобы продолжить.
            </span>
            {draft.length > MAX_LEN - 500 && (
              <span className="chat-count">
                {draft.length}/{MAX_LEN}
              </span>
            )}
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

function MessageRow({ m, grouped }: { m: SupportMessage; grouped: boolean }) {
  const who = authorToWho(m.author);
  if (who === "sys") {
    return (
      <div className="msg sys">
        <span>{m.text}</span>
      </div>
    );
  }
  const time = msgTime(m.created_at);
  return (
    <div className={`msg ${who}${grouped ? " is-grouped" : ""}`}>
      <div className="msg-wrap">
        <div className="bubble">{m.text}</div>
        {time && (
          <time className="msg-time" dateTime={m.created_at}>
            {time}
          </time>
        )}
      </div>
    </div>
  );
}
