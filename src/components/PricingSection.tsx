"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type PublicPlanLanding } from "@/lib/api";
import { plural, fmtBytes } from "@/lib/format";
import { storeSelectedPlan } from "@/lib/selectedPlan";
import AuthCta from "@/components/AuthCta";
import Icon from "@/components/Icon";
import { Reveal } from "@/components/ui";

function trafficLabel(bytes: number): string {
  // A 0 traffic limit means "unmetered" in the panel.
  return bytes <= 0 ? "Безлимитный трафик" : `${fmtBytes(bytes)} трафика`;
}

function deviceLabel(n: number): string {
  return `${n} ${plural(n, "устройство", "устройства", "устройств")}`;
}

/** Round the API's decimal price string to a whole ruble ("139.33" → "139"). */
function priceLabel(rub: string): string {
  const n = Math.round(parseFloat(rub));
  return Number.isFinite(n) ? String(n) : rub;
}

/**
 * The recommended tier is the TOP of the price ladder, computed from the live
 * plans — not a hardcoded id. The backend has no tier/recommended field, and
 * `public_code` is an opaque per-deployment token, so price is the reliable
 * tier signal (and it never couples to the free-text name). Returns null when
 * there's nothing to steer between (fewer than two plans).
 */
function recommendedCode(plans: PublicPlanLanding[]): string | null {
  if (plans.length < 2) return null;
  return plans.reduce((top, p) =>
    parseFloat(p.monthly_from_rub) > parseFloat(top.monthly_from_rub) ? p : top,
  ).public_code;
}

/** Drop any leading emoji / variation-selector / ZWJ run an operator may have
 *  prefixed to the plan name, keeping the clean text for the heading. */
function cleanPlanName(name: string): string {
  return name.replace(/^[\p{Extended_Pictographic}\u{FE0F}\u{200D}\s]+/u, "");
}

type LoadStatus = "loading" | "error" | "ready";

/**
 * Landing tariffs section. Fetches plans from the bot's public API
 * (`/api/v1/public/plans/public`) — the single source of truth, no hardcoded
 * prices. The `<section id="pricing">` wrapper is ALWAYS rendered so the nav
 * "Тарифы" anchor never scrolls into nothing; a load failure degrades to an
 * error line + retry, and an empty result to a neutral placeholder.
 */
export default function PricingSection() {
  const [plans, setPlans] = useState<PublicPlanLanding[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  // Kept free of a synchronous setState so the mount effect can call it without
  // triggering a cascading render (status already defaults to "loading").
  const load = useCallback(() => {
    api
      .landingPlans()
      .then((res) => {
        setPlans(res.plans);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  // Retry is a user event, so it may reset to the loading state before refetching.
  const retry = useCallback(() => {
    setStatus("loading");
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const recCode = recommendedCode(plans);

  return (
    <section className="pricing" id="pricing">
      <div className="wrap">
        <div className="sec-eyebrow">Тарифы</div>
        <h2 className="sec-title">Выбери свою глубину</h2>
        <p className="sec-intro">
          Прозрачные тарифы без скрытых платежей. Чем дольше подписка — тем ниже цена за месяц.
        </p>

        {status === "loading" && (
          <div className="price-grid" aria-hidden="true">
            <div className="price-card price-card--skeleton" />
            <div className="price-card price-card--skeleton" />
          </div>
        )}

        {status === "error" && (
          <div className="price-status" role="alert">
            <p>Не удалось загрузить тарифы. Проверьте соединение и попробуйте ещё раз.</p>
            <button type="button" className="btn btn-ghost" onClick={retry}>
              Повторить
            </button>
          </div>
        )}

        {status === "ready" && plans.length === 0 && (
          <div className="price-status">
            <p>Тарифы скоро появятся.</p>
          </div>
        )}

        {status === "ready" && plans.length > 0 && (
          <div className="price-grid">
            {plans.map((p, i) => {
            const isRecommended = p.public_code === recCode;
            return (
              <Reveal
                key={p.public_code}
                className={`price-card${isRecommended ? " price-card--rec" : ""}`}
                delay={i * 0.06}
              >
                {isRecommended && <div className="price-rec-badge">Рекомендуем</div>}
                <div className="price-head">
                  <span className="price-icon">
                    <Icon name={isRecommended ? "gauge" : "shield"} size={22} />
                  </span>
                  <h3 className="price-name">{cleanPlanName(p.name)}</h3>
                  {p.description && <p className="price-desc">{p.description}</p>}
                </div>
                <div className="price-amount">
                  <span className="price-from">от</span>
                  <span className="price-value">{priceLabel(p.monthly_from_rub)}</span>
                  <span className="price-per">₽/мес</span>
                </div>
                <ul className="price-meta">
                  <li>
                    <Icon name="phone" size={17} />
                    {deviceLabel(p.device_limit)}
                  </li>
                  <li>
                    <Icon name="bolt" size={17} />
                    {trafficLabel(p.traffic_limit)}
                  </li>
                </ul>
                <AuthCta
                  className="btn btn-amber price-cta"
                  guest={{ href: "/login", label: "Подключить" }}
                  authed={{ href: "/cabinet#sub", label: "Открыть кабинет" }}
                  onClick={() => storeSelectedPlan(p.public_code)}
                />
              </Reveal>
            );
          })}
          </div>
        )}
      </div>
    </section>
  );
}
