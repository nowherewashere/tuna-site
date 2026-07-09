"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { storeRefCode } from "@/lib/referral";

/**
 * Referral link capture for the static-export SPA.
 *
 * There is no `/r/[code]` route (a dynamic segment can't be pre-rendered under
 * `output: "export"`, and adding one breaks the export). Instead nginx falls any
 * unknown path — including `/r/<code>` — back to `/index.html`, so this app boots
 * with the referral code still in the URL. Mounted once in the root layout, this
 * component reads the code on mount, persists it (cookie + localStorage), then
 * swaps the URL to `/` so the code never lingers or gets bookmarked.
 *
 * Renders nothing.
 */
export default function RefCapture() {
  const router = useRouter();

  useEffect(() => {
    const m = window.location.pathname.match(/^\/r\/([A-Za-z0-9]+)/);
    if (!m) return;
    storeRefCode(m[1]);
    // Replace (not push) so Back doesn't return to the /r/ URL. router.replace
    // renders the home route client-side, avoiding a stuck 404 for the unknown path.
    router.replace("/");
  }, [router]);

  return null;
}
