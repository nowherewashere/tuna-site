"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { api } from "@/lib/api";

/**
 * Auth-aware CTA for the public pages. When a session is active it links to the
 * cabinet ("Личный кабинет") instead of telling a logged-in user to "Войти" again.
 * Auth is resolved via /auth/me (with the client's silent-refresh), so it reflects
 * the real session, not just the presence of a cookie.
 */
export default function LoginButton({
  className,
  style,
  guestLabel = "Войти",
  authedLabel = "Личный кабинет",
}: {
  className?: string;
  style?: CSSProperties;
  guestLabel?: string;
  authedLabel?: string;
}) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .me()
      .then(() => alive && setAuthed(true))
      .catch(() => alive && setAuthed(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Link className={className} style={style} href={authed ? "/cabinet" : "/login"}>
      {authed ? authedLabel : guestLabel}
    </Link>
  );
}
