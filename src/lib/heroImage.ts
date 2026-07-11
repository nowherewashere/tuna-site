/**
 * Single source of truth for the hero image's responsive descriptor. Shared by the
 * <picture> in HeroScene and the LCP preload emitted into the landing's <head> (CWV-01),
 * so the two can never drift apart. Widths match the pre-generated AVIF/WebP/PNG variants
 * in public/assets/images/ (see CLAUDE.md — variants are committed, not built at runtime).
 */
const WIDTHS = [520, 1040, 1560, 2080] as const;

const srcSet = (ext: string): string =>
  WIDTHS.map((w) => `/assets/images/hero-tuna-${w}.${ext} ${w}w`).join(", ");

export const HERO_AVIF_SRCSET = srcSet("avif");
export const HERO_WEBP_SRCSET = srcSet("webp");
// Layout size hint; keep in step with the hero's CSS box.
export const HERO_SIZES = "(max-width: 900px) 92vw, 56vw";
// Non-AVIF fallback <img src> and its intrinsic box (ties CLS safety to the 3:2 asset).
export const HERO_FALLBACK_SRC = "/assets/images/hero-tuna-1040.png";
export const HERO_WIDTH = 1200;
export const HERO_HEIGHT = 800;
// href for the preload link; the browser actually selects from imagesrcset, but a
// concrete candidate is required — use the mid variant.
export const HERO_PRELOAD_HREF = "/assets/images/hero-tuna-1040.avif";
