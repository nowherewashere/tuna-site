import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

// Headlines: Manrope — clean, modern, full Cyrillic support.
const display = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Body / UI: Inter.
const body = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

// Technical values / config links: JetBrains Mono.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tuna VPN — открытый интернет за минуту",
  description:
    "Рассекаем волны блокировок. VPN работает, пока другие отваливаются. Пробный период 24 часа, без карты, до 3 устройств.",
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
