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
  { id: "faq", label: "глубина", depth: "−3800 м" },
  { id: "final", label: "открытый океан", depth: "∞" },
] as const;

export default function DepthGauge() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const doc = document.documentElement;

    const readProgress = () => {
      raf.current = null;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0);
    };
    const onScroll = () => {
      if (raf.current == null) raf.current = requestAnimationFrame(readProgress);
    };

    readProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // Light up the mark for whichever section owns the middle of the viewport.
    const sections = MARKS.map((m) => document.getElementById(m.id));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = sections.indexOf(e.target as HTMLElement);
            if (idx >= 0) setActive(idx);
          }
        }
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    sections.forEach((s) => s && io.observe(s));

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf.current != null) cancelAnimationFrame(raf.current);
      io.disconnect();
    };
  }, []);

  const pct = `${progress * 100}%`;

  return (
    <>
      <div className="dive-progress" aria-hidden="true">
        <span style={{ width: pct }} />
      </div>

      <aside className="gauge" aria-hidden="true">
        <div className="gauge-rail">
          <span className="gauge-fill" style={{ height: pct }} />
          <span className="gauge-diver" style={{ top: pct }} />
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
