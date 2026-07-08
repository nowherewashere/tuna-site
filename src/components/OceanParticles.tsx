"use client";

import { useEffect, useRef } from "react";

/** Marine snow: a sparse field of slow-rising motes that sells "we are underwater".
 *  Canvas is sized to its parent (ResizeObserver), DPR-aware, and only animates
 *  when the parent is on screen. Mount only when motion is allowed. */
export default function OceanParticles({ count = 26 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    type P = { x: number; y: number; r: number; v: number; drift: number; a: number };
    let parts: P[] = [];

    function seed() {
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.8,
        v: 4 + Math.random() * 10, // px/s upward
        drift: (Math.random() - 0.5) * 6,
        a: 0.12 + Math.random() * 0.28,
      }));
    }

    function resize() {
      const rect = parent!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (parts.length === 0) seed();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    resize();

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
      threshold: 0,
    });
    io.observe(parent);

    let raf = 0;
    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx!.clearRect(0, 0, w, h);
      if (visible) {
        for (const p of parts) {
          p.y -= p.v * dt;
          p.x += p.drift * dt;
          if (p.y < -4) {
            p.y = h + 4;
            p.x = Math.random() * w;
          }
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(190, 224, 255, ${p.a})`;
          ctx!.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [count]);

  return <canvas ref={canvasRef} className="hero-particles" aria-hidden="true" />;
}
