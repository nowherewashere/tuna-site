"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AuthCta from "./AuthCta";

// Order mirrors the page's section order (hero → how → why → pricing → faq) so
// clicking left-to-right always scrolls downward — no jump back up.
const LINKS = [
  { href: "#how", label: "Подключение" },
  { href: "#why", label: "Почему Tuna" },
  { href: "#pricing", label: "Тарифы" },
  { href: "#faq", label: "Вопросы" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  // Mobile: the compact nav CTA stays hidden while the hero CTA is on screen, then
  // fades into the bar once the user scrolls past it — so the first screen shows a
  // single CTA (the on-screen one), not a duplicate in the bar.
  const [ctaRevealed, setCtaRevealed] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Nav renders only on the landing, so the hero sentinel is always present.
    const anchor = document.getElementById("hero-cta-anchor");
    if (!anchor) return;
    // IntersectionObserver (not a scroll listener) — reveal once the sentinel below
    // the hero CTA clears the sticky nav. rootMargin offsets the 64px bar.
    const io = new IntersectionObserver(
      ([entry]) => setCtaRevealed(!entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    io.observe(anchor);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const burger = burgerRef.current; // capture for focus-restore on close
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const f = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      burger?.focus();
    };
  }, [open]);

  return (
    <nav className="site-nav">
      <div className="wrap">
        <Link href="/" className="logo">
          <span className="logo-mark" aria-hidden="true" />
          Tuna VPN
        </Link>

        <div className="nav-links nav-desktop-only">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
          <AuthCta
            className="btn btn-ghost nav-cta"
            guest={{ href: "/login", label: "Войти" }}
            authed={{ href: "/cabinet", label: "Личный кабинет", className: "btn btn-amber nav-cta" }}
          />
        </div>

        <div className="nav-mobile-only">
          <AuthCta
            className={`btn btn-amber nav-cta-sm${ctaRevealed ? " is-visible" : ""}`}
            guest={{ href: "/login", label: "Подключить" }}
            authed={{ href: "/cabinet", label: "Кабинет" }}
          />
          <button
            ref={burgerRef}
            type="button"
            className={`nav-burger${open ? " is-open" : ""}`}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {open && (
        <div className="nav-overlay">
          <button
            type="button"
            className="nav-scrim"
            aria-label="Закрыть меню"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div
            className="nav-drawer"
            id="mobile-menu"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Меню навигации"
          >
            {/* Explicit close, sitting where the burger was. The overlay paints above
                the (non-positioned) burger, so the burger's animated X is hidden and
                its tap-zone is dead — this button lives in the drawer's own layer and
                joins the focus-trap. */}
            <button
              type="button"
              className="nav-drawer-close"
              aria-label="Закрыть меню"
              onClick={() => setOpen(false)}
            >
              <span />
              <span />
            </button>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="nav-drawer-link" onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            <AuthCta
              className="btn btn-amber btn-full btn-lg nav-drawer-cta"
              guest={{ href: "/login", label: "Подключить" }}
              authed={{ href: "/cabinet", label: "Личный кабинет" }}
              onClick={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </nav>
  );
}
