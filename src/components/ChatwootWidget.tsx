"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePublicConfig } from "@/lib/usePublicConfig";
import { useAuth } from "@/lib/useAuth";
import { api } from "@/lib/api";

// Minimal surface of the Chatwoot SDK we rely on. Loaded from the self-hosted
// Chatwoot at runtime, so it isn't a bundled dependency.
declare global {
  interface Window {
    chatwootSettings?: Record<string, unknown>;
    chatwootSDK?: { run: (opts: { websiteToken: string; baseUrl: string }) => void };
    $chatwoot?: {
      toggle: (state?: "open" | "close") => void;
      setUser: (identifier: string, attrs: Record<string, unknown>) => void;
      setCustomAttributes: (attrs: Record<string, unknown>) => void;
      toggleBubbleVisibility: (state: "hide" | "show") => void;
    };
  }
}

// Guard against a second injection (React strict-mode double effect / re-renders).
let injected = false;

/**
 * Loads the Chatwoot live-chat widget site-wide when the backend advertises it
 * via /public/config. No config ⇒ nothing happens (widget disabled). Rendered
 * once from the root layout.
 */
export default function ChatwootWidget() {
  const cfg = usePublicConfig();
  const authed = useAuth();
  const pathname = usePathname();

  // Inject the SDK once config provides the base URL + website token.
  useEffect(() => {
    if (injected || !cfg?.chatwoot_base_url || !cfg?.chatwoot_website_token) return;
    injected = true;

    const baseUrl = cfg.chatwoot_base_url;
    const token = cfg.chatwoot_website_token;

    // Hide the floating bubble inside the cabinet (it has its own support entry);
    // keep it visible on public pages as the guest support entry point. Seeding the
    // initial state here avoids a flash of the bubble on a direct cabinet load.
    const inCabinet = window.location.pathname.startsWith("/cabinet");
    window.chatwootSettings = { position: "right", locale: "ru", hideMessageBubble: inCabinet };

    const s = document.createElement("script");
    s.src = `${baseUrl}/packs/js/sdk.js`;
    s.defer = true;
    s.async = true;
    s.onload = () => window.chatwootSDK?.run({ websiteToken: token, baseUrl });
    document.head.appendChild(s);
  }, [cfg]);

  // Attach the logged-in identity once the widget is ready; guests stay anonymous.
  // NOTE: identity is UNVERIFIED for now. Turn on Chatwoot "identity validation"
  // only after the backend serves an identifier_hash (needs the inbox HMAC token).
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;

    (async () => {
      try {
        const me = await api.me();
        if (cancelled) return;
        const identifier = me.telegram_id ? `tg:${me.telegram_id}` : (me.email ?? "");
        if (!identifier) return;

        const apply = () =>
          window.$chatwoot?.setUser(identifier, {
            email: me.email ?? undefined,
            name: me.username || me.name || undefined,
          });

        if (window.$chatwoot) apply();
        else window.addEventListener("chatwoot:ready", apply, { once: true });
      } catch {
        /* no session — stay anonymous */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authed]);

  // Route-aware bubble: hidden in the cabinet, shown on public pages. Applied on
  // client-side navigation, and once the SDK is ready on a fresh load.
  useEffect(() => {
    const inCabinet = pathname?.startsWith("/cabinet") ?? false;
    const apply = () => window.$chatwoot?.toggleBubbleVisibility(inCabinet ? "hide" : "show");
    if (window.$chatwoot) {
      apply();
    } else {
      window.addEventListener("chatwoot:ready", apply, { once: true });
      return () => window.removeEventListener("chatwoot:ready", apply);
    }
  }, [pathname]);

  return null;
}
