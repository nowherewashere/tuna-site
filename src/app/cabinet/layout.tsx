import type { Metadata } from "next";

// Server wrapper around the "use client" cabinet page: unique title + noindex for the
// authenticated app shell (SEO-05). Nothing here should ever be indexed.
export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false, follow: true },
  // Self-canonical (override the root's canonical → "/") on this noindex shell.
  alternates: { canonical: "/cabinet" },
};

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
