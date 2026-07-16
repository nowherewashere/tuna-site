"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import type { SubscriptionInfo, SubscriptionOffers } from "@/lib/api";
import {
  daysLeftUntil,
  durationLabel,
  expiryAfterAdding,
  fmtDate,
  ladderSavings,
  monthlyPrice,
  pickPrice,
  plural,
  STATUS_LABEL,
  statusPillClass,
} from "@/lib/format";
import { onRovingKeyDown } from "@/lib/roving";
import { ConsoleFrame } from "@/components/ui";

type Selected = { planCode: string; days: number } | null;

const daysWord = (n: number) => plural(n, "день", "дня", "дней");

export default function SubscriptionPanel({
  offers,
  sub,
  selected,
  setSelected,
  paying,
  payError,
  onPay,
  clearPayError,
}: {
  offers: SubscriptionOffers | null;
  sub: SubscriptionInfo | null;
  selected: Selected;
  setSelected: (s: Selected) => void;
  paying: boolean;
  payError: string | null;
  onPay: (planCode: string, days: number, gateway: string, paymentMethod?: number) => void;
  clearPayError: () => void;
}) {
  // Captured once on mount (pure render); the day counter doesn't need to tick.
  const [now] = useState(() => Date.now());

  if (!offers || offers.plans.length === 0) {
    return (
      <div className="panel">
        <h2 className="panel-title">Подписка</h2>
        <ConsoleFrame className="console-empty" aria-label="Тарифы">
          <p>Тарифы скоро появятся здесь. Пока пользуйся пробным периодом.</p>
        </ConsoleFrame>
      </div>
    );
  }

  const isTrial = !!sub?.is_trial;
  const daysLeft = sub ? Math.max(0, daysLeftUntil(sub.expire_at, now)) : 0;
  const remainder = daysLeft; // days that stack onto a purchase; 0 once expired
  const hasRemainder = remainder > 0;
  const statusClass = statusPillClass(sub?.status);
  const expirySoon = daysLeft > 0 && daysLeft <= 5;

  // One persistent live region announces the selection concisely (a fresh
  // aria-live node mounted with its content isn't reliably announced).
  const liveSummary = (() => {
    if (!selected) return "";
    const p = offers.plans.find((x) => x.public_code === selected.planCode);
    const d = p?.durations.find((x) => x.days === selected.days);
    if (!p || !d) return "";
    const pr = pickPrice(d);
    const isCur = !!sub && !isTrial && sub.plan_name === p.name;
    const isSwitch = !!sub && !isTrial && !isCur;
    const modeWord = !sub || isTrial ? "Оформление" : isCur ? "Продление" : "Смена тарифа";
    const priceStr = pr ? `, ${pr.final_amount} ${pr.currency_symbol}` : "";
    // On a switch the remainder converts to bonus days, so no exact end date up front.
    const tail =
      isSwitch && hasRemainder
        ? `, остаток ${remainder} ${daysWord(remainder)} пересчитается в бонусные дни`
        : `, действует до ${expiryAfterAdding(hasRemainder ? sub!.expire_at : null, d.days, now)}`;
    return `${modeWord}: ${p.name}, ${durationLabel(d.days)}${priceStr}${tail}`;
  })();

  return (
    <div className="panel">
      <h2 className="panel-title">Подписка</h2>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveSummary}
      </div>

      {sub && (
        <ConsoleFrame className="sub-current" aria-label="Текущая подписка">
          <div className="console-title">Текущая подписка</div>
          <header className="console-header">
            <span className="console-name">{sub.plan_name}</span>
            <span className={`status-pill ${statusClass}`}>
              <span className="d" />{" "}
              {isTrial ? "Пробный период" : (STATUS_LABEL[sub.status] ?? sub.status)}
            </span>
          </header>
          {sub.plan_locations && (
            <div className="plan-locations-row">
              <Icon name="globe" size={15} />
              <span aria-label="Локации">{sub.plan_locations}</span>
            </div>
          )}
          <div className="console-readouts">
            <div className="readout">
              <span className="readout-label">Осталось</span>
              <span className={`readout-val${expirySoon ? " is-urgent" : ""}`}>
                {daysLeft} {daysWord(daysLeft)}
              </span>
            </div>
            <div className="readout">
              <span className="readout-label">Действует до</span>
              <span className="readout-val">{fmtDate(sub.expire_at)}</span>
            </div>
          </div>
        </ConsoleFrame>
      )}

      <div className="panel-sub panel-sub--center">
        {sub
          ? "Продли текущий тариф или выбери другой — оставшееся время не сгорит."
          : "Выбери тариф и срок — чем дольше период, тем ниже цена за месяц."}
      </div>

      <div className="plan-consoles">
        {offers.plans.map((p) => {
          // Durations shortest → longest; savings are measured against the shortest.
          const durations = [...p.durations].sort((a, b) => a.days - b.days);
          const baseDur = durations[0] ?? null;
          const monthlies = durations.map(monthlyPrice).filter((m): m is number => m !== null);
          const fromMonthly = monthlies.length ? Math.round(Math.min(...monthlies)) : null;
          const sym = baseDur ? (pickPrice(baseDur)?.currency_symbol ?? "") : "";
          const maxSave = Math.max(
            0,
            ...durations.map((d) => (baseDur ? ladderSavings(d, baseDur) : 0)),
          );
          const feats = p.description
            ? p.description
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
            : [
                `До ${p.device_limit} устройств`,
                p.traffic_limit === 0 ? "Безлимитный трафик" : `${p.traffic_limit} ГБ трафика`,
              ];

          const isCurrentPlan = !!sub && !isTrial && sub.plan_name === p.name;
          const mode: "buy" | "renew" | "switch" = !sub || isTrial
            ? "buy"
            : isCurrentPlan
              ? "renew"
              : "switch";
          const groupSelected = selected?.planCode === p.public_code;

          const selDur = groupSelected
            ? (durations.find((d) => d.days === selected!.days) ?? null)
            : null;
          const selPrice = selDur ? pickPrice(selDur) : null;

          return (
            <ConsoleFrame
              className={`plan-console${isCurrentPlan ? " is-current" : ""}`}
              key={p.id}
            >
              <header className="console-header">
                <h3 className="console-name">
                  {p.name}
                  {isCurrentPlan && <span className="plan-badge">Ваш тариф</span>}
                </h3>
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

              {p.locations && (
                <div className="plan-locations-row">
                  <Icon name="globe" size={15} />
                  <span aria-label="Локации">{p.locations}</span>
                </div>
              )}

              <div className="dur-eyebrow">Срок подписки</div>
              <div
                className="dur-ladder"
                role="radiogroup"
                aria-label={`Срок подписки — ${p.name}`}
                onKeyDown={(e) =>
                  onRovingKeyDown(
                    e,
                    Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>(".dur-line")),
                  )
                }
              >
                {durations.map((d, idx) => {
                  const pr = pickPrice(d);
                  const perMonth = monthlyPrice(d);
                  const save = baseDur ? ladderSavings(d, baseDur) : 0;
                  const isSel = groupSelected && selected!.days === d.days;
                  const isBest = save > 0 && save === maxSave;
                  return (
                    <button
                      type="button"
                      key={d.days}
                      className={`dur-line${isSel ? " on" : ""}`}
                      role="radio"
                      aria-checked={isSel}
                      aria-label={`${durationLabel(d.days)}${save > 0 ? `, скидка ${save}%` : ""}, ${
                        pr ? `${pr.final_amount} ${pr.currency_symbol}` : "цена недоступна"
                      }`}
                      tabIndex={groupSelected ? (isSel ? 0 : -1) : idx === 0 ? 0 : -1}
                      onClick={() => {
                        setSelected({ planCode: p.public_code, days: d.days });
                        clearPayError();
                      }}
                    >
                      <span className="dur-mark" aria-hidden="true" />
                      <span className="dur-info" aria-hidden="true">
                        <span className="dur-term">
                          {durationLabel(d.days)}
                          {isBest && <span className="dur-best">Выгодно</span>}
                        </span>
                        {save > 0 && <span className="dur-save">−{save}% к цене за месяц</span>}
                      </span>
                      <span className="dur-price" aria-hidden="true">
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

              {selDur &&
                selPrice &&
                (() => {
                  const D = selDur.days;
                  const term = durationLabel(D);
                  const newExpiry = expiryAfterAdding(hasRemainder ? sub!.expire_at : null, D, now);
                  const keepNote = hasRemainder
                    ? ` Остаток ${remainder} ${daysWord(remainder)} сохранится.`
                    : "";
                  // On a plan switch the remaining value is converted to bonus days on the
                  // new plan (not day-stacked), so an exact end date can't be shown up front.
                  const isSwitchWithRemainder = mode === "switch" && hasRemainder;
                  const label =
                    mode === "renew" ? "Продление" : mode === "switch" ? "Смена тарифа" : "Оформление";
                  const context =
                    mode === "renew"
                      ? `Продлим «${p.name}» на ${term}.${keepNote}`
                      : mode === "switch"
                        ? `Перейдём на «${p.name}» на ${term}.`
                        : `Активируем «${p.name}» на ${term}.${keepNote}`;
                  const payVerb = mode === "renew" ? "Продлить" : "Оплатить";

                  return (
                    <div className="checkout">
                      <div className="checkout-sum">
                        <span className="readout-label">{label}</span>
                        <span className="checkout-total">
                          {selPrice.final_amount} {selPrice.currency_symbol}
                        </span>
                      </div>
                      <p className="checkout-sub">{context}</p>
                      <p className="checkout-meta">
                        <Icon name="calendar" size={14} />{" "}
                        {isSwitchWithRemainder ? (
                          <>
                            Остаток {remainder} {daysWord(remainder)} пересчитается в бонусные дни
                            нового тарифа
                          </>
                        ) : (
                          <>
                            Действует до <b>{newExpiry}</b>
                          </>
                        )}
                      </p>
                      {selDur.prices.map((pr) => {
                        const methods = offers.gateways.find(
                          (g) => g.gateway_type === pr.gateway_type,
                        )?.methods;
                        // Platega with an in-cabinet method choice: one pay button per
                        // method (СБП / карта / крипта). The total is already shown above.
                        if (methods && methods.length > 0) {
                          return methods.map((m) => (
                            <button
                              key={`${pr.gateway_type}-${m.id}`}
                              className="btn btn-amber btn-full checkout-pay"
                              disabled={paying}
                              onClick={() =>
                                onPay(p.public_code, selDur.days, pr.gateway_type, m.id)
                              }
                            >
                              {paying ? "Переход к оплате…" : `${payVerb} · ${m.label}`}
                            </button>
                          ));
                        }
                        return (
                          <button
                            key={pr.gateway_type}
                            className="btn btn-amber btn-full checkout-pay"
                            disabled={paying}
                            onClick={() => onPay(p.public_code, selDur.days, pr.gateway_type)}
                          >
                            {paying
                              ? "Переход к оплате…"
                              : `${payVerb} · ${pr.final_amount} ${pr.currency_symbol}` +
                                (selDur.prices.length > 1 ? ` · ${pr.gateway_type}` : "")}
                          </button>
                        );
                      })}
                      {payError && (
                        <p className="checkout-error" role="alert">
                          {payError}
                        </p>
                      )}
                    </div>
                  );
                })()}
            </ConsoleFrame>
          );
        })}
      </div>
    </div>
  );
}
