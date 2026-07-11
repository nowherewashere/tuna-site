"use client";

import { useEffect, useState } from "react";
import { api, type PublicPlanLanding } from "@/lib/api";
import { plural, fmtBytes } from "@/lib/format";
import { storeSelectedPlan } from "@/lib/selectedPlan";
import AuthCta from "@/components/AuthCta";
import Icon, { type IconName } from "@/components/Icon";
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

/** The tier we steer people toward — highlighted as the recommended card. */
const RECOMMENDED_PLAN = "pro";

/**
 * Plan identity mark, driven by the stable public_code — never by the
 * free-text name, which operators can seed with OS emoji (🐟) that render as
 * a color glyph and break the monochrome line-icon system. Unknown codes fall
 * back to the shield.
 */
const PLAN_ICON: Record<string, IconName> = { standard: "shield", pro: "bolt" };

/** Drop any leading emoji / variation-selector / ZWJ run an operator may have
 *  prefixed to the plan name, keeping the clean text for the heading. */
function cleanPlanName(name: string): string {
  return name.replace(/^[\p{Extended_Pictographic}\u{FE0F}\u{200D}\s]+/u, "");
}

/**
 * Landing tariffs section. Fetches plans from the bot's public API
 * (`/api/v1/public/plans/public`) — the single source of truth, no hardcoded
 * prices. Progressive enhancement: renders nothing until plans arrive (and on
 * error/empty), so a backend hiccup never breaks the page.
 */
export default function PricingSection() {
  const [plans, setPlans] = useState<PublicPlanLanding[] | null>(null);

  useEffect(() => {
    api
      .landingPlans()
      .then((res) => setPlans(res.plans))
      .catch(() => setPlans([]));
  }, []);

  if (!plans || plans.length === 0) return null;

  return (
    <section className="pricing" id="pricing">
      <div className="wrap">
        <div className="sec-eyebrow">Тарифы</div>
        <h2 className="sec-title">Выбери свою глубину</h2>
        <p className="sec-intro">
          Прозрачные тарифы без скрытых платежей. Чем дольше подписка — тем ниже цена за месяц.
        </p>
        <div className="price-grid">
          {plans.map((p, i) => {
            const isRecommended = p.public_code === RECOMMENDED_PLAN;
            return (
              <Reveal
                key={p.public_code}
                className={`price-card${isRecommended ? " price-card--rec" : ""}`}
                delay={i * 0.06}
              >
                {isRecommended && <div className="price-rec-badge">Рекомендуем</div>}
                <div className="price-head">
                  <span className="price-icon">
                    <Icon name={PLAN_ICON[p.public_code] ?? "shield"} size={22} />
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
      </div>
    </section>
  );
}
