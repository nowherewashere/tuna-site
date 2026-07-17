import type { Metadata, Viewport } from "next";
import { Unbounded, Golos_Text, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import RefCapture from "@/components/RefCapture";
import JsonLd from "@/components/JsonLd";
import { siteGraph } from "@/lib/structuredData";
import { SITE_URL } from "@/lib/config";

// Display / headlines: Unbounded — a wide, geometric, Cyrillic-first face. Used
// big and tight; it carries the whole personality of the brand, so nothing else
// competes with it.
const display = Unbounded({
  subsets: ["latin", "cyrillic"],
  // Only 600/700/800 are actually used (nav-drawer link / titles / headings). Unbounded
  // 500 was declared but never referenced, and no display element resolves to a weight
  // near 400 that would fall back to it — so drop it to load one fewer woff2 (PERF-04).
  // Body (Golos 400/500/600) and mono (IBM Plex 400/500) weights are all in use.
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Body / UI: Golos Text — a Russian-native humanist grotesque (Paratype). Quiet
// on purpose so the display face and the amber signal do the talking.
const body = Golos_Text({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

// Technical values / config links / depth readouts: IBM Plex Mono — a refined,
// Cyrillic-capable monospace for the instrument-style labels, readouts and gauge.
const mono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute base so canonical / OG / sitemap URLs resolve to production, not
  // localhost, under static export (SEO-04). Foundation for the Wave-3 OG work.
  metadataBase: new URL(SITE_URL),
  // `default` is the homepage title; `template` suffixes every child page that sets
  // its own title (e.g. "Вход" -> "Вход — Tuna VPN"), so no two routes share one.
  title: {
    default: "Tuna VPN — открытый интернет за минуту",
    template: "%s — Tuna VPN",
  },
  description:
    "Свободный доступ к мировому океану интернета. Бесплатный пробный период, без карты.",
  alternates: { canonical: "/" },
  // Social link-preview card. og:title / og:description / twitter:title fall back to
  // each page's own resolved title (via title.template) + description, so /oferta,
  // /privacy, /login … all get correct per-page previews without repeating metadata.
  // `og:url` is intentionally omitted so child pages don't inherit the homepage URL —
  // the canonical link already carries per-page identity. og:image is relative
  // (/og-image.png) and resolves absolute against metadataBase (= SITE_URL).
  openGraph: {
    type: "website",
    siteName: "Tuna VPN",
    locale: "ru_RU",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tuna VPN — открытый интернет за минуту",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
  // All icons live in public/ and are linked here. favicon.ico is kept in public/
  // (NOT src/app/) on purpose: the App Router favicon.ico convention runs the file
  // through Turbopack's image pipeline, which fails to decode a non-RGBA ICO
  // ("The PNG is not in RGBA format"). public/ serves it untouched.
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
    ],
    apple: [{ url: "/favicon-180x180.png", sizes: "180x180" }],
  },
};

// Brand color for mobile browser chrome on first paint (SEO-13). Next 16 takes
// theme-color from the `viewport` export, not `metadata`. Matches site.webmanifest.
export const viewport: Viewport = {
  themeColor: "#05101f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        {/* Sitewide entity graph (Organization + WebSite) for search + AI engines. */}
        <JsonLd data={siteGraph()} />
        <RefCapture />
        {children}
      </body>
    </html>
  );
}
