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
  if (!offers || offers.plans.length === 0) {
    return (
      <div className="panel">
        <div className="panel-title">Подписка</div>
        <section className="console console-empty">
          <div className="console-corner console-corner-tl" aria-hidden="true" />
          <div className="console-corner console-corner-tr" aria-hidden="true" />
          <p>Тарифы скоро появятся здесь. Пока пользуйся пробным периодом.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-title">Подписка</div>
      <div className="panel-sub">
        Выбери тариф и срок — чем дольше период, тем ниже цена за месяц.
      </div>

      <div className="plan-consoles">
      {offers.plans.map((p) => {
        // Durations shortest → longest; savings are measured against the shortest.
        const durations = [...p.durations].sort((a, b) => a.days - b.days);
        const baseDur = durations[0] ?? null;
        const monthlies = durations.map(monthlyPrice).filter((m): m is number => m !== null);
        const fromMonthly = monthlies.length ? Math.round(Math.min(...monthlies)) : null;
        const sym = baseDur ? (pickPrice(baseDur)?.currency_symbol ?? "") : "";
        const maxSave = Math.max(0, ...durations.map((d) => (baseDur ? ladderSavings(d, baseDur) : 0)));
        const feats = p.description
          ? p.description
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean)
          : [
              `До ${p.device_limit} устройств`,
              p.traffic_limit === 0 ? "Безлимитный трафик" : `${p.traffic_limit} ГБ трафика`,
            ];

        const selDur =
          selected?.planCode === p.public_code
            ? (durations.find((d) => d.days === selected.days) ?? null)
            : null;
        const selPrice = selDur ? pickPrice(selDur) : null;
        const selPerMonth = selDur ? monthlyPrice(selDur) : null;
        const selSave = selDur && baseDur ? ladderSavings(selDur, baseDur) : 0;

        return (
          <section className="console plan-console" key={p.id} aria-label={`Тариф ${p.name}`}>
            <div className="console-corner console-corner-tl" aria-hidden="true" />
            <div className="console-corner console-corner-tr" aria-hidden="true" />

            <header className="console-header">
              <span className="console-name">{p.name}</span>
              {fromMonthly !== null && (
                <span className="plan-from">
                  от{" "}
                  <b>
                    {fromMonthly} {sym}
                  </b>
                  <small>/мес</small>
                </span>
              )}
            </header>

            <ul className="plan-feats">
              {feats.map((line, i) => (
                <li key={i}>
                  <span className="ok">
                    <Icon name="check" size={14} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>

            <div className="dur-eyebrow">Срок подписки</div>
            <div className="dur-ladder" role="radiogroup" aria-label={`Срок подписки — ${p.name}`}>
              {durations.map((d) => {
                const pr = pickPrice(d);
                const perMonth = monthlyPrice(d);
                const save = baseDur ? ladderSavings(d, baseDur) : 0;
                const isSel = selected?.planCode === p.public_code && selected?.days === d.days;
                const isBest = save > 0 && save === maxSave;
                return (
                  <button
                    type="button"
                    key={d.days}
                    className={`dur-line${isSel ? " on" : ""}`}
                    role="radio"
                    aria-checked={isSel}
                    onClick={() => {
                      setSelected({ planCode: p.public_code, days: d.days });
                      clearPayError();
                    }}
                  >
                    <span className="dur-mark" aria-hidden="true" />
                    <span className="dur-info">
                      <span className="dur-term">
                        {durationLabel(d.days)}
                        {isBest && <span className="dur-best">Выгодно</span>}
                      </span>
                      {save > 0 && <span className="dur-save">−{save}% к цене за месяц</span>}
                    </span>
                    <span className="dur-price">
                      <span className="dur-total">
                        {pr ? `${pr.final_amount} ${pr.currency_symbol}` : "—"}
                      </span>
                      {perMonth !== null && (
                        <span className="dur-permonth">
                          {Math.round(perMonth)} {sym}/мес
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {selDur && selPrice && (
              <div className="checkout">
                <div className="checkout-sum">
                  <span className="readout-label">Итого · {durationLabel(selDur.days)}</span>
                  <span className="checkout-total">
                    {selPrice.final_amount} {selPrice.currency_symbol}
                  </span>
                </div>
                <div className="checkout-sub">
                  {selPerMonth !== null && (
                    <>
                      {Math.round(selPerMonth)} {sym}/мес
                    </>
                  )}
                  {selSave > 0 && <> · выгода {selSave}%</>}
                </div>
                {selDur.prices.map((pr) => (
                  <button
                    key={pr.gateway_type}
                    className="btn btn-amber btn-full checkout-pay"
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
                  <p className="checkout-error" role="alert">
                    {payError}
                  </p>
                )}
              </div>
            )}
          </section>
        );
      })}
      </div>

      <p className="modal-note">Выбери срок и нажми «Оплатить» — переведём на оплату.</p>
    </div>
  );
}
