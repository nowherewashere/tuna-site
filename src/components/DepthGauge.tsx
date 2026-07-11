"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The signature element: a left-edge depth gauge that turns the page into a dive.
 * The narrative is real, not decoration — the surface is where blocks live
 * (choppy, watched); the open ocean is the free deep. Scrolling descends, an amber
 * "diver" marker tracks progress, and the section you're reading lights up.
 *
 * Each mark's id must match a section id on the page. On narrow screens the rail
 * hides (CSS) and only the hairline dive-progress bar at the top remains.
 */
const MARKS = [
  { id: "surface", label: "поверхность", depth: "0 м" },
  { id: "how", label: "погружение", depth: "−120 м" },
  { id: "why", label: "открытая вода", depth: "−1200 м" },
  { id: "pricing", label: "выбор глубины", depth: "−2600 м" },
  { id: "faq", label: "глубина", depth: "−3800 м" },
  { id: "final", label: "открытый океан", depth: "∞" },
] as const;

export default function DepthGauge() {
  const [active, setActive] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const doc = document.documentElement;

    const readProgress = () => {
      raf.current = null;
      const max = doc.scrollHeight - doc.clientHeight;
      // Write the scroll fraction straight to a CSS custom property (consumed by the
      // three gauge elements via calc()) so scrolling never triggers a React re-render.
      const frac = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      doc.style.setProperty("--pct", String(frac));
    };
    const onScroll = () => {
      if (raf.current == null) raf.current = requestAnimationFrame(readProgress);
    };

    readProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // Light up the mark for whichever section owns the middle of the viewport.
    // Match entries by id (robust to observe order) and rescan via a
    // MutationObserver, so data-driven sections that mount after us — e.g. the
    // pricing section, which renders only once its plans arrive — are tracked too.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = MARKS.findIndex((m) => m.id === (e.target as HTMLElement).id);
            if (idx >= 0) setActive(idx);
          }
        }
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );

    const observed = new Set<string>();
    let mo: MutationObserver | null = null;
    const scan = () => {
      for (const m of MARKS) {
        if (observed.has(m.id)) continue;
        const el = document.getElementById(m.id);
        if (el) {
          observed.add(m.id);
          io.observe(el);
        }
      }
      if (observed.size === MARKS.length) mo?.disconnect();
    };
    mo = new MutationObserver(scan);
    scan();
    if (observed.size < MARKS.length) {
      mo.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf.current != null) cancelAnimationFrame(raf.current);
      io.disconnect();
      mo?.disconnect();
    };
  }, []);

  return (
    <>
      <div className="dive-progress" aria-hidden="true">
        <span />
      </div>

      <aside className="gauge" aria-hidden="true">
        <div className="gauge-rail">
          <span className="gauge-fill" />
          <span className="gauge-diver" />
        </div>
        <ol className="gauge-marks">
          {MARKS.map((m, i) => (
            <li key={m.id} className={i === active ? "on" : ""}>
              <span className="gm-depth">{m.depth}</span>
              <span className="gm-label">{m.label}</span>
            </li>
          ))}
        </ol>
      </aside>
    </>
  );
}
