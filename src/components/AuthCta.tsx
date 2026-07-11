"use client";

import Link from "next/link";
import { type CSSProperties } from "react";
import { useAuth } from "@/lib/useAuth";

// `className` on a variant overrides the shared one for that auth state — lets a
// single CTA render, say, a ghost "Войти" for guests and an amber "Личный кабинет"
// for signed-in users (nav desktop).
type Variant = { href: string; label: string; className?: string } | null;

/**
 * Auth-aware call-to-action. Renders the `authed` variant when a session is
 * active, otherwise `guest`. A null variant renders nothing in that state (e.g.
 * a secondary "Войти" button that disappears once logged in). While auth is
 * still resolving it shows the guest variant.
 */
export default function AuthCta({
  guest,
  authed,
  className,
  style,
  onClick,
}: {
  guest: Variant;
  authed: Variant;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const isAuthed = useAuth();
  const variant = isAuthed ? authed : guest;
  if (!variant) return null;
  return (
    <Link className={variant.className ?? className} style={style} href={variant.href} onClick={onClick}>
      {variant.label}
    </Link>
  );
}
