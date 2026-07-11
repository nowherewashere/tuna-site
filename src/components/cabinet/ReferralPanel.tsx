"use client";

import { useState } from "react";
import {
  api,
  ApiError,
  type ReferralProgram,
  type SubscriptionOffers,
} from "@/lib/api";
import { durationLabel, fmtDate, fmtRub, pickPrice } from "@/lib/format";
import { apiErrorMessage } from "@/lib/apiError";
import { onRovingKeyDown } from "@/lib/roving";
import { useCopyToClipboard } from "@/lib/useCopyToClipboard";
import Icon from "@/components/Icon";
import { Button, ConsoleFrame, TextField } from "@/components/ui";

/** Copyable long link — one pattern for any URL (mono, ellipsis, no overflow). */
function UriField({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopyToClipboard();
  return (
    <div className="uri-field">
      <span className="uri-label">{label}</span>
      <div className="uri-row">
        <span className="uri-value">{value}</span>
        <button type="button" className="uri-copy" onClick={() => copy(value)}>
          {copied ? "скопировано" : "копировать"}
        </button>
      </div>
    </div>
  );
}

/** RUB string ("149" / "149.00") → integer kopecks, for comparing against balance. */
function rubToKop(amount: string): number {
  return Math.round(parseFloat(amount) * 100);
}

type Section = "none" | "payout" | "pay";

export default function ReferralPanel({
  referral,
  loadError,
  onRefresh,
}: {
  referral: ReferralProgram | null;
  /** Why the program failed to load — drives the empty state. Null while loading. */
  loadError?: unknown;
  onRefresh?: () => void;
}) {
  const [section, setSection] = useState<Section>("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Crypto payout
  const [wallet, setWallet] = useState("");
  const [payoutDone, setPayoutDone] = useState(false);

  // Pay-with-balance
  const [offers, setOffers] = useState<SubscriptionOffers | null>(null);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState(false);
  const [planId, setPlanId] = useState<number | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [payDone, setPayDone] = useState<string | null>(null);

  if (!referral) {
    // Say what actually happened. A 403 means the program is closed to this session
    // (disabled, or no verified identity) — never assume "no subscription".
    const message = !loadError
      ? "Загружаем реферальную программу…"
      : loadError instanceof ApiError && loadError.status === 403
        ? "Реферальная программа сейчас недоступна."
        : "Не удалось загрузить реферальную программу. Попробуй позже.";

    return (
      <div className="panel">
        <h2 className="panel-title">Приглашай друзей</h2>
        <ConsoleFrame className="console-empty" aria-label="Реферальная программа">
          <p role={loadError ? "alert" : "status"}>{message}</p>
        </ConsoleFrame>
      </div>
    );
  }

  const remainingToMin = referral.payout_min_kop - referral.balance_kop;
  const belowMin = remainingToMin > 0;
  const canWithdraw = !belowMin && !referral.has_open_payout;
  // Telegram Stars payout is gifted via the bot (needs Telegram/MTProto), so the
  // site only points there — shown when Stars is enabled, the balance clears the
  // (low) Stars floor, and no payout is already in flight.
  const canGetStars =
    referral.stars_payout_enabled &&
    referral.balance_kop >= referral.stars_min_kop &&
    !referral.has_open_payout;

  function resetTransient() {
    setError(null);
    setBusy(false);
    setPayoutDone(false);
    setPayDone(null);
  }

  function closeSection() {
    setSection("none");
    resetTransient();
  }

  // Bring a just-opened inline sub-console into view so it never opens below the fold
  // on mobile (it's a sibling further down the panel). rAF waits for the render.
  function scrollToSection(id: string) {
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
    );
  }

  function openPayout() {
    resetTransient();
    setWallet(referral!.last_wallet ?? "");
    setSection((s) => {
      const next = s === "payout" ? "none" : "payout";
      if (next === "payout") scrollToSection("ref-payout");
      return next;
    });
  }

  function openPay() {
    resetTransient();
    setDays(null);
    setSection((s) => {
      const next = s === "pay" ? "none" : "pay";
      if (next === "pay") scrollToSection("ref-pay");
      return next;
    });
    if (!offers && !offersLoading) {
      setOffersLoading(true);
      setOffersError(false);
      api
        .subscriptionOffers()
        .then((res) => {
          setOffers(res);
          setPlanId(res.plans[0]?.id ?? null);
        })
        .catch(() => setOffersError(true))
        .finally(() => setOffersLoading(false));
    }
  }

  async function confirmPayout() {
    const w = wallet.trim();
    if (!w) return;
    setBusy(true);
    setError(null);
    try {
      await api.requestCryptoPayout(w);
      setPayoutDone(true);
      onRefresh?.();
    } catch (e) {
      setError(
        apiErrorMessage(e, {
          byStatus: {
            400: "Проверь адрес кошелька и попробуй снова.",
            409: "Вывод недоступен: не хватает баланса или заявка уже в обработке.",
          },
          fallback: "Не удалось создать заявку. Попробуй позже.",
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  // Selected plan/duration for pay-with-balance and its price/affordability.
  const selPlan = offers?.plans.find((p) => p.id === planId) ?? null;
  const durations = selPlan ? [...selPlan.durations].sort((a, b) => a.days - b.days) : [];
  const selDur = durations.find((d) => d.days === days) ?? null;
  const selPrice = selDur ? pickPrice(selDur) : null;
  const priceKop = selPrice ? rubToKop(selPrice.final_amount) : null;
  const canPay = priceKop != null && referral.balance_kop >= priceKop;
  const shortfall = priceKop != null ? priceKop - referral.balance_kop : 0;

  async function confirmPay() {
    if (planId == null || days == null || !canPay) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.payWithBalance(planId, days);
      setPayDone(`Оплачено с баланса. Подписка продлена до ${fmtDate(res.new_expire_at)}`);
      onRefresh?.();
    } catch (e) {
      setError(
        apiErrorMessage(e, {
          byStatus: {
            400: "Этот тариф недоступен для оплаты балансом.",
            409: "Не удалось оплатить: не хватает баланса или нет активной подписки.",
          },
          fallback: "Не удалось оплатить. Попробуй позже.",
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Приглашай друзей</h2>
      <div className="panel-sub">
        За друга, который оформит подписку, — процент на баланс. Выводи в крипте или оплачивай свою
        подписку.
      </div>

      <ConsoleFrame aria-label="Реферальная программа">
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
            <span className="readout-val">{referral.invited_with_payment_count}</span>
          </div>
          <div className="readout">
            <span className="readout-label">Баланс</span>
            <span className="readout-val is-urgent">{fmtRub(referral.balance_kop)} ₽</span>
          </div>
          <div className="readout">
            <span className="readout-label">Выведено</span>
            <span className="readout-val">{fmtRub(referral.withdrawn_kop)} ₽</span>
          </div>
          <div className="readout">
            <span className="readout-label">Потрачено на VPN</span>
            <span className="readout-val">{fmtRub(referral.spent_kop)} ₽</span>
          </div>
        </div>

        <p className="ref-lifetime">Доход за всё время — {fmtRub(referral.lifetime_kop)} ₽</p>

        <div className="ref-actions">
          {!referral.has_open_payout && (
            <Button
              variant="amber"
              iconLeft={<Icon name="wallet" size={18} />}
              disabled={!canWithdraw}
              aria-expanded={section === "payout"}
              aria-controls="ref-payout"
              onClick={openPayout}
            >
              Вывести
            </Button>
          )}
          <Button
            variant="ghost"
            iconLeft={<Icon name="coin" size={18} />}
            aria-expanded={section === "pay"}
            aria-controls="ref-pay"
            onClick={openPay}
          >
            Оплатить подписку балансом
          </Button>
        </div>

        {referral.has_open_payout && (
          <div className="ref-processing">
            <span className="status-pill status-pill--warn">
              <span className="d" /> Заявка на вывод в обработке
            </span>
          </div>
        )}
        {belowMin && !referral.has_open_payout && (
          <p className="ref-hint">Ещё {fmtRub(remainingToMin)} ₽ до вывода</p>
        )}
        {canGetStars && (
          <p className="ref-hint">
            ⭐ Telegram Stars —{" "}
            <a
              className="ref-stars-link"
              href={referral.bot_referral_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              получить в боте
            </a>
            . Тратятся внутри Telegram, это не вывод в деньги.
          </p>
        )}
      </ConsoleFrame>

      {/* ── Inline crypto payout (no modal — mirrors the site's inline checkout) ── */}
      {section === "payout" && (
        <ConsoleFrame className="ref-inline" id="ref-payout" aria-label="Вывод средств">
          <div className="console-title">Вывод в крипте</div>

          {payoutDone ? (
            <div className="ref-done" role="status">
              <Icon name="check" size={18} className="ref-done-ic" />
              <p>Заявка принята. Выплаты — по понедельникам.</p>
              <Button variant="ghost" onClick={closeSection}>
                Хорошо
              </Button>
            </div>
          ) : (
            <>
              <div className="ref-inline-lead">
                <span className="readout-label">Вывод</span>
                <span className="readout-val">
                  {referral.crypto_asset} · {referral.crypto_network}
                </span>
              </div>
              <p className="checkout-sub">
                Выведем весь баланс — <b className="ref-amount">{fmtRub(referral.balance_kop)} ₽</b>
              </p>

              <TextField
                label="Кошелёк для выплаты"
                placeholder="Адрес кошелька"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                disabled={busy}
                autoFocus
              />

              <div className="ref-inline-actions">
                <Button
                  variant="amber"
                  loading={busy}
                  loadingLabel="Отправляем…"
                  disabled={!wallet.trim()}
                  onClick={confirmPayout}
                >
                  Подтвердить вывод
                </Button>
                <Button variant="ghost" disabled={busy} onClick={closeSection}>
                  Отмена
                </Button>
              </div>
              {error && (
                <p className="checkout-error" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </ConsoleFrame>
      )}

      {/* ── Inline pay-with-balance picker ─────────────────────────────────────── */}
      {section === "pay" && (
        <ConsoleFrame className="ref-inline" id="ref-pay" aria-label="Оплата подписки балансом">
          <div className="console-title">Оплата балансом</div>

          {payDone ? (
            <div className="ref-done" role="status">
              <Icon name="check" size={18} className="ref-done-ic" />
              <p>{payDone}</p>
              <Button variant="ghost" onClick={closeSection}>
                Хорошо
              </Button>
            </div>
          ) : offersLoading ? (
            <p className="console-note" role="status">
              Загружаем тарифы…
            </p>
          ) : offersError || !offers || offers.plans.length === 0 ? (
            <>
              <p className="console-note" role="alert">
                Не удалось загрузить тарифы. Попробуй позже.
              </p>
              <div className="ref-inline-actions">
                <Button variant="ghost" onClick={closeSection}>
                  Закрыть
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="ref-inline-lead">
                <span className="readout-label">Доступно на балансе</span>
                <span className="readout-val is-urgent">{fmtRub(referral.balance_kop)} ₽</span>
              </div>

              {offers.plans.length > 1 && (
                <>
                  <div className="dur-eyebrow">Тариф</div>
                  <div
                    className="ref-plan-tabs"
                    role="radiogroup"
                    aria-label="Тариф"
                    onKeyDown={(e) =>
                      onRovingKeyDown(
                        e,
                        Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')),
                      )
                    }
                  >
                    {offers.plans.map((p, i) => {
                      const on = p.id === planId;
                      return (
                        <button
                          type="button"
                          key={p.id}
                          role="radio"
                          aria-checked={on}
                          tabIndex={on || (planId == null && i === 0) ? 0 : -1}
                          className={`ref-plan-tab${on ? " on" : ""}`}
                          onClick={() => {
                            setPlanId(p.id);
                            setDays(null);
                          }}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="dur-eyebrow">Срок подписки</div>
              <div
                className="dur-ladder"
                role="radiogroup"
                aria-label="Срок подписки"
                onKeyDown={(e) =>
                  onRovingKeyDown(
                    e,
                    Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')),
                  )
                }
              >
                {durations.map((d, idx) => {
                  const pr = pickPrice(d);
                  const kop = pr ? rubToKop(pr.final_amount) : null;
                  const affordable = kop != null && referral.balance_kop >= kop;
                  const on = d.days === days;
                  return (
                    <button
                      type="button"
                      key={d.days}
                      role="radio"
                      aria-checked={on}
                      aria-label={`${durationLabel(d.days)}, ${
                        pr ? `${pr.final_amount} ₽` : "цена недоступна"
                      }${affordable ? "" : ", не хватает баланса"}`}
                      tabIndex={on || (days == null && idx === 0) ? 0 : -1}
                      className={`dur-line${on ? " on" : ""}`}
                      onClick={() => {
                        setDays(d.days);
                        setError(null);
                      }}
                    >
                      <span className="dur-mark" aria-hidden="true" />
                      <span className="dur-info" aria-hidden="true">
                        <span className="dur-term">{durationLabel(d.days)}</span>
                        {!affordable && <span className="ref-nofunds">не хватает баланса</span>}
                      </span>
                      <span className="dur-price" aria-hidden="true">
                        <span className="dur-total">{pr ? `${pr.final_amount} ₽` : "—"}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {selDur && selPrice && (
                <div className="checkout">
                  <div className="checkout-sum">
                    <span className="readout-label">К оплате</span>
                    <span className="checkout-total">{selPrice.final_amount} ₽</span>
                  </div>
                  <p className="checkout-sub">
                    {canPay
                      ? "Спишем с баланса. Новые дни добавятся к текущему остатку."
                      : `Не хватает ${fmtRub(shortfall)} ₽ на балансе.`}
                  </p>
                  <Button
                    variant="amber"
                    full
                    loading={busy}
                    loadingLabel="Оплачиваем…"
                    disabled={!canPay}
                    onClick={confirmPay}
                  >
                    Оплатить с баланса
                  </Button>
                  {error && (
                    <p className="checkout-error" role="alert">
                      {error}
                    </p>
                  )}
                </div>
              )}

              <div className="ref-inline-actions">
                <Button variant="ghost" disabled={busy} onClick={closeSection}>
                  Отмена
                </Button>
              </div>
            </>
          )}
        </ConsoleFrame>
      )}
    </div>
  );
}
