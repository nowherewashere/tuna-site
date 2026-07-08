import InstallBlock from "@/components/InstallBlock";
import Icon from "@/components/Icon";
import type { Device, SubscriptionInfo } from "@/lib/api";
import { STATUS_LABEL, fmtBytes, fmtDate } from "@/lib/format";

export default function OverviewPanel({
  loading,
  authed,
  sub,
  devices,
  maxDevices,
  displayName,
}: {
  loading: boolean;
  authed: boolean;
  sub: SubscriptionInfo | null;
  devices: Device[] | null;
  maxDevices: number | null;
  displayName: string;
}) {
  const trafficLimit =
    sub && sub.traffic_limit === 0 ? "∞" : sub ? `${sub.traffic_limit} ГБ` : "—";
  const usedBytes = sub?.used_traffic_bytes ?? 0;
  const limitBytes = sub && sub.traffic_limit > 0 ? sub.traffic_limit * 1024 ** 3 : 0;
  const trafficPct = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;
  const statusClass =
    sub?.status === "ACTIVE"
      ? ""
      : sub?.status === "LIMITED"
        ? "status-pill--warn"
        : "status-pill--bad";

  return (
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
            {displayName}{" "}
            <span className={`status-pill ${statusClass}`}>
              <span className="d" /> {STATUS_LABEL[sub.status] ?? sub.status}
            </span>
          </div>
          <div className="cab-grid">
            <div className="cab-cell">
              <div className="lbl">Тариф</div>
              <div className="val">{sub.plan_name}</div>
            </div>
            <div className="cab-cell">
              <div className="lbl">
                <Icon name="calendar" size={14} /> Истекает
              </div>
              <div className="val">{fmtDate(sub.expire_at)}</div>
            </div>
            <div className="cab-cell">
              <div className="lbl">
                <Icon name="gauge" size={14} /> Трафик
              </div>
              <div className="val amber">
                {fmtBytes(sub.used_traffic_bytes ?? 0)} / {trafficLimit}
              </div>
              {limitBytes > 0 && (
                <div className="meter">
                  <span style={{ width: `${trafficPct}%` }} />
                </div>
              )}
            </div>
            <div className="cab-cell">
              <div className="lbl">
                <Icon name="phone" size={14} /> Устройства
              </div>
              <div className="val">
                {devices?.length ?? 0} / {maxDevices ?? sub.device_limit}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="install-head">
              <h4>Установка</h4>
            </div>
            <InstallBlock subUrl={sub.url} />
          </div>
        </>
      )}
    </div>
  );
}
