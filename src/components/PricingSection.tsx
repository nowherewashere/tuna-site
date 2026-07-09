"use client";

import { useEffect, useState } from "react";
import { api, type PublicPlanLanding } from "@/lib/api";
import { plural, fmtBytes } from "@/lib/format";
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
          {plans.map((p, i) => (
            <Reveal key={p.public_code} className="price-card" delay={i * 0.06}>
              <div className="price-head">
                <h3 className="price-name">{p.name}</h3>
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
                guest={{ href: "/connect", label: "Подключить" }}
                authed={{ href: "/cabinet", label: "Открыть кабинет" }}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
