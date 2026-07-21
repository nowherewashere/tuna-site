"use client";

import { useAuth } from "@/lib/useAuth";

/**
 * ARG easter-egg marker. Renders a faint "LOOT" word for signed-in visitors
 * only (never for guests, never while auth is still resolving). Intentionally
 * low-key — part of a hidden promo trail.
 *
 * To revert: delete this file, its <LootMark /> usage in app/page.tsx, and the
 * `.loot-mark` block in styles/sections/landing.css.
 */
export default function LootMark() {
  const isAuthed = useAuth();
  if (isAuthed !== true) return null;
  return (
    <div className="loot-mark" aria-hidden="true">
      LOOT
    </div>
  );
}
