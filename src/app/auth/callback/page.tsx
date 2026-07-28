"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishAuth } from "@/lib/finishAuth";
import { invalidateAuth } from "@/lib/useAuth";
import { isKnownProvider } from "@/lib/oauth";

// How long to sit on the spinner before offering a way out. A static shell with a
// spinner that never resolves is the worst possible failure mode, and this page runs
// after the user has already left the site and come back.
const ESCAPE_AFTER_MS = 8000;

/**
 * Where the OAuth provider's redirect lands, via the backend.
 *
 * The backend has already verified the exchange and set the session cookies by the
 * time we get here; the query string only says how it went. So this page does no
 * network auth of its own — it runs the same post-sign-in routine every other entry
 * point runs, then gets out of the way.
 *
 * Reads `window.location.search` in an effect rather than `useSearchParams()`:
 * under `output: "export"` that hook forces a Suspense boundary on a client page,
 * and reading location directly is what the rest of this codebase does for
 * client-only state anyway (sessionHint, referral, selectedPlan).
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [stuck, setStuck] = useState(false);
  // React 19 StrictMode double-invokes effects in dev; finishAuth activates a trial,
  // so it must run exactly once.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const ok = params.get("status") === "ok";
    const link = params.get("mode") === "link";
    const provider = params.get("provider") ?? "";
    const code = params.get("code");

    if (!ok) {
      const target = link ? "/cabinet" : "/login";
      // A full navigation, not router.replace: the destination reads its ?error= at
      // first render, and a client-side transition can render it before the history
      // entry lands — which silently swallowed the message. Verified 2026-07-27.
      // The error path is rare and not perf-sensitive, so correctness wins.
      window.location.replace(`${target}?error=${encodeURIComponent(code ?? "internal")}`);
      return;
    }

    if (link) {
      // Linking happens inside an existing session — no trial, no funnel, just a
      // fresh read of the identity list the cabinet renders. Same full navigation as
      // above: ?linked= is read at mount, so it must be in the URL before we get there.
      invalidateAuth();
      window.location.replace(
        isKnownProvider(provider) ? `/cabinet?linked=${provider}` : "/cabinet",
      );
      return;
    }

    void finishAuth(isKnownProvider(provider) ? provider : "email", (href) =>
      router.replace(href),
    );
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => setStuck(true), ESCAPE_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="login">
      {/* The page never settles into content of its own, so it needs a visually
          hidden heading or the route snapshots without a level-one heading. */}
      <h1 className="sr-only">Завершаем вход</h1>
      <div className="wrap">
        <div className="auth-checking" aria-busy={!stuck}>
          <span className="auth-spinner" aria-hidden="true" />
          <span role="status" aria-live="polite" className="sr-only">
            Завершаем вход…
          </span>
          {stuck && (
            <p className="auth-tg-fallback">
              Что-то затянулось. <a href="/login">Вернуться ко входу</a>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
