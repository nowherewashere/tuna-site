"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  type Device,
  type Me,
  type ReferralProgram,
  type SubscriptionInfo,
  type SubscriptionOffers,
  type TelegramAuthUser,
} from "@/lib/api";
import { useHashTab } from "@/lib/useHashTab";
import { redirectTo, reloadPage } from "@/lib/nav";
import { userDisplayName } from "@/lib/format";
import { invalidateAuth } from "@/lib/useAuth";
import { TAB_IDS, type Tab } from "@/components/cabinet/tabs";
import CabinetTabs from "@/components/cabinet/CabinetTabs";
import OverviewPanel from "@/components/cabinet/OverviewPanel";
import DevicesPanel from "@/components/cabinet/DevicesPanel";
import SubscriptionPanel from "@/components/cabinet/SubscriptionPanel";
import ReferralPanel from "@/components/cabinet/ReferralPanel";
import SupportPanel from "@/components/cabinet/SupportPanel";
import Icon from "@/components/Icon";

type Selected = { planCode: string; days: number } | null;

// Shown after either direction of the account merge. A merge keeps only the winning
// subscription's devices; the rest re-register themselves the next time Happ runs,
// so no manual action is needed.
const MERGE_TOAST =
  "Аккаунты объединены. Если каких-то устройств не видно — они появятся сами, " +
  "когда откроешь на них Happ. Вручную ничего делать не нужно.";

export default function CabinetPage() {
  const router = useRouter();
  const [tab, setTab] = useHashTab(TAB_IDS, "overview");
  const topRef = useRef<HTMLDivElement>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [maxDevices, setMaxDevices] = useState<number | null>(null);
  const [offers, setOffers] = useState<SubscriptionOffers | null>(null);
  const [referral, setReferral] = useState<ReferralProgram | null>(null);
  // Why the referral tab is empty. Without this the panel blamed the subscription for
  // every failure (403 identity, 403 disabled, network) — which was usually a lie.
  const [referralError, setReferralError] = useState<unknown>(null);
  const [selected, setSelected] = useState<Selected>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-dismiss the toast; the merge notice is longer, so give it time to read.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 10000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, subRes] = await Promise.all([api.me(), api.currentSubscription()]);
        setMe(meRes);
        setSub(subRes);
      } catch {
        setAuthed(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Lazy per-tab loading: a tab's data is fetched only when it is first opened,
  // then cached in state for the session. Keeps the heavy offers pricing/discount
  // computation and the referral endpoint off unrelated tabs and off every reload.
  const fetchedTabs = useRef<Set<Tab>>(new Set());
  useEffect(() => {
    if (tab === "sub" && !fetchedTabs.current.has("sub")) {
      fetchedTabs.current.add("sub");
      api.subscriptionOffers().then(setOffers).catch(() => {});
    }
    if (tab === "ref" && !fetchedTabs.current.has("ref")) {
      fetchedTabs.current.add("ref");
      api
        .referralProgram()
        .then((r) => {
          setReferral(r);
          setReferralError(null);
        })
        .catch(setReferralError);
    }
  }, [tab]);

  // Re-pull referral + subscription after a payout or a pay-with-balance action:
  // the balance changes on both, and pay-with-balance also extends the subscription,
  // so the Subscription/Overview tabs stay in sync (single source of truth).
  function refreshReferral() {
    api
      .referralProgram()
      .then((r) => {
        setReferral(r);
        setReferralError(null);
      })
      .catch(setReferralError);
    api.currentSubscription().then(setSub).catch(() => {});
  }

  function loadDevices() {
    api
      .devices()
      .then((d) => {
        setDevices(d.devices);
        setMaxDevices(d.max_count);
      })
      .catch(() => {
        setDevices([]);
        setMaxDevices(null);
      });
  }
  useEffect(() => {
    loadDevices();
  }, []);

  async function unbind(hwid: string) {
    setDevices((ds) => ds?.filter((d) => d.hwid !== hwid) ?? null);
    await api.deleteDevice(hwid).catch(() => {});
    loadDevices();
  }

  async function pay(planCode: string, days: number, gateway: string) {
    setPaying(true);
    setPayError(null);
    try {
      const res = await api.purchase(planCode, days, gateway);
      if (res.payment_url) {
        redirectTo(res.payment_url); // hand off to the gateway
        return;
      }
      reloadPage(); // free / instant activation, no redirect
    } catch (e) {
      setPayError(
        e instanceof ApiError
          ? e.detail || "Не удалось создать платёж. Попробуй позже."
          : "Сеть недоступна. Попробуй ещё раз.",
      );
      setPaying(false);
    }
  }

  async function logout() {
    await api.logout().catch(() => {});
    invalidateAuth();
    router.push("/");
  }

  // Attach a Telegram identity to this (site) account. When the Telegram already
  // has its own bot account the backend merges the two into one and returns the
  // combined profile; a 409 means it can't merge automatically (both sides have
  // an active subscription, or the actor is already linked to a different one).
  async function linkTelegram(user: TelegramAuthUser) {
    setLinkError(null);
    try {
      const updated = await api.telegramLink(user);
      setMe(updated);
      if (updated.merged) {
        await refreshAfterMerge();
        setToast(MERGE_TOAST);
      }
    } catch (e) {
      // Keep the raw error in the console so the exact status/detail is visible
      // when diagnosing a failed link.
      console.error("Telegram link failed:", e);
      if (e instanceof ApiError && e.status === 409) {
        setLinkError(
          e.detail === "two_active_subscriptions"
            ? "У обоих аккаунтов активная подписка — напиши в поддержку, объединим вручную."
            : "Этот Telegram уже привязан к другому аккаунту.",
        );
      } else if (e instanceof ApiError && e.status === 401) {
        // The link endpoint needs a live session; a 401 here means it expired
        // (and the silent refresh couldn't recover it) between page load and click.
        setLinkError("Сессия истекла. Обнови страницу, войди снова и повтори привязку.");
      } else if (e instanceof ApiError && e.status === 403) {
        setLinkError("Этот Telegram-аккаунт заблокирован.");
      } else {
        setLinkError(
          e instanceof ApiError && e.detail
            ? `Не удалось подключить Telegram: ${e.detail}`
            : "Не удалось подключить Telegram. Попробуй ещё раз.",
        );
      }
    }
  }

  // A merge can hand the subscription over from the absorbed account and retires the
  // losing one, so the cached subscription and device list are both stale afterwards.
  async function refreshAfterMerge() {
    const fresh = await api.currentSubscription().catch(() => null);
    setSub(fresh);
    loadDevices();
  }

  // The email mirror of `linkTelegram`: confirming a code for an address that already
  // owns a site account merges it into this one. EmailConsole renders its own errors,
  // so this only runs on success. The profile is re-read rather than patched, because
  // /auth/email/confirm returns only the confirmed address, and a merge can additionally
  // pull in the absorbed account's Telegram.
  async function emailVerified(merged: boolean) {
    const fresh = await api.me().catch(() => null);
    if (fresh) setMe(fresh);
    if (merged) await refreshAfterMerge();
    setToast(merged ? MERGE_TOAST : "Почта подключена.");
  }

  // Switching tabs returns the view to the top — on mobile the tab content can be
  // scrolled far down, so a plain tab change otherwise leaves you mid-page.
  function changeTab(t: Tab) {
    setTab(t);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openSupport() {
    changeTab("support");
  }

  const displayName = userDisplayName(me);

  return (
    <div className="cab-wrap" ref={topRef}>
      <div className="cab-topbar">
        <div className="wrap">
          <Link href="/" className="logo">
            Tuna VPN
          </Link>
          <CabinetTabs tab={tab} onChange={changeTab} />
          <button className="btn btn-ghost" style={{ padding: "8px 16px" }} onClick={logout}>
            Выйти
          </button>
        </div>
      </div>

      <div className="cab-body">
        <div className="wrap">
          {tab === "overview" && (
            <OverviewPanel
              loading={loading}
              authed={authed}
              sub={sub}
              devices={devices}
              maxDevices={maxDevices}
              displayName={displayName}
              me={me}
              onLinkTelegram={linkTelegram}
              onEmailVerified={emailVerified}
              linkError={linkError}
            />
          )}
          {tab === "devices" && (
            <DevicesPanel devices={devices} maxDevices={maxDevices} sub={sub} onUnbind={unbind} />
          )}
          {tab === "sub" && (
            <SubscriptionPanel
              offers={offers}
              sub={sub}
              selected={selected}
              setSelected={setSelected}
              paying={paying}
              payError={payError}
              onPay={pay}
              clearPayError={() => setPayError(null)}
            />
          )}
          {tab === "ref" && (
            <ReferralPanel
              referral={referral}
              loadError={referralError}
              onRefresh={refreshReferral}
            />
          )}
          {tab === "support" && <SupportPanel displayName={displayName} sub={sub} />}
        </div>
      </div>

      {tab !== "support" && (
        <button className="chat-fab" onClick={openSupport}>
          <Icon name="message" size={18} /> Поддержка
        </button>
      )}

      {toast && (
        <div className="cab-toast" role="status">
          <Icon name="check" size={18} className="cab-toast-ic" />
          <p>{toast}</p>
          <button className="cab-toast-x" aria-label="Закрыть" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
