import type { Metadata } from "next";
import { Unbounded, Golos_Text, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import RefCapture from "@/components/RefCapture";

// Display / headlines: Unbounded — a wide, geometric, Cyrillic-first face. Used
// big and tight; it carries the whole personality of the brand, so nothing else
// competes with it.
const display = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
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
  title: "Tuna VPN — открытый интернет за минуту",
  description:
    "Свободный доступ к мировому океану интернета. Бесплатный пробный период, без карты.",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <RefCapture />
        {children}
      </body>
    </html>
  );
}
