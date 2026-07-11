import Icon from "@/components/Icon";
import type { Device, SubscriptionInfo } from "@/lib/api";
import { platformIcon } from "@/lib/format";
import { ConsoleFrame } from "@/components/ui";

export default function DevicesPanel({
  devices,
  maxDevices,
  sub,
  onUnbind,
  onAddDevice,
}: {
  devices: Device[] | null;
  maxDevices: number | null;
  sub: SubscriptionInfo | null;
  onUnbind: (hwid: string) => void;
  onAddDevice: () => void;
}) {
  const count = devices?.length ?? 0;
  const max = maxDevices ?? sub?.device_limit ?? 0;

  return (
    <div className="panel">
      <div className="panel-title">Устройства</div>
      <div className="panel-sub">
        Один доступ работает на нескольких устройствах. Нажми «Отвязать», чтобы освободить слот.
      </div>

      <button className="btn btn-amber dev-add" onClick={onAddDevice}>
        <Icon name="plus" size={17} /> Добавить устройство
      </button>

      <ConsoleFrame aria-label="Подключённые устройства">
        <div className="slot-head">
          <span className="readout-label">Слоты устройств</span>
          <div className="slot-track" aria-hidden="true">
            {Array.from({ length: max || 0 }).map((_, i) => (
              <span key={i} className={`slot${i < count ? " on" : ""}`} />
            ))}
          </div>
          <span className="readout-val">
            {count} / {max || "—"}
          </span>
        </div>

        {devices === null ? (
          <div className="console-note">Загрузка…</div>
        ) : devices.length === 0 ? (
          <div className="console-note">
            Пока нет подключённых устройств. Добавь профиль в Happ — устройство появится здесь после
            первого подключения.
          </div>
        ) : (
          <ul className="dev-rows">
            {devices.map((d) => (
              <li className="dev-row" key={d.hwid}>
                <span className="dev-ic">
                  <Icon name={platformIcon(d.platform)} size={22} />
                </span>
                <div className="dev-body">
                  <div className="dev-name">{d.device_model || d.platform || "Устройство"}</div>
                  <div className="dev-meta">
                    {d.os_version ? d.os_version + " · " : ""}
                    {d.hwid.slice(0, 6)}…
                  </div>
                </div>
                <button className="btn-unbind" onClick={() => onUnbind(d.hwid)}>
                  Отвязать
                </button>
              </li>
            ))}
          </ul>
        )}
      </ConsoleFrame>
    </div>
  );
}
