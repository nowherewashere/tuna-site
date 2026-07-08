import Icon from "@/components/Icon";
import type { Device, SubscriptionInfo } from "@/lib/api";
import { platformIcon } from "@/lib/format";

export default function DevicesPanel({
  devices,
  maxDevices,
  sub,
  onUnbind,
}: {
  devices: Device[] | null;
  maxDevices: number | null;
  sub: SubscriptionInfo | null;
  onUnbind: (hwid: string) => void;
}) {
  return (
    <div className="panel">
      <div className="panel-title">Устройства</div>
      <div className="panel-sub">
        Один доступ работает на нескольких устройствах. Нажми «Отвязать», чтобы освободить слот.
      </div>
      <div className="dev-counter">
        Подключено:{" "}
        <b style={{ color: "#fff" }}>
          {devices?.length ?? 0} / {maxDevices ?? sub?.device_limit ?? "—"}
        </b>
      </div>
      {devices === null ? (
        <div className="panel-sub">Загрузка…</div>
      ) : devices.length === 0 ? (
        <div className="card">
          Пока нет подключённых устройств. Добавь профиль в Happ — устройство появится здесь после
          первого подключения.
        </div>
      ) : (
        <div className="dev-list">
          {devices.map((d) => (
            <div className="dev" key={d.hwid}>
              <div className="dev-info">
                <span className="dev-ic">
                  <Icon name={platformIcon(d.platform)} size={22} />
                </span>
                <div>
                  <div className="dev-name">{d.device_model || d.platform || "Устройство"}</div>
                  <div className="dev-meta">
                    {d.os_version ? d.os_version + " · " : ""}
                    {d.hwid.slice(0, 6)}…
                  </div>
                </div>
              </div>
              <button className="dev-unbind" onClick={() => onUnbind(d.hwid)}>
                Отвязать
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
