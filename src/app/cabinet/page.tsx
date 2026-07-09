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
  const [selected, setSelected] = useState<Selected>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

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
      api.referralProgram().then(setReferral).catch(() => {});
    }
  }, [tab]);

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
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setLinkError(
          e.detail === "two_active_subscriptions"
            ? "У обоих аккаунтов активная подписка — напиши в поддержку, объединим вручную."
            : "Этот Telegram уже привязан к другому аккаунту.",
        );
      } else if (e instanceof ApiError && e.status === 403) {
        setLinkError("Этот Telegram-аккаунт заблокирован.");
      } else {
        setLinkError("Не удалось подключить Telegram. Попробуй ещё раз.");
      }
    }
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
          {tab === "ref" && <ReferralPanel referral={referral} />}
          {tab === "support" && <SupportPanel displayName={displayName} sub={sub} />}
        </div>
      </div>

      {tab !== "support" && (
        <button className="chat-fab" onClick={openSupport}>
          <Icon name="message" size={18} /> Поддержка
        </button>
      )}
    </div>
  );
}
