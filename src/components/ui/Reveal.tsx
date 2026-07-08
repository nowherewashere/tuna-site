"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Seconds of stagger before this element animates in. */
  delay?: number;
  /** Vertical travel distance in px. */
  y?: number;
  className?: string;
};

/** Scroll-triggered reveal — the site's one orchestrated motion pattern. Fades
 *  and rises into view once. Under prefers-reduced-motion it renders a plain,
 *  fully-visible element (content is never trapped at opacity:0). */
export default function Reveal({ children, delay = 0, y = 16, className }: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
