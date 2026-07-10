"use client";

import { useState } from "react";
import InstallBlock from "@/components/InstallBlock";
import EmailConsole from "@/components/cabinet/EmailConsole";
import TelegramConsole from "@/components/cabinet/TelegramConsole";
import type { Device, Me, SubscriptionInfo, TelegramAuthUser } from "@/lib/api";
import { STATUS_LABEL, daysLeftUntil, fmtDate, plural } from "@/lib/format";

export default function OverviewPanel({
  loading,
  authed,
  sub,
  devices,
  maxDevices,
  displayName,
  me,
  onLinkTelegram,
  onEmailVerified,
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
  onEmailVerified: (merged: boolean) => void;
  linkError: string | null;
}) {
  const active = sub?.status === "ACTIVE";
  const statusClass =
    sub?.status === "ACTIVE"
      ? ""
      : sub?.status === "LIMITED"
        ? "status-pill--warn"
        : "status-pill--bad";

  // Captured once on mount (pure render); this hint doesn't need to tick live.
  const [now] = useState(() => Date.now());
  const daysLeft = sub ? daysLeftUntil(sub.expire_at, now) : null;
  const expirySoon = daysLeft !== null && daysLeft <= 5;
  const deviceCount = devices?.length ?? 0;
  const deviceMax = maxDevices ?? sub?.device_limit ?? 0;

  // Both halves of the account-link surface. The email half appears only while this
  // account has no verified email — the state in which signing in with email would
  // silently create a second account instead of finding this one.
  const linkSurface = (
    <>
      <TelegramConsole me={me} onLink={onLinkTelegram} error={linkError} />
      {me && !me.is_email_verified && <EmailConsole me={me} onVerified={onEmailVerified} />}
    </>
  );

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
        {linkSurface}
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

        <div className="ov-hero">
          <div className="ov-time">
            <span className="readout-label">{active ? "Активна ещё" : "Доступ"}</span>
            {active && daysLeft !== null ? (
              <span className={`ov-time-v${expirySoon ? " is-urgent" : ""}`}>
                <b>{daysLeft}</b> {plural(daysLeft, "день", "дня", "дней")}
              </span>
            ) : (
              <span className="ov-time-v ov-time-off">{STATUS_LABEL[sub.status] ?? "Истекла"}</span>
            )}
            <span className="ov-time-sub">
              {active ? `до ${fmtDate(sub.expire_at)}` : "продли, чтобы вернуться в сеть"}
            </span>
          </div>

          <div className="ov-uncap" role="img" aria-label="Трафик без ограничений">
            <span className="ov-uncap-inf" aria-hidden="true">
              ∞
            </span>
            <span className="ov-uncap-txt">
              <span className="readout-label">Трафик</span>
              <span className="ov-uncap-v">Без лимита</span>
            </span>
          </div>
        </div>

        <div className="console-readouts">
          <div className="readout">
            <span className="readout-label">Тариф</span>
            <span className="readout-val">{sub.plan_name}</span>
          </div>
          <div className="readout">
            <span className="readout-label">Устройства</span>
            <span className="readout-val">
              {deviceCount} / {deviceMax || "—"}
            </span>
          </div>
        </div>
      </section>

      <section className="console install-console" id="install" aria-label="Установка">
        <div className="console-corner console-corner-tl" aria-hidden="true" />
        <div className="console-corner console-corner-tr" aria-hidden="true" />
        <h3 className="console-name">Установи Tuna в 3 шага</h3>
        <InstallBlock subUrl={sub.url} />
      </section>

      {linkSurface}
    </div>
  );
}
