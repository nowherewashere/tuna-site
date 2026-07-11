import type { MetadataRoute } from "next";

// Required under `output: "export"`: emit this metadata route as a static file at
// build (lastModified/new Date() are then evaluated once, at build time).
export const dynamic = "force-static";

// Emitted as a static /sitemap.xml at build (output: "export"). Lists ONLY the
// indexable set — the auth/app shells (/login, /connect, /cabinet) are noindex and
// deliberately excluded. Honest lastModified: the landing is regenerated on every
// deploy (build time); the legal pages carry their stated effective date.
const BASE = "https://tuna-vpn.com";
const LEGAL_EFFECTIVE = new Date("2026-07-07");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      // No trailing slash — matches the homepage's rendered canonical exactly
      // (Next resolves alternates.canonical "/" to the bare origin), so GSC never
      // flags a non-canonical sitemap URL.
      url: BASE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/oferta`,
      lastModified: LEGAL_EFFECTIVE,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: LEGAL_EFFECTIVE,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
