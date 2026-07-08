"use client";

import Link from "next/link";
import { type CSSProperties } from "react";
import { useAuth } from "@/lib/useAuth";

type Variant = { href: string; label: string } | null;

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
}: {
  guest: Variant;
  authed: Variant;
  className?: string;
  style?: CSSProperties;
}) {
  const isAuthed = useAuth();
  const variant = isAuthed ? authed : guest;
  if (!variant) return null;
  return (
    <Link className={className} style={style} href={variant.href}>
      {variant.label}
    </Link>
  );
}
