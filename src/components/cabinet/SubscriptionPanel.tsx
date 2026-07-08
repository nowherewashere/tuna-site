import Icon from "@/components/Icon";
import type { SubscriptionOffers } from "@/lib/api";
import { durationLabel, ladderSavings, monthlyPrice, pickPrice } from "@/lib/format";

type Selected = { planCode: string; days: number } | null;

export default function SubscriptionPanel({
  offers,
  selected,
  setSelected,
  paying,
  payError,
  onPay,
  clearPayError,
}: {
  offers: SubscriptionOffers | null;
  selected: Selected;
  setSelected: (s: Selected) => void;
  paying: boolean;
  payError: string | null;
  onPay: (planCode: string, days: number, gateway: string) => void;
  clearPayError: () => void;
}) {
  return (
    <div className="panel">
      <div className="panel-title">Подписка</div>
      {!offers || offers.plans.length === 0 ? (
        <div className="card">Тарифы скоро появятся здесь. Пока пользуйся пробным периодом</div>
      ) : (
        <>
          <div className="panel-sub">Доступные тарифы и сроки.</div>
          {offers.plans.map((p) => {
            const baseDur = [...p.durations].sort((a, b) => a.days - b.days)[0] ?? null;
            const monthlies = p.durations
              .map(monthlyPrice)
              .filter((m): m is number => m !== null);
            const fromMonthly = monthlies.length ? Math.round(Math.min(...monthlies)) : null;
            const sym = baseDur ? (pickPrice(baseDur)?.currency_symbol ?? "") : "";
            return (
              <div className="plan-card" key={p.id}>
                <div className="plan-head">
                  <span className="plan-name">{p.name}</span>
                  {fromMonthly !== null && (
                    <span className="plan-price">
                      от {fromMonthly} {sym}
                      <small>/месяц</small>
                    </span>
                  )}
                </div>
                <div className="plan-amber-line" />
                {p.description ? (
                  <ul className="plan-feats">
                    {p.description
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .map((line, i) => (
                        <li key={i}>
                          <span className="ok">
                            <Icon name="check" size={15} />
                          </span>{" "}
                          {line}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <ul className="plan-feats">
                    <li>
                      <span className="ok">
                        <Icon name="check" size={15} />
                      </span>{" "}
                      До {p.device_limit} устройств
                    </li>
                    <li>
                      <span className="ok">
                        <Icon name="check" size={15} />
                      </span>{" "}
                      {p.traffic_limit === 0
                        ? "Безлимитный трафик"
                        : `${p.traffic_limit} ГБ трафика`}
                    </li>
                  </ul>
                )}
                <div className="term-ladder" role="group" aria-label="Срок подписки">
                  {p.durations.map((d) => {
                    const pr = pickPrice(d);
                    const isSel =
                      selected?.planCode === p.public_code && selected?.days === d.days;
                    const save = baseDur ? ladderSavings(d, baseDur) : 0;
                    return (
                      <button
                        type="button"
                        key={d.days}
                        className={`term${isSel ? " on" : ""}`}
                        aria-pressed={isSel}
                        onClick={() => {
                          setSelected({ planCode: p.public_code, days: d.days });
                          clearPayError();
                        }}
                      >
                        <span className="term-t">{durationLabel(d.days)}</span>
                        <span className="term-p">
                          {pr ? `${pr.final_amount} ${pr.currency_symbol}` : "—"}
                        </span>
                        {save > 0 && <span className="term-save">−{save}%</span>}
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const selDur =
                    selected?.planCode === p.public_code
                      ? p.durations.find((d) => d.days === selected.days)
                      : null;
                  if (!selDur || selDur.prices.length === 0) return null;
                  return (
                    <div style={{ marginTop: 14 }}>
                      {selDur.prices.map((pr) => (
                        <button
                          key={pr.gateway_type}
                          className="btn btn-amber btn-full"
                          style={{ marginTop: 8 }}
                          disabled={paying}
                          onClick={() => onPay(p.public_code, selDur.days, pr.gateway_type)}
                        >
                          {paying
                            ? "Переход к оплате…"
                            : `Оплатить · ${pr.final_amount} ${pr.currency_symbol}` +
                              (selDur.prices.length > 1 ? ` · ${pr.gateway_type}` : "")}
                        </button>
                      ))}
                      {payError && (
                        <p style={{ color: "var(--coral)", fontSize: 14, marginTop: 8 }}>
                          {payError}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
          <p className="modal-note">Выбери срок и нажми «Оплатить» — переведём на оплату.</p>
        </>
      )}
    </div>
  );
}
