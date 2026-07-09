"use client";

import { useState } from "react";
import InstallBlock from "@/components/InstallBlock";
import TelegramConsole from "@/components/cabinet/TelegramConsole";
import type { Device, Me, SubscriptionInfo, TelegramAuthUser } from "@/lib/api";
import { STATUS_LABEL, fmtBytes, fmtDate } from "@/lib/format";

export default function OverviewPanel({
  loading,
  authed,
  sub,
  devices,
  maxDevices,
  displayName,
  me,
  onLinkTelegram,
  linkError,
}: {
  loading: boolean;
  authed: boolean;
  sub: SubscriptionInfo | null;
  devices: Device[] | null;
  maxDevices: number | null;
  displayName: string;
  me: Me | null;
  onLinkTelegram: (user: TelegramAuthUser) => void;
  linkError: string | null;
}) {
  const isUnlimited = !!sub && sub.traffic_limit === 0;
  const usedBytes = sub?.used_traffic_bytes ?? 0;
  const limitBytes = sub && sub.traffic_limit > 0 ? sub.traffic_limit * 1024 ** 3 : 0;
  const trafficPct = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;
  const nearLimit = trafficPct >= 85;
  const statusClass =
    sub?.status === "ACTIVE"
      ? ""
      : sub?.status === "LIMITED"
        ? "status-pill--warn"
        : "status-pill--bad";

  // Captured once on mount (pure render); this hint doesn't need to tick live.
  const [now] = useState(() => Date.now());
  const daysLeft = sub
    ? Math.ceil((new Date(sub.expire_at).getTime() - now) / 86_400_000)
    : null;
  const expirySoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 5;
  const deviceCount = devices?.length ?? 0;
  const deviceMax = maxDevices ?? sub?.device_limit ?? 0;

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-sub">Загрузка…</div>
      </div>
    );
  }
  if (!authed) {
    return (
      <div className="panel">
        <div className="console console-empty">
          <p>Нужно войти, чтобы увидеть подписку.</p>
          <a className="btn btn-amber" href="/login">
            Войти
          </a>
        </div>
      </div>
    );
  }
  if (!sub) {
    return (
      <div className="panel">
        <div className="console console-empty">
          <p>Пока нет активной подписки.</p>
          <a className="btn btn-amber" href="/connect">
            Получить доступ
          </a>
        </div>
        <TelegramConsole me={me} onLink={onLinkTelegram} error={linkError} />
      </div>
    );
  }

  return (
    <div className="panel">
      <section className="console" aria-label="Состояние подписки">
        <div className="console-corner console-corner-tl" aria-hidden="true" />
        <div className="console-corner console-corner-tr" aria-hidden="true" />

        <header className="console-header">
          <span className="console-name">{displayName}</span>
          <span className={`status-pill ${statusClass}`}>
            <span className="d" /> {STATUS_LABEL[sub.status] ?? sub.status}
          </span>
        </header>

        <div className="meter-block">
          <div className="meter-head">
            <span className="readout-label">Трафик</span>
            <span className="meter-value">
              <span className="meter-used">{fmtBytes(usedBytes)}</span>
              <span className="meter-denom">
                {isUnlimited ? " · без лимита" : ` / ${sub.traffic_limit} ГБ`}
              </span>
            </span>
          </div>
          <div
            className={`tmeter${isUnlimited ? " tmeter-flow" : ""}${nearLimit ? " tmeter-warn" : ""}`}
            role="img"
            aria-label={
              isUnlimited
                ? `Использовано ${fmtBytes(usedBytes)}, без лимита`
                : `Использовано ${trafficPct}% трафика`
            }
          >
            <span className="tmeter-fill" style={{ width: isUnlimited ? "100%" : `${trafficPct}%` }} />
          </div>
        </div>

        <div className="console-readouts">
          <div className="readout">
            <span className="readout-label">Тариф</span>
            <span className="readout-val">{sub.plan_name}</span>
          </div>
          <div className="readout">
            <span className="readout-label">Истекает</span>
            <span className={`readout-val${expirySoon ? " is-urgent" : ""}`}>
              {fmtDate(sub.expire_at)}
              {expirySoon && <span className="readout-note"> · осталось {daysLeft} дн.</span>}
            </span>
          </div>
          <div className="readout">
            <span className="readout-label">Устройства</span>
            <span className="readout-val">
              {deviceCount} / {deviceMax || "—"}
            </span>
          </div>
        </div>
      </section>

      <section className="console install-console" aria-label="Установка">
        <div className="console-corner console-corner-tl" aria-hidden="true" />
        <div className="console-corner console-corner-tr" aria-hidden="true" />
        <div className="console-title">Установка</div>
        <InstallBlock subUrl={sub.url} />
      </section>

      <TelegramConsole me={me} onLink={onLinkTelegram} error={linkError} />
    </div>
  );
}
