"use client";

import { useState } from "react";
import type { ReferralProgram } from "@/lib/api";

function UriField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="uri-field">
      <span className="uri-label">{label}</span>
      <div className="uri-row">
        <span className="uri-value">{value}</span>
        <button
          type="button"
          className="uri-copy"
          onClick={() => {
            navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "скопировано" : "копировать"}
        </button>
      </div>
    </div>
  );
}

export default function ReferralPanel({ referral }: { referral: ReferralProgram | null }) {
  if (!referral) {
    return (
      <div className="panel">
        <div className="panel-title">Приглашай друзей</div>
        <div className="console console-empty">
          <p>
            Реферальная программа доступна при активной подписке. Оформи доступ — и приглашай друзей
            за бонусы.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-title">Приглашай друзей</div>
      <div className="panel-sub">За каждого приглашённого — бонус по твоей ссылке.</div>

      <section className="console" aria-label="Реферальная программа">
        <div className="console-corner console-corner-tl" aria-hidden="true" />
        <div className="console-corner console-corner-tr" aria-hidden="true" />

        <div className="ref-callsign">
          <span className="readout-label">Твой код</span>
          <span className="ref-code">{referral.referral_code}</span>
        </div>

        <div className="ref-links">
          <UriField label="Ссылка для бота" value={referral.bot_referral_url} />
          {referral.site_referral_url && (
            <UriField label="Ссылка для сайта" value={referral.site_referral_url} />
          )}
        </div>

        <div className="console-readouts ref-readouts">
          <div className="readout">
            <span className="readout-label">Приглашено</span>
            <span className="readout-val">{referral.invited_count}</span>
          </div>
          <div className="readout">
            <span className="readout-label">Из них платят</span>
            <span className="readout-val is-urgent">{referral.invited_with_payment_count}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
