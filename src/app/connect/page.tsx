"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /connect is now an alias for the unified /login flow — kept as a route so old
// links, bookmarks and the /r/<code> path keep working. The referral code lives in
// a cookie (RefCapture), so nothing is lost in the redirect; /login reads it back.
export default function ConnectRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <main className="login">
      <div className="wrap">
        <div className="auth-checking" aria-busy="true">
          <span className="auth-spinner" aria-hidden="true" />
          <span className="sr-only">Открываем вход…</span>
        </div>
      </div>
    </main>
  );
}
