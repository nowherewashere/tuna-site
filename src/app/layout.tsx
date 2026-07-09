import type { Metadata } from "next";
import { Unbounded, Golos_Text, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

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
    "Рассекаем волны блокировок. Свободный доступ к мировому океану интернета. Бесплатный пробный период, без карты.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
