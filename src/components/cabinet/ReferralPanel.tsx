import type { ReferralProgram } from "@/lib/api";

export default function ReferralPanel({ referral }: { referral: ReferralProgram | null }) {
  return (
    <div className="panel">
      <div className="panel-title">Приглашай друзей</div>
      {!referral ? (
        <div className="card">
          Реферальная программа доступна при активной подписке. Оформи доступ — и приглашай друзей за
          бонусы
        </div>
      ) : (
        <>
          <div className="panel-sub">
            За каждого приглашённого — бонус по твоей ссылке. Твой код:{" "}
            <b>{referral.referral_code}</b>.
          </div>
          <div className="ref-hero">
            <div className="ref-link-box">
              <div className="lbl">Ссылка для бота</div>
              <div className="ref-link">
                <input readOnly value={referral.bot_referral_url} />
                <button
                  className="btn btn-ghost"
                  onClick={() => navigator.clipboard?.writeText(referral.bot_referral_url)}
                >
                  копировать
                </button>
              </div>
            </div>
            {referral.site_referral_url && (
              <div className="ref-link-box">
                <div className="lbl">Ссылка для сайта</div>
                <div className="ref-link">
                  <input readOnly value={referral.site_referral_url} />
                  <button
                    className="btn btn-ghost"
                    onClick={() =>
                      referral.site_referral_url &&
                      navigator.clipboard?.writeText(referral.site_referral_url)
                    }
                  >
                    копировать
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="ref-stats">
            <div className="ref-stat">
              <div className="num">{referral.invited_count}</div>
              <div className="cap">Приглашено</div>
            </div>
            <div className="ref-stat">
              <div className="num">{referral.invited_with_payment_count}</div>
              <div className="cap">Из них платят</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
