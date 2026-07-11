"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import {
  HERO_AVIF_SRCSET,
  HERO_WEBP_SRCSET,
  HERO_SIZES,
  HERO_FALLBACK_SRC,
  HERO_WIDTH,
  HERO_HEIGHT,
} from "@/lib/heroImage";

// The rAF particle canvas is decorative and sits behind the LCP hero, so it's split out
// of the initial bundle and mounted only after an idle window (post-LCP), instead of its
// setup competing with the hero decode for main-thread time (PERF-03).
const OceanParticles = dynamic(() => import("./OceanParticles"), { ssr: false });

/** The hero's underwater scene: light shafts, caustic shimmer, marine snow, and
 *  the tuna on its own parallax plane with light rippling across its silhouette.
 *  All decorative (aria-hidden) and gated behind prefers-reduced-motion — with
 *  motion off it renders a clean static composition. Layers live inside an
 *  overflow-clipped container so nothing ever widens the layout. */
export default function HeroScene() {
  const reduce = useReducedMotion();

  // Hold the particle canvas until the browser is idle (after LCP), so its setup never
  // runs in the same frame as the hero image decode.
  const [particlesReady, setParticlesReady] = useState(false);
  useEffect(() => {
    if (reduce) return;
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | undefined;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    if (w.requestIdleCallback) {
      idleId = w.requestIdleCallback(() => setParticlesReady(true), { timeout: 2500 });
    } else {
      timerId = setTimeout(() => setParticlesReady(true), 1200);
    }
    return () => {
      if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
      if (timerId) clearTimeout(timerId);
    };
  }, [reduce]);

  // Scroll parallax: the fish drifts up (we sink past it), shafts settle down.
  const { scrollY } = useScroll();
  const tunaScroll = useTransform(scrollY, [0, 700], [0, reduce ? 0 : -60]);
  const shaftScroll = useTransform(scrollY, [0, 700], [0, reduce ? 0 : 50]);

  // Pointer parallax: a few px of life, smoothed, on a nested plane so it never
  // fights the scroll transform.
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const px = useSpring(pointer.x, { stiffness: 60, damping: 18 });
  const py = useSpring(pointer.y, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (reduce) return;
    function onMove(e: PointerEvent) {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      setPointer({ x: nx * 14, y: ny * 10 });
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce]);

  return (
    <div className="hero-scene" aria-hidden="true">
      <motion.span className="hero-shafts" style={reduce ? undefined : { y: shaftScroll }} />
      <span className="hero-caustic" />
      {!reduce && particlesReady && <OceanParticles />}
      <motion.div className="hero-tuna-layer" style={reduce ? undefined : { y: tunaScroll }}>
        <motion.div className="hero-tuna-wrap" style={reduce ? undefined : { x: px, y: py }}>
          {/* Idle glide: the fish and its light drift as one plane — a slow bob +
              a hair of rotation about the fish, so it reads as a living swim.
              CSS-driven, so the global prefers-reduced-motion rule stills it. */}
          <div className="hero-tuna-idle">
            <span className="hero-fish-glow" />
            {/* Responsive hero: pre-generated AVIF/WebP variants (build-time export
                can't use next/image) rendered into a ~1040px box; width/height ties
                CLS safety to the 3:2 asset. Decorative — alt="" inside aria-hidden. */}
            <picture>
              <source type="image/avif" srcSet={HERO_AVIF_SRCSET} sizes={HERO_SIZES} />
              <source type="image/webp" srcSet={HERO_WEBP_SRCSET} sizes={HERO_SIZES} />
              {/* <img> inside <picture> is allowed by @next/next/no-img-element. This is
                  the LCP element, so fetchPriority="high" pairs with the <head> preload
                  (see page.tsx / heroImage.ts) to pull it off the critical path early. */}
              <img
                className="hero-tuna"
                src={HERO_FALLBACK_SRC}
                alt=""
                width={HERO_WIDTH}
                height={HERO_HEIGHT}
                decoding="async"
                fetchPriority="high"
              />
            </picture>
            {/* Caustic clipped to the fish silhouette (small variant as mask) so
                light ripples across its body instead of floating in front of it. */}
            <span className="hero-caustic-fish" />
          </div>
        </motion.div>
      </motion.div>
      <span className="hero-vignette" />
    </div>
  );
}
