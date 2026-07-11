"use client";

import { useEffect, useRef } from "react";

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile widget (explicit render). Calls `onVerify` with the token
 * on success, or "" on error/expiry, and `onError` on a hard failure (challenge
 * error or a blocked/failed script) so the caller can offer a retry instead of a
 * silently-disabled submit. Remount (change `key`) to force a reset.
 */
export default function Turnstile({
  siteKey,
  onVerify,
  onError,
}: {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onVerify);
  const errCb = useRef(onError);

  useEffect(() => {
    cb.current = onVerify;
  }, [onVerify]);
  useEffect(() => {
    errCb.current = onError;
  }, [onError]);

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: (token: string) => cb.current(token),
          "error-callback": () => {
            cb.current("");
            errCb.current?.();
          },
          "expired-callback": () => cb.current(""),
        });
      })
      .catch(() => {
        // Script blocked (ad-blocker) or failed to load — surface a retryable
        // failure rather than a submit that stays disabled looking like "loading".
        if (!cancelled) errCb.current?.();
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  return <div ref={ref} className="turnstile-host" />;
}
