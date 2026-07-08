"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import OceanParticles from "./OceanParticles";

/** The hero's underwater scene: light shafts, caustic shimmer, marine snow, and
 *  the tuna on its own parallax plane with light rippling across its silhouette.
 *  All decorative (aria-hidden) and gated behind prefers-reduced-motion — with
 *  motion off it renders a clean static composition. Layers live inside an
 *  overflow-clipped container so nothing ever widens the layout. */
export default function HeroScene() {
  const reduce = useReducedMotion();

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
      {!reduce && <OceanParticles />}
      <motion.div className="hero-tuna-layer" style={reduce ? undefined : { y: tunaScroll }}>
        <motion.div className="hero-tuna-wrap" style={reduce ? undefined : { x: px, y: py }}>
          {/* Idle glide: the fish and its light drift as one plane — a slow bob +
              a hair of rotation about the fish, so it reads as a living swim.
              CSS-driven, so the global prefers-reduced-motion rule stills it. */}
          <div className="hero-tuna-idle">
            <span className="hero-fish-glow" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="hero-tuna" src="/assets/images/hero-tuna.png" alt="" />
            {/* Caustic clipped to the fish silhouette (same PNG as mask) so light
                ripples across its body instead of floating in front of it. */}
            <span className="hero-caustic-fish" />
          </div>
        </motion.div>
      </motion.div>
      <span className="hero-vignette" />
    </div>
  );
}
